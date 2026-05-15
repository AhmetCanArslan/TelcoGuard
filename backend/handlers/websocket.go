package handlers

import (
	"case1/auth"
	"case1/websocket"
	"log"

	fiberws "github.com/gofiber/websocket/v2"
)

var Hub *websocket.Hub

func init() {
	Hub = websocket.NewHub()
	go Hub.Run()
}

func WebSocketHandler(c *fiberws.Conn) {
	// Extract token from query params: /ws?token=...
	tokenString := c.Query("token")
	var userID uint

	if tokenString == "" {
		log.Printf("🔑 WS: No token provided")
	} else {
		log.Printf("🔑 WS: Token received (len=%d, prefix=%s...)", len(tokenString), tokenString[:min(20, len(tokenString))])
		if claims, err := auth.ValidateAccessToken(tokenString); err == nil {
			userID = claims.UserID
			log.Printf("🔑 WS: Token valid, UserID=%d", userID)
		} else {
			log.Printf("🔑 WS: Token invalid: %v", err)
		}
	}

	client := websocket.NewClient(Hub, c)
	client.UserID = userID
	Hub.Register(client)

	go client.WriteMessage()
	client.ReadMessage()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
