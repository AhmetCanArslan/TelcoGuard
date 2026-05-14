package seed

import "github.com/google/uuid"

type SimStation struct {
	ID       uuid.UUID `json:"id"`
	Code     string    `json:"code"`
	Name     string    `json:"name"`
	Lat      float64   `json:"lat"`
	Lng      float64   `json:"lng"`
	Region   string    `json:"region"`
	Type     string    `json:"type"`
	Capacity int       `json:"capacity"`

	// Baseline values for normal generation
	CpuBase       float64 `json:"cpu_base"`
	CpuNoise      float64 `json:"cpu_noise"`
	MemoryBase    float64 `json:"memory_base"`
	MemoryNoise   float64 `json:"memory_noise"`
	PacketBase    float64 `json:"packet_base"`
	PacketNoise   float64 `json:"packet_noise"`
	LatencyBase   float64 `json:"latency_base"`
	LatencyNoise  float64 `json:"latency_noise"`
	RssiBase      float64 `json:"rssi_base"`
	RssiNoise     float64 `json:"rssi_noise"`
	UsersBase     int     `json:"users_base"`
	UsersNoise    int     `json:"users_noise"`
}

var Stations = []SimStation{
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111111"), Code: "BSC-001", Name: "Levent-K1", Lat: 41.0732, Lng: 29.0199, Region: "Marmara", Type: "NR_5G", Capacity: 1000, CpuBase: 35, CpuNoise: 15, MemoryBase: 50, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 15, LatencyNoise: 10, RssiBase: -50, RssiNoise: 20, UsersBase: 300, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111112"), Code: "BSC-002", Name: "Kadıköy-M3", Lat: 40.9887, Lng: 29.0277, Region: "Marmara", Type: "LTE", Capacity: 800, CpuBase: 30, CpuNoise: 15, MemoryBase: 45, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 20, LatencyNoise: 10, RssiBase: -55, RssiNoise: 20, UsersBase: 250, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111113"), Code: "BSC-003", Name: "Taksim-A2", Lat: 41.0373, Lng: 29.0252, Region: "Marmara", Type: "NR_5G", Capacity: 1200, CpuBase: 40, CpuNoise: 15, MemoryBase: 55, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 12, LatencyNoise: 8, RssiBase: -48, RssiNoise: 20, UsersBase: 400, UsersNoise: 250},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111114"), Code: "BSC-004", Name: "Beşiktaş-B1", Lat: 41.0516, Lng: 29.0112, Region: "Marmara", Type: "LTE", Capacity: 950, CpuBase: 32, CpuNoise: 15, MemoryBase: 48, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 18, LatencyNoise: 10, RssiBase: -52, RssiNoise: 20, UsersBase: 280, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111115"), Code: "BSC-005", Name: "Fatih-F2", Lat: 41.0096, Lng: 28.9624, Region: "Marmara", Type: "NR_5G", Capacity: 1100, CpuBase: 38, CpuNoise: 15, MemoryBase: 52, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 14, LatencyNoise: 8, RssiBase: -50, RssiNoise: 20, UsersBase: 350, UsersNoise: 220},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111116"), Code: "BSC-006", Name: "Eminönü-E1", Lat: 41.0094, Lng: 28.9784, Region: "Marmara", Type: "LTE", Capacity: 850, CpuBase: 28, CpuNoise: 15, MemoryBase: 42, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 22, LatencyNoise: 12, RssiBase: -58, RssiNoise: 20, UsersBase: 220, UsersNoise: 180},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111117"), Code: "BSC-007", Name: "Beyoğlu-BY1", Lat: 41.0257, Lng: 28.9828, Region: "Marmara", Type: "NR_5G", Capacity: 1050, CpuBase: 36, CpuNoise: 15, MemoryBase: 51, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 16, LatencyNoise: 10, RssiBase: -49, RssiNoise: 20, UsersBase: 320, UsersNoise: 210},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111118"), Code: "BSC-008", Name: "Şişli-S3", Lat: 41.0489, Lng: 29.0133, Region: "Marmara", Type: "LTE", Capacity: 920, CpuBase: 34, CpuNoise: 15, MemoryBase: 49, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 17, LatencyNoise: 10, RssiBase: -51, RssiNoise: 20, UsersBase: 290, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111119"), Code: "BSC-009", Name: "Bahçelievler-BA2", Lat: 41.0072, Lng: 28.8821, Region: "Marmara", Type: "NR_5G", Capacity: 880, CpuBase: 33, CpuNoise: 15, MemoryBase: 47, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 19, LatencyNoise: 10, RssiBase: -53, RssiNoise: 20, UsersBase: 260, UsersNoise: 190},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111a"), Code: "BSC-010", Name: "Bakırköy-BAK1", Lat: 40.9756, Lng: 28.8899, Region: "Marmara", Type: "LTE", Capacity: 780, CpuBase: 29, CpuNoise: 15, MemoryBase: 43, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 21, LatencyNoise: 11, RssiBase: -56, RssiNoise: 20, UsersBase: 230, UsersNoise: 180},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111b"), Code: "BSC-011", Name: "Maltepe-MAL1", Lat: 40.9619, Lng: 29.1342, Region: "Marmara", Type: "NR_5G", Capacity: 920, CpuBase: 37, CpuNoise: 15, MemoryBase: 50, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 15, LatencyNoise: 9, RssiBase: -50, RssiNoise: 20, UsersBase: 310, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111c"), Code: "BSC-012", Name: "Pendik-PEN1", Lat: 40.8897, Lng: 29.2410, Region: "Marmara", Type: "LTE", Capacity: 850, CpuBase: 31, CpuNoise: 15, MemoryBase: 46, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 20, LatencyNoise: 11, RssiBase: -54, RssiNoise: 20, UsersBase: 240, UsersNoise: 190},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111d"), Code: "BSC-013", Name: "Bağcılar-BAG1", Lat: 41.2268, Lng: 29.2046, Region: "Marmara", Type: "NR_5G", Capacity: 1150, CpuBase: 39, CpuNoise: 15, MemoryBase: 53, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 13, LatencyNoise: 8, RssiBase: -47, RssiNoise: 20, UsersBase: 380, UsersNoise: 230},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111e"), Code: "BSC-014", Name: "Eyüpsultan-EYU1", Lat: 41.0667, Lng: 28.9133, Region: "Marmara", Type: "LTE", Capacity: 750, CpuBase: 27, CpuNoise: 15, MemoryBase: 41, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 23, LatencyNoise: 12, RssiBase: -59, RssiNoise: 20, UsersBase: 210, UsersNoise: 170},
	{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111f"), Code: "BSC-015", Name: "Avcılar-AVC1", Lat: 41.0085, Lng: 28.7454, Region: "Marmara", Type: "NR_5G", Capacity: 1000, CpuBase: 35, CpuNoise: 15, MemoryBase: 50, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 16, LatencyNoise: 10, RssiBase: -50, RssiNoise: 20, UsersBase: 300, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111120"), Code: "BSC-016", Name: "İzmir-Alsancak-IZ1", Lat: 38.4215, Lng: 27.1467, Region: "Ege", Type: "NR_5G", Capacity: 1100, CpuBase: 36, CpuNoise: 15, MemoryBase: 51, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 14, LatencyNoise: 9, RssiBase: -49, RssiNoise: 20, UsersBase: 330, UsersNoise: 210},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111121"), Code: "BSC-017", Name: "İzmir-Konak-IZ2", Lat: 38.4192, Lng: 27.1441, Region: "Ege", Type: "LTE", Capacity: 900, CpuBase: 32, CpuNoise: 15, MemoryBase: 47, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 18, LatencyNoise: 10, RssiBase: -52, RssiNoise: 20, UsersBase: 270, UsersNoise: 200},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111122"), Code: "BSC-018", Name: "Aydın-AYD1", Lat: 37.8442, Lng: 27.8454, Region: "Ege", Type: "LTE", Capacity: 650, CpuBase: 25, CpuNoise: 15, MemoryBase: 40, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 24, LatencyNoise: 12, RssiBase: -60, RssiNoise: 20, UsersBase: 200, UsersNoise: 160},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111123"), Code: "BSC-019", Name: "Ankara-Çankaya-ANK1", Lat: 39.8817, Lng: 32.7940, Region: "İç Anadolu", Type: "NR_5G", Capacity: 1050, CpuBase: 37, CpuNoise: 15, MemoryBase: 52, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 15, LatencyNoise: 9, RssiBase: -50, RssiNoise: 20, UsersBase: 340, UsersNoise: 210},
	{ID: uuid.MustParse("11111111-1111-1111-1111-111111111124"), Code: "BSC-020", Name: "Ankara-Keçiören-ANK2", Lat: 39.9500, Lng: 32.8500, Region: "İç Anadolu", Type: "LTE", Capacity: 800, CpuBase: 30, CpuNoise: 15, MemoryBase: 45, MemoryNoise: 20, PacketBase: 1, PacketNoise: 1, LatencyBase: 19, LatencyNoise: 10, RssiBase: -54, RssiNoise: 20, UsersBase: 260, UsersNoise: 190},
}
