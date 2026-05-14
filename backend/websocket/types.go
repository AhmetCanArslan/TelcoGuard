package websocket

import "encoding/json"

type MessageType string

const (
	MessageTypeMetricUpdate     MessageType = "metric_update"
	MessageTypeStationStatus    MessageType = "station_status"
	MessageTypeNewAlarm         MessageType = "new_alarm"
	MessageTypeAlarmUpdate      MessageType = "alarm_update"
	MessageTypeDashboardSnapshot MessageType = "dashboard_snapshot"
	MessageTypeSubscribe        MessageType = "subscribe"
	MessageTypeUnsubscribe      MessageType = "unsubscribe"
)

type WSMessage struct {
	Type    MessageType     `json:"type"`
	Topic   string          `json:"topic,omitempty"`
	Payload json.RawMessage `json:"payload"`
}

type MetricUpdatePayload struct {
	StationID      string  `json:"station_id"`
	Timestamp      string  `json:"timestamp"`
	CpuUsage       float64 `json:"cpu_usage"`
	MemoryUsage    float64 `json:"memory_usage"`
	PacketLoss     float64 `json:"packet_loss"`
	Latency        float64 `json:"latency"`
	Rssi           float64 `json:"rssi"`
	ConnectedUsers int     `json:"connected_users"`
}

type StationStatusPayload struct {
	StationID string `json:"station_id"`
	OldStatus string `json:"old_status"`
	NewStatus string `json:"new_status"`
}

type AlarmPayload struct {
	Alarm interface{} `json:"alarm"`
}

type DashboardSnapshotPayload struct {
	Summary interface{} `json:"summary"`
}
