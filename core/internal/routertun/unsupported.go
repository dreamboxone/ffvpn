//go:build !linux || !with_gvisor

package routertun

import (
	"context"
	"errors"
)

const Supported = false

func Run(context.Context, string, int, bool) error {
	return errors.New("this core was built without Linux LAN TUN support")
}
