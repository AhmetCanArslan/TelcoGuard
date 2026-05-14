package repositories

import (
	"case1/models"
	"case1/testutil"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestThresholdRepository(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	repo := NewThresholdRepository()

	t.Run("FindAllActive", func(t *testing.T) {
		testutil.SeedThresholdConfigs(t)
		configs, err := repo.FindAllActive()
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(configs), 5)
	})

	t.Run("FindByMetric", func(t *testing.T) {
		// Configs already seeded by FindAllActive subtest
		config, err := repo.FindByMetric("cpu_usage")
		require.NoError(t, err)
		assert.Equal(t, "cpu_usage", config.MetricName)
		assert.Equal(t, 75.0, config.WarningThreshold)
		assert.Equal(t, 90.0, config.CriticalThreshold)

		_, err = repo.FindByMetric("nonexistent_metric")
		assert.Error(t, err)
	})

	t.Run("CreateOrUpdate", func(t *testing.T) {
		testutil.CleanTestDB(t)
		cfg := &models.ThresholdConfig{
			MetricName:        "test_metric",
			WarningThreshold:  10.0,
			CriticalThreshold: 20.0,
			Direction:         models.ThresholdDirectionAbove,
			IsActive:          true,
		}
		err := repo.CreateOrUpdate(cfg)
		require.NoError(t, err)
		assert.Greater(t, cfg.ID, uint(0))

		// Update existing
		cfg.WarningThreshold = 15.0
		err = repo.CreateOrUpdate(cfg)
		require.NoError(t, err)

		found, _ := repo.FindByMetric("test_metric")
		assert.Equal(t, 15.0, found.WarningThreshold)
	})
}
