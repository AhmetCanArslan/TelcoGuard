package websocket

import (
	"encoding/json"
	"log"

	"github.com/gofiber/websocket/v2"
)

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	UserID uint
}

func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
}

func (c *Client) ReadMessage() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	for {
		messageType, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket error: %v", err)
			}
			return
		}

		if messageType == websocket.TextMessage {
			var msg WSMessage
			if err := json.Unmarshal(data, &msg); err == nil {
				if msg.Type == MessageTypeSubscribe || msg.Type == MessageTypeUnsubscribe {
					log.Printf("Client %s topic: %s", msg.Type, msg.Topic)
				}
			}
		}
	}
}

func (c *Client) WriteMessage() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		}
	}
}
