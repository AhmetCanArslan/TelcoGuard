package handlers

import (
	"case1/websocket"

	fiberws "github.com/gofiber/websocket/v2"
)

var Hub *websocket.Hub

func init() {
	Hub = websocket.NewHub()
	go Hub.Run()
}

func WebSocketHandler(c *fiberws.Conn) {
	client := websocket.NewClient(Hub, c)
	Hub.Register(client)

	go client.WriteMessage()
	client.ReadMessage()
}
