package services

import (
	"case1/database"
	"case1/models"
	"case1/repositories"
	"math"
	"time"

	"github.com/google/uuid"
)

type SummaryService struct {
	alarmRepo  *repositories.AlarmRepository
	stationRepo *repositories.StationRepository
	userRepo   *repositories.UserRepository
}

func NewSummaryService() *SummaryService {
	return &SummaryService{
		alarmRepo:   repositories.NewAlarmRepository(),
		stationRepo: repositories.NewStationRepository(),
		userRepo:    repositories.NewUserRepository(),
	}
}

type OverviewResponse struct {
	TotalStations    int64                    `json:"total_stations"`
	ActiveStations   int64                    `json:"active_stations"`
	WarningStations  int64                    `json:"warning_stations"`
	CriticalStations int64                    `json:"critical_stations"`
	OfflineStations  int64                    `json:"offline_stations"`
	TotalAlarms      int64                    `json:"total_alarms"`
	OpenAlarms       int64                    `json:"open_alarms"`
	CriticalAlarms   int64                    `json:"critical_alarms"`
	ResolvedToday    int64                    `json:"resolved_today"`
	OnlineEngineers  int64                    `json:"online_engineers"`
	UptimePercent    float64                  `json:"uptime_percent"`
	StationsByRegion map[string]int64         `json:"stations_by_region"`
	AlarmsBySeverity map[string]int64         `json:"alarms_by_severity"`
	AlarmsByStatus   map[string]int64         `json:"alarms_by_status"`
	RegionHealth     []RegionHealthItem       `json:"region_health"`
	UsersByRole      map[string]int64         `json:"users_by_role"`
}

type RegionHealthItem struct {
	Region       string  `json:"region"`
	Total        int64   `json:"total"`
	Active       int64   `json:"active"`
	Warning      int64   `json:"warning"`
	Critical     int64   `json:"critical"`
	Offline      int64   `json:"offline"`
	HealthScore  float64 `json:"health_score"`
}

func (s *SummaryService) GetOverview() (*OverviewResponse, error) {
	res := &OverviewResponse{
		StationsByRegion: make(map[string]int64),
		AlarmsBySeverity: make(map[string]int64),
		AlarmsByStatus:   make(map[string]int64),
		UsersByRole:      make(map[string]int64),
	}

	database.DB.Model(&models.BaseStation{}).Count(&res.TotalStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusActive).Count(&res.ActiveStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusWarning).Count(&res.WarningStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusCritical).Count(&res.CriticalStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusOffline).Count(&res.OfflineStations)

	if res.TotalStations > 0 {
		res.UptimePercent = math.Round(float64(res.ActiveStations+res.WarningStations) / float64(res.TotalStations) * 100)
	}

	database.DB.Model(&models.Alarm{}).Count(&res.TotalAlarms)
	database.DB.Model(&models.Alarm{}).Where("status = ?", models.AlarmStatusOpen).Count(&res.OpenAlarms)
	database.DB.Model(&models.Alarm{}).Where("severity = ? AND status != ?", models.AlarmSeverityCritical, models.AlarmStatusResolved).Count(&res.CriticalAlarms)

	todayStart := time.Now().Truncate(24 * time.Hour)
	database.DB.Model(&models.Alarm{}).Where("status = ? AND resolved_at >= ?", models.AlarmStatusResolved, todayStart).Count(&res.ResolvedToday)

	database.DB.Model(&models.User{}).Where("role = ? AND is_online = ? AND active = ?", models.RoleFieldEngineer, true, true).Count(&res.OnlineEngineers)

	var regionResults []struct {
		Region string
		Count  int64
	}
	database.DB.Model(&models.BaseStation{}).Select("region, count(*) as count").Group("region").Find(&regionResults)
	for _, r := range regionResults {
		res.StationsByRegion[r.Region] = r.Count
	}

	var severityResults []struct {
		Severity string
		Count    int64
	}
	database.DB.Model(&models.Alarm{}).Select("severity, count(*) as count").Group("severity").Find(&severityResults)
	for _, r := range severityResults {
		res.AlarmsBySeverity[r.Severity] = r.Count
	}

	var statusResults []struct {
		Status string
		Count  int64
	}
	database.DB.Model(&models.Alarm{}).Select("status, count(*) as count").Group("status").Find(&statusResults)
	for _, r := range statusResults {
		res.AlarmsByStatus[r.Status] = r.Count
	}

	var roleResults []struct {
		Role  string
		Count int64
	}
	database.DB.Model(&models.User{}).Select("role, count(*) as count").Group("role").Find(&roleResults)
	for _, r := range roleResults {
		res.UsersByRole[r.Role] = r.Count
	}

	var regionHealth []struct {
		Region   string
		Total    int64
		Active   int64
		Warning  int64
		Critical int64
		Offline  int64
	}
	database.DB.Raw(`
		SELECT region, count(*) as total,
			SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'WARNING' THEN 1 ELSE 0 END) as warning,
			SUM(CASE WHEN status = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
			SUM(CASE WHEN status = 'OFFLINE' THEN 1 ELSE 0 END) as offline
		FROM base_stations GROUP BY region
	`).Scan(&regionHealth)

	for _, rh := range regionHealth {
		score := 0.0
		if rh.Total > 0 {
			score = math.Round(float64(rh.Active*100+rh.Warning*50) / float64(rh.Total))
		}
		res.RegionHealth = append(res.RegionHealth, RegionHealthItem{
			Region:      rh.Region,
			Total:       rh.Total,
			Active:      rh.Active,
			Warning:     rh.Warning,
			Critical:    rh.Critical,
			Offline:     rh.Offline,
			HealthScore: score,
		})
	}

	return res, nil
}

