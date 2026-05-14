package client

import (
	"bytes"
	"case1/simulator/config"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type MetricPayload struct {
	CpuUsage       float64 `json:"cpu_usage"`
	MemoryUsage    float64 `json:"memory_usage"`
	PacketLoss     float64 `json:"packet_loss"`
	Latency        float64 `json:"latency"`
	Rssi           float64 `json:"rssi"`
	ConnectedUsers int     `json:"connected_users"`
}

type BackendClient struct {
	httpClient *http.Client
}

func NewBackendClient() *BackendClient {
	return &BackendClient{
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *BackendClient) PostMetric(stationID string, payload MetricPayload) error {
	url := fmt.Sprintf("%s/api/v1/stations/%s/metrics", config.AppConfig.BackendURL, stationID)

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.AppConfig.SimulatorSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("backend returned %d", resp.StatusCode)
	}

	return nil
}
