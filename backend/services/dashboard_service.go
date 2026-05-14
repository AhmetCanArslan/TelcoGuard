package services

import (
	"case1/database"
	"case1/models"
	"math"
)

type DashboardService struct{}

func NewDashboardService() *DashboardService {
	return &DashboardService{}
}

type DashboardSummary struct {
	TotalStations         int64                 `json:"total_stations"`
	ActiveStations        int64                 `json:"active_stations"`
	WarningStations       int64                 `json:"warning_stations"`
	CriticalStations      int64                 `json:"critical_stations"`
	OfflineStations       int64                 `json:"offline_stations"`
	TotalAlarms           int64                 `json:"total_alarms"`
	OpenAlarms            int64                 `json:"open_alarms"`
	CriticalAlarms        int64                 `json:"critical_alarms"`
	OnlineEngineers       int64                 `json:"online_engineers"`
	StationsByRegion      map[string]int64      `json:"stations_by_region"`
	AlarmsByStatus        map[string]int64      `json:"alarms_by_status"`
}

func (s *DashboardService) GetSummary() (*DashboardSummary, error) {
	var summary DashboardSummary
	
	database.DB.Model(&models.BaseStation{}).Count(&summary.TotalStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusActive).Count(&summary.ActiveStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusWarning).Count(&summary.WarningStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusCritical).Count(&summary.CriticalStations)
	database.DB.Model(&models.BaseStation{}).Where("status = ?", models.StationStatusOffline).Count(&summary.OfflineStations)

	database.DB.Model(&models.Alarm{}).Where("status != ?", models.AlarmStatusResolved).Count(&summary.TotalAlarms)
	database.DB.Model(&models.Alarm{}).Where("status = ?", models.AlarmStatusOpen).Count(&summary.OpenAlarms)
	database.DB.Model(&models.Alarm{}).Where("severity = ? AND status != ?", models.AlarmSeverityCritical, models.AlarmStatusResolved).Count(&summary.CriticalAlarms)
	database.DB.Model(&models.User{}).Where("role = ? AND is_online = true", models.RoleFieldEngineer).Count(&summary.OnlineEngineers)

	summary.StationsByRegion = make(map[string]int64)
	var regionStats []struct {
		Region string
		Count  int64
	}
	database.DB.Model(&models.BaseStation{}).Select("region, count(*) as count").Group("region").Scan(&regionStats)
	for _, r := range regionStats {
		summary.StationsByRegion[r.Region] = r.Count
	}

	summary.AlarmsByStatus = make(map[string]int64)
	var statusStats []struct {
		Status string
		Count  int64
	}
	database.DB.Model(&models.Alarm{}).Select("status, count(*) as count").Group("status").Scan(&statusStats)
	for _, s := range statusStats {
		summary.AlarmsByStatus[s.Status] = s.Count
	}

	return &summary, nil
}

type RegionHealth struct {
	Region            string  `json:"region"`
	StationCount      int64   `json:"station_count"`
	HealthScore       float64 `json:"health_score"`
	ActiveCount       int64   `json:"active_count"`
	WarningCount      int64   `json:"warning_count"`
	CriticalCount     int64   `json:"critical_count"`
	OfflineCount      int64   `json:"offline_count"`
}

func (s *DashboardService) GetRegionHealth() ([]RegionHealth, error) {
	var regions []RegionHealth
	
	var results []struct {
		Region        string
		Total         int64
		ActiveCount   int64
		WarningCount  int64
		CriticalCount int64
		OfflineCount  int64
	}

	database.DB.Raw(`
		SELECT region, 
			count(*) as total,
			sum(case when status = 'ACTIVE' then 1 else 0 end) as active_count,
			sum(case when status = 'WARNING' then 1 else 0 end) as warning_count,
			sum(case when status = 'CRITICAL' then 1 else 0 end) as critical_count,
			sum(case when status = 'OFFLINE' then 1 else 0 end) as offline_count
		FROM base_stations
		GROUP BY region
	`).Scan(&results)

	for _, r := range results {
		score := 100.0
		if r.Total > 0 {
			score = (float64(r.ActiveCount)*100 + float64(r.WarningCount)*50 + float64(r.CriticalCount)*0 + float64(r.OfflineCount)*0) / float64(r.Total)
		}
		regions = append(regions, RegionHealth{
			Region:        r.Region,
			StationCount:  r.Total,
			HealthScore:   math.Round(score*100) / 100,
			ActiveCount:   r.ActiveCount,
			WarningCount:  r.WarningCount,
			CriticalCount: r.CriticalCount,
			OfflineCount:  r.OfflineCount,
		})
	}

	return regions, nil
}