type TrendPoint struct {
	Date         string  `json:"date"`
	AlarmCount   int64   `json:"alarm_count"`
	Critical     int64   `json:"critical"`
	Warning      int64   `json:"warning"`
	AvgCPU       float64 `json:"avg_cpu"`
	AvgMemory    float64 `json:"avg_memory"`
	AvgLatency   float64 `json:"avg_latency"`
	AvgPacketLoss float64 `json:"avg_packet_loss"`
}

func (s *SummaryService) GetTrends(days int) ([]TrendPoint, error) {
	from := time.Now().AddDate(0, 0, -days)

	var alarmTrends []struct {
		Date     string
		Count    int64
		Critical int64
		Warning  int64
	}
	database.DB.Raw(`
		SELECT to_char(created_at, 'YYYY-MM-DD') as date,
			count(*) as count,
			SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
			SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning
		FROM alarms
		WHERE created_at >= ?
		GROUP BY to_char(created_at, 'YYYY-MM-DD')
		ORDER BY date
	`, from).Scan(&alarmTrends)

	var metricTrends []struct {
		Date       string
		AvgCPU     float64
		AvgMemory  float64
		AvgLatency float64
		AvgPL      float64
	}
	database.DB.Raw(`
		SELECT to_char(timestamp, 'YYYY-MM-DD') as date,
			AVG(cpu_usage) as avg_cpu,
			AVG(memory_usage) as avg_memory,
			AVG(latency) as avg_latency,
			AVG(packet_loss) as avg_pl
		FROM metrics
		WHERE timestamp >= ?
		GROUP BY to_char(timestamp, 'YYYY-MM-DD')
		ORDER BY date
	`, from).Scan(&metricTrends)

	mt := make(map[string]*TrendPoint)
	for _, a := range alarmTrends {
		mt[a.Date] = &TrendPoint{
			Date:       a.Date,
			AlarmCount: a.Count,
			Critical:   a.Critical,
			Warning:    a.Warning,
		}
	}
	for _, m := range metricTrends {
		if p, ok := mt[m.Date]; ok {
			p.AvgCPU = m.AvgCPU
			p.AvgMemory = m.AvgMemory
			p.AvgLatency = m.AvgLatency
			p.AvgPacketLoss = m.AvgPL
		} else {
			mt[m.Date] = &TrendPoint{
				Date:         m.Date,
				AvgCPU:       m.AvgCPU,
				AvgMemory:    m.AvgMemory,
				AvgLatency:   m.AvgLatency,
				AvgPacketLoss: m.AvgPL,
			}
		}
	}

	result := make([]TrendPoint, 0, len(mt))
	for _, p := range mt {
		result = append(result, *p)
	}
	return result, nil
}

