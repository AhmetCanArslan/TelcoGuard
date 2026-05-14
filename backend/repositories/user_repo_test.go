package repositories

import (
	"case1/models"
	"case1/testutil"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserRepository(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	repo := NewUserRepository()

	t.Run("FindByEmail", func(t *testing.T) {
		user := models.User{Name: "Test", Email: "find@email.com", Password: "hash", Role: models.RoleNOCOperator, Active: true}
		testutil.SetupTestDB().Create(&user)

		found, err := repo.FindByEmail("find@email.com")
		require.NoError(t, err)
		assert.Equal(t, "Test", found.Name)

		_, err = repo.FindByEmail("notfound@email.com")
		assert.Error(t, err)
	})

	t.Run("FindByRole", func(t *testing.T) {
		testutil.CleanTestDB(t)
		roles := []models.Role{models.RoleFieldEngineer, models.RoleFieldEngineer, models.RoleNOCOperator}
		for i, role := range roles {
			email := string(role) + string(rune('0'+i)) + "@test.com"
			testutil.SetupTestDB().Create(&models.User{Name: "Test", Email: email, Password: "hash", Role: role, Active: true})
		}

		engineers, err := repo.FindByRole(models.RoleFieldEngineer)
		require.NoError(t, err)
		assert.Len(t, engineers, 2)
	})

	t.Run("FindFieldEngineers", func(t *testing.T) {
		testutil.CleanTestDB(t)
		testutil.SetupTestDB().Create(&models.User{Name: "Eng1", Email: "eng1@test.com", Password: "hash", Role: models.RoleFieldEngineer, Active: true})
		testutil.SetupTestDB().Create(&models.User{Name: "Noc1", Email: "noc1@test.com", Password: "hash", Role: models.RoleNOCOperator, Active: true})

		engineers, err := repo.FindFieldEngineers()
		require.NoError(t, err)
		assert.Len(t, engineers, 1)
		assert.Equal(t, "Eng1", engineers[0].Name)
	})

	t.Run("UpdateOnlineStatus", func(t *testing.T) {
		user := models.User{Name: "Test", Email: "online@test.com", Password: "hash", Role: models.RoleNOCOperator, Active: true, IsOnline: false}
		testutil.SetupTestDB().Create(&user)

		err := repo.UpdateOnlineStatus(user.ID, true)
		require.NoError(t, err)

		found, _ := repo.FindByID(user.ID)
		assert.True(t, found.IsOnline)
	})
}
