package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHaversine(t *testing.T) {
	// Istanbul (Levent) to Istanbul (Taksim) ~ 5km
	dist := haversine(41.0732, 29.0199, 41.0373, 29.0252)
	assert.InDelta(t, 4.0, dist, 1.0)

	// Istanbul to Ankara ~ 350km
	dist = haversine(41.0082, 28.9784, 39.9334, 32.8597)
	assert.InDelta(t, 350.0, dist, 10.0)

	// Same point = 0
	dist = haversine(41.0, 29.0, 41.0, 29.0)
	assert.InDelta(t, 0.0, dist, 0.001)
}

func TestHaversineSymmetry(t *testing.T) {
	lat1, lng1 := 41.0732, 29.0199
	lat2, lng2 := 39.9334, 32.8597

	d1 := haversine(lat1, lng1, lat2, lng2)
	d2 := haversine(lat2, lng2, lat1, lng1)
	assert.InDelta(t, d1, d2, 0.001)
}
