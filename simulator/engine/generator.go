package engine

import (
	"case1/simulator/client"
	"case1/simulator/seed"
	"math"
	"math/rand"
)

type Generator struct {
	station seed.SimStation
}

func NewGenerator(station seed.SimStation) *Generator {
	return &Generator{station: station}
}

func (g *Generator) Generate() client.MetricPayload {
	cpu := g.randomFloat(g.station.CpuBase, g.station.CpuNoise)
	memory := g.randomFloat(g.station.MemoryBase, g.station.MemoryNoise)
	packetLoss := g.randomFloat(g.station.PacketBase, g.station.PacketNoise)
	latency := g.randomFloat(g.station.LatencyBase, g.station.LatencyNoise)
	rssi := g.randomFloat(g.station.RssiBase, g.station.RssiNoise)
	users := g.randomInt(g.station.UsersBase, g.station.UsersNoise)

	// Clamp values
	cpu = clamp(cpu, 0, 100)
	memory = clamp(memory, 0, 100)
	packetLoss = clamp(packetLoss, 0, 100)
	latency = math.Max(latency, 0)
	rssi = clamp(rssi, -100, -20)
	users = clampInt(users, 0, g.station.Capacity)

	return client.MetricPayload{
		CpuUsage:       cpu,
		MemoryUsage:    memory,
		PacketLoss:     packetLoss,
		Latency:        latency,
		Rssi:           rssi,
		ConnectedUsers: users,
	}
}

func (g *Generator) randomFloat(base, noise float64) float64 {
	return base + (rand.Float64()*2-1)*noise
}

func (g *Generator) randomInt(base, noise int) int {
	return base + rand.Intn(noise*2+1) - noise
}

func clamp(v, min, max float64) float64 {
	return math.Max(min, math.Min(max, v))
}

func clampInt(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
