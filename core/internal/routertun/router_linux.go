//go:build linux && with_gvisor

package routertun

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/sagernet/netlink"
	"golang.org/x/sys/unix"

	"github.com/armanlife/firefox-vpn-client/core/internal/config"
	"github.com/armanlife/firefox-vpn-client/core/internal/proxy"
	"github.com/armanlife/firefox-vpn-client/core/internal/tun"
	"github.com/armanlife/firefox-vpn-client/core/internal/tunstack"
)

const (
	Supported     = true
	interfaceName = "ffvpntun"
	proxyAddress  = "127.0.0.1:10810"
	stateFile     = "/var/run/ffvpn-lan-tun.state"
	readyFile     = "/var/run/ffvpn-lan-tun.ready"
	lockFile      = "/var/run/ffvpn-lan-tun.lock"
)

// Run owns the adapter and its routing policy for as long as the helper
// process runs. The listener and Mozilla connection stay in the main core.
func Run(ctx context.Context, lan string, mtu int, cleanup bool) (err error) {
	lock, err := os.OpenFile(lockFile, os.O_CREATE|os.O_RDWR|unix.O_NOFOLLOW, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err := unix.Flock(int(lock.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		return fmt.Errorf("the LAN TUN is already running: %w", err)
	}
	if err := clearPreviousPolicy(); err != nil || cleanup {
		return err
	}
	if mtu < config.MinTunMTU || mtu > config.MaxTunMTU {
		return fmt.Errorf("TUN MTU must be between %d and %d", config.MinTunMTU, config.MaxTunMTU)
	}
	if lan == interfaceName || lan == "lo" || !validLANName(lan) {
		return errors.New("invalid LAN interface for TUN")
	}
	if _, err := net.InterfaceByName(lan); err != nil {
		return err
	}
	if _, err := net.InterfaceByName(interfaceName); err == nil {
		return errors.New("ffvpntun interface already exists")
	}
	if err := checkPolicySlot(); err != nil {
		return err
	}
	dial, err := tun.SOCKS5Dialer(proxyAddress, "", "")
	if err != nil {
		return err
	}
	handler := relay{ctx: ctx, dial: dial, slots: make(chan struct{}, 256)}
	dev, err := tunstack.Open(tunstack.Config{
		Name:         interfaceName,
		Inet4:        netip.MustParsePrefix("198.18.0.1/30"),
		Inet6:        netip.MustParsePrefix("fd58:ff:1081::1/126"),
		ManualRoutes: true,
		MTU:          uint32(mtu),
		Handler: tunstack.Handler{
			TCP:     handler.tcp,
			TakeUDP: func(_, dst netip.AddrPort) bool { return udpAllowed(dst) },
			UDP:     handler.udp,
		},
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, dev.Close()) }()
	if err := dev.Start(); err != nil {
		return err
	}
	// The stack injects remote-source replies through this interface. A
	// strict reverse-path check on this device would expect them on WAN.
	if err := os.WriteFile("/proc/sys/net/ipv4/conf/"+interfaceName+"/rp_filter", []byte("2\n"), 0); err != nil {
		return err
	}
	link, err := netlink.LinkByName(interfaceName)
	if err != nil {
		return err
	}
	if err := os.WriteFile(stateFile, []byte(lan+"\n"), 0600); err != nil {
		return err
	}
	defer func() { err = errors.Join(err, clearPreviousPolicy()) }()
	if err := installPolicy(lan, link.Attrs().Index); err != nil {
		return err
	}
	if err := os.WriteFile(readyFile, []byte(strconv.Itoa(mtu)+"\n"), 0600); err != nil {
		return err
	}
	<-ctx.Done()
	return nil
}

func validLANName(lan string) bool {
	return lan != "" && len(lan) < unix.IFNAMSIZ &&
		!strings.ContainsFunc(lan, func(c rune) bool {
			return !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.ContainsRune("_.:-", c))
		})
}

type relay struct {
	ctx   context.Context
	dial  tun.Dialer
	slots chan struct{}
}

var errBusy = errors.New("LAN TUN connection limit reached")

func (r relay) takeSlot() bool {
	select {
	case r.slots <- struct{}{}:
		return true
	default:
		return false
	}
}

func (r relay) tcp(flow *tunstack.Flow) {
	if !r.takeSlot() {
		flow.Refuse(errBusy)
		return
	}
	defer func() { <-r.slots }()
	ctx, cancel := context.WithTimeout(r.ctx, 30*time.Second)
	upstream, err := r.dial(ctx, flow.Destination.String())
	cancel()
	if err != nil {
		flow.Refuse(err)
		return
	}
	downstream, err := flow.Accept()
	if err != nil {
		_ = upstream.Close()
		return
	}
	stop := context.AfterFunc(r.ctx, func() { _ = upstream.Close(); _ = downstream.Close() })
	defer stop()
	tun.Relay(downstream, upstream)
}

func udpAllowed(dst netip.AddrPort) bool {
	return dst.Port() == 53 || proxy.UDPPortAllowed(strconv.Itoa(int(dst.Port())))
}

func (r relay) udp(flow *tunstack.PacketFlow) {
	if !r.takeSlot() {
		flow.Refuse(errBusy)
		return
	}
	defer func() { <-r.slots }()
	ctx, cancel := context.WithTimeout(r.ctx, 5*time.Second)
	assoc, err := tun.SOCKS5Associate(ctx, proxyAddress, "", "")
	cancel()
	if err != nil {
		flow.Refuse(err)
		return
	}
	defer assoc.Close()
	defer flow.Close()
	stop := context.AfterFunc(r.ctx, func() { assoc.Close(); _ = flow.Close() })
	defer stop()
	flow.Accept()
	go func() {
		defer flow.Close()
		buffer := make([]byte, 65535)
		for {
			n, from, err := assoc.Recv(buffer)
			if err != nil {
				return
			}
			addr, err := netip.ParseAddrPort(from)
			if err == nil && flow.Write(buffer[:n], addr) != nil {
				return
			}
		}
	}()
	buffer := make([]byte, 65535)
	for {
		n, dest, err := flow.Read(buffer)
		if err != nil {
			return
		}
		if udpAllowed(dest) && assoc.Send(dest.String(), buffer[:n]) != nil {
			return
		}
	}
}
