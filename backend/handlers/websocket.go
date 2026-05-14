package handlers

import (
	"case1/auth"
	"case1/websocket"

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

	if tokenString != "" {
		if claims, err := auth.ValidateAccessToken(tokenString); err == nil {
			userID = claims.UserID
		}
	}

	client := websocket.NewClient(Hub, c)
	client.UserID = userID
	Hub.Register(client)

	go client.WriteMessage()
	client.ReadMessage()
}
