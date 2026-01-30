/**
 * CarInsight Favorites Manager
 * Handles saved vehicles with local storage and API sync
 */

const FavoritesManager = {
  STORAGE_KEY: 'carinsight_favorites',
  
  /**
   * Get all saved vehicle IDs from localStorage
   * @returns {string[]}
   */
  getLocalFavorites() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading favorites:', e);
      return [];
    }
  },

  /**
   * Save favorites to localStorage
   * @param {string[]} favorites
   */
  saveLocalFavorites(favorites) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  },

  /**
   * Add a vehicle to favorites
   * @param {string} vehicleId
   * @returns {boolean} success
   */
  add(vehicleId) {
    const favorites = this.getLocalFavorites();
    if (!favorites.includes(vehicleId)) {
      favorites.push(vehicleId);
      this.saveLocalFavorites(favorites);
      
      // Sync with API if logged in
      if (window.CarInsightAPI?.isLoggedIn()) {
        CarInsightAPI.saveVehicle(vehicleId).catch(console.error);
      }
      
      console.log('💜 Added to favorites:', vehicleId);
      return true;
    }
    return false;
  },

  /**
   * Remove a vehicle from favorites
   * @param {string} vehicleId
   * @returns {boolean} success
   */
  remove(vehicleId) {
    const favorites = this.getLocalFavorites();
    const index = favorites.indexOf(vehicleId);
    if (index > -1) {
      favorites.splice(index, 1);
      this.saveLocalFavorites(favorites);
      console.log('💔 Removed from favorites:', vehicleId);
      return true;
    }
    return false;
  },

  /**
   * Toggle favorite status
   * @param {string} vehicleId
   * @returns {boolean} new status (true = favorited)
   */
  toggle(vehicleId) {
    if (this.isFavorite(vehicleId)) {
      this.remove(vehicleId);
      return false;
    } else {
      this.add(vehicleId);
      return true;
    }
  },

  /**
   * Check if a vehicle is favorited
   * @param {string} vehicleId
   * @returns {boolean}
   */
  isFavorite(vehicleId) {
    return this.getLocalFavorites().includes(vehicleId);
  },

  /**
   * Get count of favorites
   * @returns {number}
   */
  getCount() {
    return this.getLocalFavorites().length;
  },

  /**
   * Clear all favorites
   */
  clear() {
    this.saveLocalFavorites([]);
    console.log('🗑️ All favorites cleared');
  },

  /**
   * Get full vehicle data for all favorites
   * @returns {Promise<object[]>}
   */
  async getFavoriteVehicles() {
    const favoriteIds = this.getLocalFavorites();
    if (favoriteIds.length === 0) return [];

    try {
      // Fetch each vehicle's data
      const vehicles = await Promise.all(
        favoriteIds.map(async (id) => {
          try {
            return await CarInsightAPI.getVehicle(id);
          } catch (e) {
            console.warn(`Could not fetch vehicle ${id}:`, e);
            return null;
          }
        })
      );
      
      // Filter out failed fetches
      return vehicles.filter(v => v !== null);
    } catch (e) {
      console.error('Error fetching favorite vehicles:', e);
      return [];
    }
  },
};

// Export for use in other scripts
window.FavoritesManager = FavoritesManager;

console.log('💜 FavoritesManager loaded');
