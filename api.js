/**
 * CarInsight API Client
 * Centralized API communication with the NestJS Backend
 */

const isProduction = window.location.hostname === 'carinsight.com.br' || 
                     window.location.hostname === 'www.carinsight.com.br';
const API_BASE_URL = isProduction ? 'https://api.carinsight.com.br' : 'http://localhost:3000';

console.log('🚀 CarInsight API Client loaded');
console.log('📡 API URL:', API_BASE_URL);

// Token management
let accessToken = localStorage.getItem('carinsight_token');
let refreshToken = localStorage.getItem('carinsight_refresh_token');

const CarInsightAPI = {
  // ==================== AUTH ====================
  async register(email, password, name) {
    const response = await this._fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this._saveTokens(response);
    return response;
  },

  async login(email, password) {
    const response = await this._fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this._saveTokens(response);
    return response;
  },

  async logout() {
    localStorage.removeItem('carinsight_token');
    localStorage.removeItem('carinsight_refresh_token');
    localStorage.removeItem('carinsight_user');
    accessToken = null;
    refreshToken = null;
  },

  async getProfile() {
    return this._fetch('/auth/profile', { auth: true });
  },

  isLoggedIn() {
    return !!accessToken;
  },

  getUser() {
    const user = localStorage.getItem('carinsight_user');
    return user ? JSON.parse(user) : null;
  },

  // ==================== VEHICLES ====================
  async getVehicles(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.make) params.append('make', filters.make);
    if (filters.model) params.append('model', filters.model);
    if (filters.priceMin) params.append('priceMin', filters.priceMin);
    if (filters.priceMax) params.append('priceMax', filters.priceMax);

    const query = params.toString();
    return this._fetch(`/vehicles${query ? '?' + query : ''}`);
  },

  async getVehicle(id) {
    return this._fetch(`/vehicles/${id}`);
  },

  // ==================== SEARCH ====================
  async search(query, filters = {}) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.priceMin) params.append('priceMin', filters.priceMin);
    if (filters.priceMax) params.append('priceMax', filters.priceMax);
    if (filters.yearMin) params.append('yearMin', filters.yearMin);
    if (filters.yearMax) params.append('yearMax', filters.yearMax);
    if (filters.make) params.append('make', filters.make);
    if (filters.bodyType) params.append('bodyType', filters.bodyType);
    if (filters.condition) params.append('condition', filters.condition);

    return this._fetch(`/search?${params.toString()}`);
  },

  async getSimilarVehicles(vehicleId, limit = 5) {
    return this._fetch(`/search/similar/${vehicleId}?limit=${limit}`);
  },

  async getSearchStats() {
    return this._fetch('/search/stats');
  },

  // ==================== CHAT ====================
  async startChat(vehicleId) {
    return this._fetch('/api/chat/start', {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
      auth: true,
    });
  },

  async sendChatMessage(sessionId, content) {
    return this._fetch(`/api/chat/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      auth: true,
    });
  },

  // ==================== INTERACTIONS ====================
  async saveVehicle(vehicleId) {
    return this._fetch('/interactions', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, type: 'SAVED' }),
      auth: true,
    });
  },

  async viewVehicle(vehicleId) {
    return this._fetch('/interactions', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, type: 'VIEWED' }),
    });
  },

  // ==================== USER PREFERENCES ====================
  async updatePreferences(preferences) {
    return this._fetch('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
      auth: true,
    });
  },

  // ==================== INTERNAL ====================
  async _fetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (options.auth && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
      });

      // Handle 401 - try refresh token
      if (response.status === 401 && refreshToken && options.auth) {
        const refreshed = await this._refreshTokens();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${accessToken}`;
          const retryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body,
          });
          return retryResponse.json();
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`❌ API Error [${endpoint}]:`, error.message);
      throw error;
    }
  },

  async _refreshTokens() {
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this._saveTokens(data);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.logout();
    return false;
  },

  _saveTokens(response) {
    if (response.accessToken) {
      accessToken = response.accessToken;
      localStorage.setItem('carinsight_token', accessToken);
    }
    if (response.refreshToken) {
      refreshToken = response.refreshToken;
      localStorage.setItem('carinsight_refresh_token', refreshToken);
    }
    if (response.user) {
      localStorage.setItem('carinsight_user', JSON.stringify(response.user));
    }
  },
};

// Export for use in other scripts
window.CarInsightAPI = CarInsightAPI;
