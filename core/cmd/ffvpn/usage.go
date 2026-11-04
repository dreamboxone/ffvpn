package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/armanlife/firefox-vpn-client/core/internal/service"
)

type usageDay struct {
	Up   int64 `json:"up"`
	Down int64 `json:"down"`
}
type usageHistory struct {
	Today string              `json:"today"`
	Days  map[string]usageDay `json:"days"`
}

func addUsage(history *usageHistory, day string, up, down int64) {
	if history.Days == nil {
		history.Days = make(map[string]usageDay)
	}
	row := history.Days[day]
	if up > 0 {
		row.Up += up
	}
	if down > 0 {
		row.Down += down
	}
	history.Days[day] = row
	history.Today = day
	cutoff, _ := time.Parse("2006-01-02", day)
	oldest := cutoff.AddDate(0, 0, -35).Format("2006-01-02")
	for key := range history.Days {
		if key < oldest {
			delete(history.Days, key)
		}
	}
}

func saveUsage(path string, history usageHistory) {
	data, err := json.Marshal(history)
	if err != nil {
		return
	}
	if os.WriteFile(path+".new", data, 0600) == nil {
		_ = os.Rename(path+".new", path)
	}
}

func recordUsage(d *service.Daemon, dir string, stop <-chan struct{}, finished chan<- struct{}) {
	defer close(finished)
	path := filepath.Join(dir, "..", "usage.json")
	history := usageHistory{Days: make(map[string]usageDay)}
	if data, err := os.ReadFile(path); err == nil {
		_ = json.Unmarshal(data, &history)
	}
	var previousUp, previousDown int64
	previousStart := ""
	lastSave := time.Now()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	sample := func() {
		state, err := d.StatusView()
		if err != nil {
			return
		}
		day := time.Now().UTC().Format("2006-01-02")
		if output, err := exec.Command("date", "+%Y-%m-%d").Output(); err == nil {
			day = strings.TrimSpace(string(output))
		}
		var up, down int64
		if state.Traffic != nil && state.Proxy != nil {
			started := state.Proxy.StartedAt.Format(time.RFC3339Nano)
			if started != previousStart {
				previousUp, previousDown = 0, 0
				previousStart = started
			}
			up, down = state.Traffic.Up-previousUp, state.Traffic.Down-previousDown
			previousUp, previousDown = state.Traffic.Up, state.Traffic.Down
		} else {
			previousStart = ""
			previousUp, previousDown = 0, 0
		}
		addUsage(&history, day, up, down)
		saveUsage("/tmp/ffvpn-usage.json", history)
	}
	for {
		select {
		case <-ticker.C:
			sample()
			if time.Since(lastSave) >= 5*time.Minute {
				saveUsage(path, history)
				lastSave = time.Now()
			}
		case <-stop:
			sample()
			saveUsage(path, history)
			return
		}
	}
}
