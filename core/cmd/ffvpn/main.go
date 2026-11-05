package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/armanlife/firefox-vpn-client/core/internal/config"
	"github.com/armanlife/firefox-vpn-client/core/internal/service"
	"github.com/armanlife/firefox-vpn-client/core/internal/version"
)

func main() {
	dir := flag.String("data-dir", "/etc/ffvpn/core", "Private data directory")
	show := flag.Bool("version", false, "Print version")
	off := flag.Bool("off", false, "Start with the proxy disabled")
	flag.Parse()
	if *show {
		fmt.Println(version.Current)
		return
	}
	if err := run(*dir, *off); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(dir string, off bool) error {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	if err := os.Chmod(dir, 0700); err != nil {
		return err
	}
	paths, err := service.ResolveDataPaths(dir)
	if err != nil {
		return err
	}
	cfgPath := filepath.Join(dir, "config.json")
	cfg, _, err := config.Load(cfgPath)
	if err != nil {
		return err
	}
	// LuCI is the public interface. The core API and proxy stay on loopback.
	cfg.Dashboard.Enabled = true
	cfg.Dashboard.Listen = "127.0.0.1:10820"
	cfg.Proxy.Listen = "127.0.0.1:10810"
	cfg.Proxy.Username, cfg.Proxy.Password = "", ""
	cfg.SystemProxy.Mode = config.SystemProxyClear
	cfg.Routing.Enabled = false
	if err := config.Save(cfgPath, cfg); err != nil {
		return err
	}
	daemon, err := service.NewDaemon(paths, false)
	if err != nil {
		return err
	}
	daemon.RequireLocalToken()
	daemon.SetOn(!off)
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signals)
	go func() { <-signals; daemon.Shutdown() }()
	stopUsage, usageDone := make(chan struct{}), make(chan struct{})
	go recordUsage(daemon, dir, stopUsage, usageDone)
	err = daemon.Run()
	close(stopUsage)
	<-usageDone
	return err
}
