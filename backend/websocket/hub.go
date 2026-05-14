package websocket

import (
	"case1/database"
	"case1/models"
	"encoding/json"
	"log"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("🔌 Client connected. UserID: %d. Total: %d", client.UserID, len(h.clients))
			if client.UserID > 0 {
				database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("is_online", true)
				h.BroadcastTyped(MessageTypeUserStatus, UserStatusPayload{UserID: client.UserID, IsOnline: true})
			}

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("🔌 Client disconnected. UserID: %d. Total: %d", client.UserID, len(h.clients))
				if client.UserID > 0 {
					database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("is_online", false)
					h.BroadcastTyped(MessageTypeUserStatus, UserStatusPayload{UserID: client.UserID, IsOnline: false})
				}
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) Broadcast(message []byte) {
	h.broadcast <- message
}

func (h *Hub) BroadcastTyped(msgType MessageType, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal WS payload: %v", err)
		return
	}
	msg := WSMessage{
		Type:    msgType,
		Payload: data,
	}
	bytes, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.Broadcast(bytes)
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}
