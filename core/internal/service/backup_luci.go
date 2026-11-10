package service

import (
	"bytes"
	"net/http"
	"sync"
	"time"
)

// Keep messages small enough for LuCI's ubus RPC transport. One expiring
// transfer bounds memory and gives each browser a consistent ZIP snapshot.
const luciBackupChunkSize = 12 << 10

type luciBackupTransfer struct {
	mu     sync.Mutex
	id     string
	export bool
	data   []byte
	timer  *time.Timer
}

func (s *dashboardServer) handleLuCIBackup(w http.ResponseWriter, r *http.Request) {
	if !s.d.hasLocalToken(r) {
		writeError(w, http.StatusForbidden, "local client required")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 2*luciBackupChunkSize)
	var req struct {
		Action string `json:"action"`
		ID     string `json:"id"`
		Offset int    `json:"offset"`
		Data   []byte `json:"data"`
	}
	if !readJSON(w, r, &req) {
		return
	}
	transfer := &s.luciBackup
	transfer.mu.Lock()
	defer transfer.mu.Unlock()

	if req.Action == "export" || req.Action == "upload" {
		if transfer.id != "" {
			writeError(w, http.StatusConflict, "a backup transfer is already running")
			return
		}
		id, err := newLocalToken()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not start backup transfer")
			return
		}
		transfer.export = req.Action == "export"
		if transfer.export {
			var buf bytes.Buffer
			if err := s.d.writeBackup(&buf); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			transfer.data = buf.Bytes()
		}
		transfer.id = id
		transfer.timer = time.AfterFunc(5*time.Minute, func() {
			transfer.mu.Lock()
			defer transfer.mu.Unlock()
			if transfer.id == id {
				transfer.id, transfer.data = "", nil
			}
		})
		writeJSON(w, http.StatusOK, map[string]any{"id": id, "size": len(transfer.data)})
		return
	}
	if req.ID == "" || req.ID != transfer.id {
		writeError(w, http.StatusBadRequest, "backup transfer expired")
		return
	}
	switch req.Action {
	case "read":
		if transfer.export && req.Offset >= 0 && req.Offset < len(transfer.data) {
			end := min(req.Offset+luciBackupChunkSize, len(transfer.data))
			writeJSON(w, http.StatusOK, map[string][]byte{"data": transfer.data[req.Offset:end]})
			return
		}
	case "append":
		if !transfer.export && req.Offset == len(transfer.data) &&
			len(req.Data) > 0 && len(req.Data) <= luciBackupChunkSize &&
			len(transfer.data)+len(req.Data) <= maxBackupSize {
			transfer.data = append(transfer.data, req.Data...)
			writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
			return
		}
	case "inspect":
		if !transfer.export {
			contents, err := s.d.inspectBackup(transfer.data)
			if err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, contents)
			return
		}
	case "import":
		if !transfer.export {
			data := transfer.data
			transfer.timer.Stop()
			transfer.id, transfer.data = "", nil
			added, updated, err := s.d.importBackup(data)
			if err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]int{"added": added, "updated": updated})
			return
		}
	case "close":
		transfer.timer.Stop()
		transfer.id, transfer.data = "", nil
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	writeError(w, http.StatusBadRequest, "invalid backup transfer request")
}