type EngineerAnalytics struct {
	UserID          uint    `json:"user_id"`
	Name            string  `json:"name"`
	Email           string  `json:"email"`
	ResolvedCount   int64   `json:"resolved_count"`
	CriticalCount   int64   `json:"critical_count"`
	AvgResolutionMins float64 `json:"avg_resolution_mins"`
	EstimatedHours  float64 `json:"estimated_hours"`
	Score           float64 `json:"score"`
}

func (s *SummaryService) GetEngineerAnalytics(month, year int) ([]EngineerAnalytics, error) {
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, 0)

	type EngRow struct {
		UserID        uint
		Name          string
		Email         string
		ResolvedCount int64
		CriticalCount int64
		AvgMins       float64
	}
	var rows []EngRow

	database.DB.Raw(`
		SELECT
			u.id as user_id,
			u.name,
			u.email,
			COUNT(*) as resolved_count,
			SUM(CASE WHEN a.severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
			COALESCE(AVG(EXTRACT(EPOCH FROM (a.resolved_at - a.created_at)) / 60), 0) as avg_mins
		FROM alarms a
		JOIN users u ON u.id = a.assigned_to
		WHERE a.status = 'RESOLVED'
			AND a.resolved_at >= ?
			AND a.resolved_at < ?
		GROUP BY u.id, u.name, u.email
		ORDER BY resolved_count DESC
	`, from, to).Scan(&rows)

	result := make([]EngineerAnalytics, 0, len(rows))
	for _, r := range rows {
		hours := math.Round(float64(r.ResolvedCount)*r.AvgMins/60*10) / 10
		score := math.Round((float64(r.ResolvedCount)*10+float64(r.CriticalCount)*20-r.AvgMins/60*5)*10) / 10
		if score < 0 {
			score = 0
		}
		result = append(result, EngineerAnalytics{
			UserID:          r.UserID,
			Name:            r.Name,
			Email:           r.Email,
			ResolvedCount:   r.ResolvedCount,
			CriticalCount:   r.CriticalCount,
			AvgResolutionMins: math.Round(r.AvgMins*10) / 10,
			EstimatedHours:  hours,
			Score:           score,
		})
	}
	return result, nil
}

type FixedIssue struct {
	ID              string  `json:"id"`
	StationID       string  `json:"station_id"`
	StationCode     string  `json:"station_code"`
	StationName     string  `json:"station_name"`
	Region          string  `json:"region"`
	MetricName      string  `json:"metric_name"`
	Severity        string  `json:"severity"`
	Message         string  `json:"message"`
	ResolutionNote  string  `json:"resolution_note"`
	AssignedTo      *uint   `json:"assigned_to"`
	EngineerName    string  `json:"engineer_name"`
	ResolutionMins  float64 `json:"resolution_mins"`
	CreatedAt       string  `json:"created_at"`
	ResolvedAt      string  `json:"resolved_at"`
}

