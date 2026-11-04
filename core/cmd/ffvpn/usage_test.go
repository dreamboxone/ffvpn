package main

import "testing"

func TestUsageKeepsRecentDaysAndRejectsCounterResets(t *testing.T) {
	h := usageHistory{Days: map[string]usageDay{"2026-01-01": {Up: 100}}}
	addUsage(&h, "2026-11-04", 200, 300)
	addUsage(&h, "2026-11-04", -100, -200)
	if h.Days["2026-11-04"].Up != 200 || h.Days["2026-11-04"].Down != 300 {
		t.Fatal("counter reset reduced recorded traffic")
	}
	if _, ok := h.Days["2026-01-01"]; ok {
		t.Fatal("expired history retained")
	}
	if h.Today != "2026-11-04" {
		t.Fatal("current router date not retained")
	}
}
