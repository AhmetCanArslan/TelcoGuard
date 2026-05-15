package websocket

import (
	"case1/database"
	"case1/models"
	"encoding/json"
	"log"
)

type directMsg struct {
	targetUserID uint
	data         []byte
}

type Hub struct {
	clients         map[*Client]bool
	broadcast       chan []byte
	direct          chan directMsg
	register        chan *Client
	unregister      chan *Client
	userConnections map[uint]int
}

func NewHub() *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		broadcast:       make(chan []byte, 256),
		direct:          make(chan directMsg, 256),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		userConnections: make(map[uint]int),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("🔌 Client connected. UserID: %d. Total: %d", client.UserID, len(h.clients))
			if client.UserID > 0 {
				h.userConnections[client.UserID]++
				if h.userConnections[client.UserID] == 1 {
					database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("is_online", true)
					h.BroadcastTyped(MessageTypeUserStatus, UserStatusPayload{UserID: client.UserID, IsOnline: true})
				}
			}

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("🔌 Client disconnected. UserID: %d. Total: %d", client.UserID, len(h.clients))
				if client.UserID > 0 {
					h.userConnections[client.UserID]--
					if h.userConnections[client.UserID] <= 0 {
						delete(h.userConnections, client.UserID)
						database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("is_online", false)
						h.BroadcastTyped(MessageTypeUserStatus, UserStatusPayload{UserID: client.UserID, IsOnline: false})
					}
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

		case dm := <-h.direct:
			sent := false
			for client := range h.clients {
				if client.UserID == dm.targetUserID {
					select {
					case client.send <- dm.data:
						sent = true
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			if !sent {
				log.Printf("⚠️ SendToUser: user %d not found or offline", dm.targetUserID)
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

// SendToUser sends a message to a specific user through the hub's event loop (thread-safe).
func (h *Hub) SendToUser(userID uint, msgType MessageType, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("SendToUser marshal payload error: %v", err)
		return
	}

	msg := WSMessage{
		Type:    msgType,
		Payload: data,
	}

	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("SendToUser marshal msg error: %v", err)
		return
	}

	log.Printf("📩 SendToUser: routing %s to user %d (%d bytes)", msgType, userID, len(bytes))
	h.direct <- directMsg{targetUserID: userID, data: bytes}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}
