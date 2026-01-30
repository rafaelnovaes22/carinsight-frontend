/**
 * CarInsight Compare Manager
 * Handles vehicle comparison functionality
 */

const CompareManager = {
  STORAGE_KEY: 'carinsight_compare',
  MAX_VEHICLES: 3,

  /**
   * Get vehicles selected for comparison
   * @returns {string[]}
   */
  getCompareList() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading compare list:', e);
      return [];
    }
  },

  /**
   * Save compare list to localStorage
   * @param {string[]} list
   */
  saveCompareList(list) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving compare list:', e);
    }
  },

  /**
   * Add a vehicle to comparison
   * @param {string} vehicleId
   * @returns {{success: boolean, message: string}}
   */
  add(vehicleId) {
    const list = this.getCompareList();
    
    if (list.includes(vehicleId)) {
      return { success: false, message: 'Veículo já está na comparação' };
    }
    
    if (list.length >= this.MAX_VEHICLES) {
      return { success: false, message: `Máximo de ${this.MAX_VEHICLES} veículos para comparar` };
    }
    
    list.push(vehicleId);
    this.saveCompareList(list);
    console.log('📊 Added to compare:', vehicleId);
    return { success: true, message: 'Adicionado à comparação' };
  },

  /**
   * Remove a vehicle from comparison
   * @param {string} vehicleId
   * @returns {boolean}
   */
  remove(vehicleId) {
    const list = this.getCompareList();
    const index = list.indexOf(vehicleId);
    if (index > -1) {
      list.splice(index, 1);
      this.saveCompareList(list);
      console.log('📊 Removed from compare:', vehicleId);
      return true;
    }
    return false;
  },

  /**
   * Toggle comparison status
   * @param {string} vehicleId
   * @returns {{inCompare: boolean, message: string}}
   */
  toggle(vehicleId) {
    if (this.isInCompare(vehicleId)) {
      this.remove(vehicleId);
      return { inCompare: false, message: 'Removido da comparação' };
    } else {
      const result = this.add(vehicleId);
      return { inCompare: result.success, message: result.message };
    }
  },

  /**
   * Check if a vehicle is in comparison
   * @param {string} vehicleId
   * @returns {boolean}
   */
  isInCompare(vehicleId) {
    return this.getCompareList().includes(vehicleId);
  },

  /**
   * Get count of vehicles in comparison
   * @returns {number}
   */
  getCount() {
    return this.getCompareList().length;
  },

  /**
   * Clear comparison list
   */
  clear() {
    this.saveCompareList([]);
    console.log('🗑️ Compare list cleared');
  },

  /**
   * Get full vehicle data for comparison
   * @returns {Promise<object[]>}
   */
  async getCompareVehicles() {
    const compareIds = this.getCompareList();
    if (compareIds.length === 0) return [];

    try {
      const vehicles = await Promise.all(
        compareIds.map(async (id) => {
          try {
            return await CarInsightAPI.getVehicle(id);
          } catch (e) {
            console.warn(`Could not fetch vehicle ${id}:`, e);
            return null;
          }
        })
      );
      
      return vehicles.filter(v => v !== null);
    } catch (e) {
      console.error('Error fetching compare vehicles:', e);
      return [];
    }
  },

  /**
   * Generate comparison data with highlights
   * @param {object[]} vehicles
   * @returns {object}
   */
  generateComparison(vehicles) {
    if (vehicles.length < 2) return null;

    const comparison = {
      vehicles,
      highlights: {},
    };

    // Find best values for each criteria
    const criteria = ['price', 'mileage', 'yearModel'];
    
    criteria.forEach(key => {
      let bestIndex = 0;
      let bestValue = vehicles[0][key];
      
      vehicles.forEach((v, i) => {
        if (key === 'price' || key === 'mileage') {
          // Lower is better
          if (v[key] < bestValue) {
            bestValue = v[key];
            bestIndex = i;
          }
        } else if (key === 'yearModel') {
          // Higher is better
          if (v[key] > bestValue) {
            bestValue = v[key];
            bestIndex = i;
          }
        }
      });
      
      comparison.highlights[key] = {
        bestIndex,
        bestVehicleId: vehicles[bestIndex].id,
      };
    });

    return comparison;
  },
};

// Export for use in other scripts
window.CompareManager = CompareManager;

console.log('📊 CompareManager loaded');
