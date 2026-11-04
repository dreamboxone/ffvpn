package main

import (
	"crypto/sha256"
	"encoding/hex"
	"math/rand"
	"os"
	"path/filepath"
	"testing"
)

func TestDifferentialIndexReusesShiftedData(t *testing.T) {
	dir := t.TempDir()
	data := make([]byte, 4<<20)
	_, _ = rand.New(rand.NewSource(42)).Read(data)
	oldFile := filepath.Join(dir, "old")
	newFile := filepath.Join(dir, "new")
	if err := os.WriteFile(oldFile, data, 0600); err != nil {
		t.Fatal(err)
	}
	shifted := append([]byte("new code inserted ahead of existing data"), data...)
	if err := os.WriteFile(newFile, shifted, 0600); err != nil {
		t.Fatal(err)
	}
	oldDir, newDir := filepath.Join(dir, "old-index"), filepath.Join(dir, "new-index")
	if err := indexFile(oldFile, oldDir); err != nil {
		t.Fatal(err)
	}
	if err := indexFile(newFile, newDir); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(newDir)
	if err != nil {
		t.Fatal(err)
	}
	reused := 0
	for _, entry := range entries {
		block, err := os.ReadFile(filepath.Join(newDir, entry.Name()))
		if err != nil {
			t.Fatal(err)
		}
		digest := sha256.Sum256(block)
		if hex.EncodeToString(digest[:]) != entry.Name() {
			t.Fatal("block digest mismatch")
		}
		if len(block) > 1048576 {
			t.Fatal("block exceeds transfer limit")
		}
		if _, err := os.Stat(filepath.Join(oldDir, entry.Name())); err == nil {
			reused += len(block)
		}
	}
	if reused < len(data)*9/10 {
		t.Fatalf("only %d of %d bytes reusable after insertion", reused, len(data))
	}
}
