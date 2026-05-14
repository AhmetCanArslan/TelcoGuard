package services

import (
	"case1/models"
	"case1/repositories"
	"math"
)

type AssignmentService struct {
	userRepo *repositories.UserRepository
}

func NewAssignmentService() *AssignmentService {
	return &AssignmentService{
		userRepo: repositories.NewUserRepository(),
	}
}

func (s *AssignmentService) FindNearestEngineer(stationLat, stationLng float64) (*models.User, error) {
	engineers, err := s.userRepo.FindFieldEngineers()
	if err != nil {
		return nil, err
	}

	if len(engineers) == 0 {
		return nil, nil
	}

	var nearest *models.User
	minDist := math.MaxFloat64

	for i := range engineers {
		if engineers[i].Latitude == nil || engineers[i].Longitude == nil || !engineers[i].IsOnline {
			continue
		}
		dist := haversine(stationLat, stationLng, *engineers[i].Latitude, *engineers[i].Longitude)
		if dist < minDist {
			minDist = dist
			nearest = &engineers[i]
		}
	}

	return nearest, nil
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371 // Earth radius in km
	phi1 := lat1 * math.Pi / 180
	phi2 := lat2 * math.Pi / 180
	deltaPhi := (lat2 - lat1) * math.Pi / 180
	deltaLambda := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(deltaPhi/2)*math.Sin(deltaPhi/2) +
		math.Cos(phi1)*math.Cos(phi2)*
			math.Sin(deltaLambda/2)*math.Sin(deltaLambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
