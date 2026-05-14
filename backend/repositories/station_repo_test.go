package repositories

import (
	"case1/models"
	"case1/testutil"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStationRepository(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	repo := NewStationRepository()

	t.Run("Create and FindByID", func(t *testing.T) {
		station := models.BaseStation{
			Code:     "TST-001",
			Name:     "Test Station",
			Latitude: 41.0,
			Longitude: 29.0,
			Region:   "Marmara",
			Type:     models.StationTypeLTE,
			Capacity: 500,
			Status:   models.StationStatusActive,
		}
		err := testutil.SetupTestDB().Create(&station).Error
		require.NoError(t, err)

		found, err := repo.FindByID(station.ID)
		require.NoError(t, err)
		assert.Equal(t, "TST-001", found.Code)
		assert.Equal(t, "Test Station", found.Name)
	})

	t.Run("FindByCode", func(t *testing.T) {
		station := models.BaseStation{
			Code:     "TST-002",
			Name:     "Find By Code",
			Latitude: 41.0,
			Longitude: 29.0,
			Region:   "Ege",
			Type:     models.StationTypeNR5G,
			Capacity: 1000,
			Status:   models.StationStatusActive,
		}
		testutil.SetupTestDB().Create(&station)

		found, err := repo.FindByCode("TST-002")
		require.NoError(t, err)
		assert.Equal(t, "Find By Code", found.Name)

		_, err = repo.FindByCode("NONEXISTENT")
		assert.Error(t, err)
	})

	t.Run("FindByRegion", func(t *testing.T) {
		testutil.CleanTestDB(t)
		for i := 0; i < 3; i++ {
			testutil.SetupTestDB().Create(&models.BaseStation{
				Code:     "REG-" + string(rune('A'+i)),
				Name:     "Marmara Station",
				Latitude: 41.0,
				Longitude: 29.0,
				Region:   "Marmara",
				Type:     models.StationTypeLTE,
				Capacity: 100,
				Status:   models.StationStatusActive,
			})
		}
		testutil.SetupTestDB().Create(&models.BaseStation{
			Code:     "REG-EGE", Name: "Ege Station",
			Latitude: 38.0, Longitude: 27.0, Region: "Ege",
			Type: models.StationTypeLTE, Capacity: 100, Status: models.StationStatusActive,
		})

		stations, err := repo.FindByRegion("Marmara")
		require.NoError(t, err)
		assert.Len(t, stations, 3)
	})

	t.Run("UpdateStatus", func(t *testing.T) {
		station := models.BaseStation{
			Code:     "UPD-001", Name: "Update Status",
			Latitude: 41.0, Longitude: 29.0, Region: "Marmara",
			Type: models.StationTypeLTE, Capacity: 100, Status: models.StationStatusActive,
		}
		testutil.SetupTestDB().Create(&station)

		err := repo.UpdateStatus(station.ID, models.StationStatusCritical)
		require.NoError(t, err)

		updated, _ := repo.FindByID(station.ID)
		assert.Equal(t, models.StationStatusCritical, updated.Status)
	})
}