func (s *SummaryService) GetFixedIssues(page, perPage int) ([]FixedIssue, int64, error) {
	alarms, total, err := s.alarmRepo.FindResolvedWithEngineer(page, perPage)
	if err != nil {
		return nil, 0, err
	}

	result := make([]FixedIssue, 0, len(alarms))
	for _, a := range alarms {
		item := FixedIssue{
			ID:             a.ID.String(),
			StationID:      a.StationID.String(),
			MetricName:     a.MetricName,
			Severity:       string(a.Severity),
			Message:        a.Message,
			ResolutionNote: a.ResolutionNote,
			AssignedTo:     a.AssignedTo,
			CreatedAt:      a.CreatedAt.Format(time.RFC3339),
		}
		if !a.CreatedAt.IsZero() && a.ResolvedAt != nil && !a.ResolvedAt.IsZero() {
			item.ResolutionMins = math.Round(a.ResolvedAt.Sub(a.CreatedAt).Minutes()*10) / 10
		}
		if a.ResolvedAt != nil {
			item.ResolvedAt = a.ResolvedAt.Format(time.RFC3339)
		}
		if a.Station.ID != uuid.Nil {
			item.StationCode = a.Station.Code
			item.StationName = a.Station.Name
			item.Region = a.Station.Region
		}
		if a.AssignedUser != nil {
			item.EngineerName = a.AssignedUser.Name
		}
		result = append(result, item)
	}
	return result, total, nil
}

type LocationAnalysis struct {
	Region          string  `json:"region"`
	StationCount    int64   `json:"station_count"`
	AlarmCount      int64   `json:"alarm_count"`
	AlarmsPerStation float64 `json:"alarms_per_station"`
	HealthScore     float64 `json:"health_score"`
	ReliabilityScore float64 `json:"reliability_score"`
	FraudScore      float64 `json:"fraud_score"`
	ActiveCount     int64   `json:"active_count"`
	WarningCount    int64   `json:"warning_count"`
	CriticalCount   int64   `json:"critical_count"`
	OfflineCount    int64   `json:"offline_count"`
}

func (s *SummaryService) GetLocationAnalysis() ([]LocationAnalysis, error) {
	var rows []struct {
		Region        string
		StationCount  int64
		AlarmCount    int64
		ActiveCount   int64
		WarningCount  int64
		CriticalCount int64
		OfflineCount  int64
		MultiMetric   int64
	}

	database.DB.Raw(`
		SELECT
			bs.region,
			COUNT(DISTINCT bs.id) as station_count,
			COUNT(DISTINCT a.id) as alarm_count,
			SUM(CASE WHEN bs.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count,
			SUM(CASE WHEN bs.status = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
			SUM(CASE WHEN bs.status = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
			SUM(CASE WHEN bs.status = 'OFFLINE' THEN 1 ELSE 0 END) as offline_count,
			COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.station_id || '-' || a.metric_name END) as multi_metric
		FROM base_stations bs
		LEFT JOIN alarms a ON a.station_id = bs.id
		GROUP BY bs.region
	`).Scan(&rows)

	result := make([]LocationAnalysis, 0, len(rows))
	for _, r := range rows {
		healthScore := 0.0
		if r.StationCount > 0 {
			healthScore = math.Round(float64(r.ActiveCount*100+r.WarningCount*50) / float64(r.StationCount))
		}
		reliabilityScore := healthScore

		alarmsPerStation := 0.0
		if r.StationCount > 0 {
			alarmsPerStation = math.Round(float64(r.AlarmCount)/float64(r.StationCount)*10) / 10
		}

		fraudScore := math.Min(float64(r.MultiMetric)*15+alarmsPerStation*10+float64(r.CriticalCount)*5, 100)

		result = append(result, LocationAnalysis{
			Region:           r.Region,
			StationCount:     r.StationCount,
			AlarmCount:       r.AlarmCount,
			AlarmsPerStation: alarmsPerStation,
			HealthScore:      healthScore,
			ReliabilityScore: reliabilityScore,
			FraudScore:       fraudScore,
			ActiveCount:      r.ActiveCount,
			WarningCount:     r.WarningCount,
			CriticalCount:    r.CriticalCount,
			OfflineCount:     r.OfflineCount,
		})
	}
	return result, nil
}
