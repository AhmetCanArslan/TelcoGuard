package engine

import (
	"encoding/json"
	"sync"
	"time"
)

type SimulatorEvent struct {
	Type      string      `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

type EventBus struct {
	mu        sync.RWMutex
	listeners map[string]chan SimulatorEvent
}

var globalBus = &EventBus{
	listeners: make(map[string]chan SimulatorEvent),
}

func BroadcastEvent(event SimulatorEvent) {
	globalBus.mu.RLock()
	defer globalBus.mu.RUnlock()

	for _, ch := range globalBus.listeners {
		select {
		case ch <- event:
		default:
			// Channel full, skip
		}
	}
}

func SubscribeEvents() (<-chan SimulatorEvent, func()) {
	id := generateID()
	ch := make(chan SimulatorEvent, 100)

	globalBus.mu.Lock()
	globalBus.listeners[id] = ch
	globalBus.mu.Unlock()

	unsub := func() {
		globalBus.mu.Lock()
		delete(globalBus.listeners, id)
		close(ch)
		globalBus.mu.Unlock()
	}

	return ch, unsub
}

func generateID() string {
	// Simple ID generator using timestamp + counter
	return time.Now().Format("20060102150405.000000000")
}

// SSEWriter formats an event for Server-Sent Events
func FormatSSE(event SimulatorEvent) (string, error) {
	data, err := json.Marshal(event)
	if err != nil {
		return "", err
	}
	return "data: " + string(data) + "\n\n", nil
}
