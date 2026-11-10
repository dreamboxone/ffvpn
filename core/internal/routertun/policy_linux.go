//go:build linux && with_gvisor

package routertun

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strings"

	"github.com/sagernet/netlink"
	"golang.org/x/sys/unix"
)

const (
	routeTable    = 5810
	ruleStart     = 5810
	routeProtocol = 242
)

var families = []int{netlink.FAMILY_V4, netlink.FAMILY_V6}

func lanRules(lan string, family int) []*netlink.Rule {
	local, tunnel := netlink.NewRule(), netlink.NewRule()
	local.Family, local.IifName = family, lan
	local.Priority, local.Table, local.SuppressPrefixlen = ruleStart, unix.RT_TABLE_MAIN, 0
	tunnel.Family, tunnel.IifName = family, lan
	tunnel.Priority, tunnel.Table = ruleStart+1, routeTable
	return []*netlink.Rule{local, tunnel}
}

func routes(family int) ([]netlink.Route, error) {
	return netlink.RouteListFiltered(family, &netlink.Route{Table: routeTable}, netlink.RT_FILTER_TABLE)
}

func checkPolicySlot() error {
	for _, family := range families {
		existing, err := routes(family)
		if err != nil {
			return err
		}
		if len(existing) != 0 {
			return fmt.Errorf("routing table %d is already in use", routeTable)
		}
		rules, err := netlink.RuleList(family)
		if err != nil {
			return err
		}
		for _, rule := range rules {
			if rule.Table == routeTable || rule.Priority == ruleStart || rule.Priority == ruleStart+1 {
				return fmt.Errorf("TUN policy conflicts with an existing routing rule at priority %d", rule.Priority)
			}
		}
	}
	return nil
}

func installPolicy(lan string, index int) error {
	for _, family := range families {
		base := netlink.Route{
			Family: family, Table: routeTable, Protocol: routeProtocol,
			Dst: defaultDestination(family),
		}
		// If the process dies, the device route disappears. This route
		// keeps the policy from falling through to WAN before recovery.
		closed := base
		closed.Type, closed.Priority = unix.RTN_UNREACHABLE, 32767
		if err := netlink.RouteAdd(&closed); err != nil {
			return fmt.Errorf("adding the TUN fallback route: %w", err)
		}
		base.LinkIndex, base.Scope = index, netlink.SCOPE_LINK
		if err := netlink.RouteAdd(&base); err != nil {
			return fmt.Errorf("adding the TUN route: %w", err)
		}
		for _, rule := range lanRules(lan, family) {
			if err := netlink.RuleAdd(rule); err != nil {
				return fmt.Errorf("adding the LAN policy rule: %w", err)
			}
		}
	}
	return nil
}

func defaultDestination(family int) *net.IPNet {
	zero := net.IPv6zero
	if family == netlink.FAMILY_V4 {
		zero = net.IPv4zero.To4()
	}
	return &net.IPNet{IP: zero, Mask: net.CIDRMask(0, len(zero)*8)}
}

func clearPreviousPolicy() error {
	if err := removeIfPresent(readyFile); err != nil {
		return err
	}
	data, err := os.ReadFile(stateFile)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	lan := strings.TrimSpace(string(data))
	if !validLANName(lan) {
		return errors.New("invalid LAN TUN policy state")
	}
	for _, family := range families {
		rules, err := netlink.RuleList(family)
		if err != nil {
			return err
		}
		for _, owned := range lanRules(lan, family) {
			for _, rule := range rules {
				if rule.Priority == owned.Priority && rule.IifName == lan &&
					rule.Table == owned.Table && rule.SuppressPrefixlen == owned.SuppressPrefixlen {
					if err := netlink.RuleDel(owned); err != nil {
						return err
					}
				}
			}
		}
		existing, err := routes(family)
		if err != nil {
			return err
		}
		for _, route := range existing {
			if route.Protocol == routeProtocol {
				if route.Dst == nil {
					route.Dst = defaultDestination(family)
				}
				if err := netlink.RouteDel(&route); err != nil {
					return err
				}
			}
		}
	}
	return removeIfPresent(stateFile)
}

func removeIfPresent(path string) error {
	err := os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}
