/**
 * CarInsight Auth Manager
 * Handles authentication UI and state
 */

const AuthManager = {
  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return CarInsightAPI.isLoggedIn();
  },

  /**
   * Get current user
   * @returns {object|null}
   */
  getUser() {
    return CarInsightAPI.getUser();
  },

  /**
   * Register a new user
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<object>}
   */
  async register(email, password, name) {
    try {
      const result = await CarInsightAPI.register(email, password, name);
      console.log('✅ Registration successful');
      this.onAuthChange(true);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>}
   */
  async login(email, password) {
    try {
      const result = await CarInsightAPI.login(email, password);
      console.log('✅ Login successful');
      this.onAuthChange(true);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout user
   */
  async logout() {
    await CarInsightAPI.logout();
    console.log('👋 Logged out');
    this.onAuthChange(false);
  },

  /**
   * Sync local favorites with server after login
   */
  async syncFavorites() {
    if (!this.isLoggedIn() || !window.FavoritesManager) return;

    const localFavorites = FavoritesManager.getLocalFavorites();
    if (localFavorites.length === 0) return;

    console.log('🔄 Syncing favorites with server...');
    
    for (const vehicleId of localFavorites) {
      try {
        await CarInsightAPI.saveVehicle(vehicleId);
      } catch (e) {
        console.warn(`Could not sync favorite ${vehicleId}:`, e);
      }
    }
    
    console.log('✅ Favorites synced');
  },

  /**
   * Called when auth state changes
   * @param {boolean} isLoggedIn
   */
  onAuthChange(isLoggedIn) {
    // Update UI elements
    this.updateAuthUI();
    
    // Sync favorites if logged in
    if (isLoggedIn) {
      this.syncFavorites();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('authChange', { 
      detail: { isLoggedIn, user: this.getUser() } 
    }));
  },

  /**
   * Update auth-related UI elements
   */
  updateAuthUI() {
    const user = this.getUser();
    const isLoggedIn = this.isLoggedIn();

    // Update login/logout buttons if they exist
    const loginBtns = document.querySelectorAll('[data-auth="login"]');
    const logoutBtns = document.querySelectorAll('[data-auth="logout"]');
    const userNameEls = document.querySelectorAll('[data-auth="username"]');
    const authRequiredEls = document.querySelectorAll('[data-auth-required]');

    loginBtns.forEach(btn => {
      btn.style.display = isLoggedIn ? 'none' : '';
    });

    logoutBtns.forEach(btn => {
      btn.style.display = isLoggedIn ? '' : 'none';
    });

    userNameEls.forEach(el => {
      el.textContent = user?.name || '';
      el.style.display = isLoggedIn ? '' : 'none';
    });

    authRequiredEls.forEach(el => {
      el.style.opacity = isLoggedIn ? '1' : '0.5';
      el.style.pointerEvents = isLoggedIn ? '' : 'none';
    });
  },

  /**
   * Show login modal (creates if not exists)
   */
  showLoginModal() {
    let modal = document.getElementById('auth-modal');
    
    if (!modal) {
      modal = this.createAuthModal();
      document.body.appendChild(modal);
    }
    
    // Reset to login view
    this.switchAuthView('login');
    modal.classList.add('show');
    
    if (window.lucide) lucide.createIcons();
  },

  /**
   * Hide login modal
   */
  hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  },

  /**
   * Switch between login and register views
   * @param {string} view - 'login' or 'register'
   */
  switchAuthView(view) {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const title = document.getElementById('auth-modal-title');
    
    if (view === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (title) title.textContent = 'Entrar';
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (title) title.textContent = 'Criar Conta';
    }
  },

  /**
   * Create auth modal HTML
   * @returns {HTMLElement}
   */
  createAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-overlay" onclick="AuthManager.hideAuthModal()"></div>
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h3 id="auth-modal-title">Entrar</h3>
          <button class="auth-close-btn" onclick="AuthManager.hideAuthModal()">
            <i data-lucide="x"></i>
          </button>
        </div>
        
        <div id="auth-login-form" class="auth-form">
          <div class="auth-input-group">
            <label>Email</label>
            <input type="email" id="login-email" placeholder="seu@email.com">
          </div>
          <div class="auth-input-group">
            <label>Senha</label>
            <input type="password" id="login-password" placeholder="••••••••">
          </div>
          <div id="login-error" class="auth-error"></div>
          <button class="auth-submit-btn" onclick="AuthManager.handleLogin()">
            Entrar
          </button>
          <p class="auth-switch">
            Não tem conta? <a href="#" onclick="AuthManager.switchAuthView('register'); return false;">Criar conta</a>
          </p>
        </div>
        
        <div id="auth-register-form" class="auth-form" style="display:none;">
          <div class="auth-input-group">
            <label>Nome</label>
            <input type="text" id="register-name" placeholder="Seu nome">
          </div>
          <div class="auth-input-group">
            <label>Email</label>
            <input type="email" id="register-email" placeholder="seu@email.com">
          </div>
          <div class="auth-input-group">
            <label>Senha</label>
            <input type="password" id="register-password" placeholder="Mínimo 6 caracteres">
          </div>
          <div id="register-error" class="auth-error"></div>
          <button class="auth-submit-btn" onclick="AuthManager.handleRegister()">
            Criar Conta
          </button>
          <p class="auth-switch">
            Já tem conta? <a href="#" onclick="AuthManager.switchAuthView('login'); return false;">Entrar</a>
          </p>
        </div>
      </div>
    `;
    
    // Add styles
    this.addAuthStyles();
    
    return modal;
  },

  /**
   * Handle login form submission
   */
  async handleLogin() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    const errorEl = document.getElementById('login-error');
    
    if (!email || !password) {
      if (errorEl) errorEl.textContent = 'Preencha todos os campos';
      return;
    }
    
    const result = await this.login(email, password);
    
    if (result.success) {
      this.hideAuthModal();
    } else {
      if (errorEl) errorEl.textContent = result.error || 'Erro ao fazer login';
    }
  },

  /**
   * Handle register form submission
   */
  async handleRegister() {
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const errorEl = document.getElementById('register-error');
    
    if (!name || !email || !password) {
      if (errorEl) errorEl.textContent = 'Preencha todos os campos';
      return;
    }
    
    if (password.length < 6) {
      if (errorEl) errorEl.textContent = 'Senha deve ter no mínimo 6 caracteres';
      return;
    }
    
    const result = await this.register(email, password, name);
    
    if (result.success) {
      this.hideAuthModal();
    } else {
      if (errorEl) errorEl.textContent = result.error || 'Erro ao criar conta';
    }
  },

  /**
   * Add auth modal styles
   */
  addAuthStyles() {
    if (document.getElementById('auth-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'auth-styles';
    styles.textContent = `
      .auth-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }
      .auth-modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .auth-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
      }
      .auth-modal-content {
        position: relative;
        width: 90%;
        max-width: 400px;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .auth-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #eee;
      }
      .auth-modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }
      .auth-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #666;
      }
      .auth-form {
        padding: 24px;
      }
      .auth-input-group {
        margin-bottom: 16px;
      }
      .auth-input-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #333;
      }
      .auth-input-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        box-sizing: border-box;
      }
      .auth-input-group input:focus {
        outline: none;
        border-color: #667eea;
      }
      .auth-error {
        color: #e74c3c;
        font-size: 0.85rem;
        margin-bottom: 12px;
        min-height: 20px;
      }
      .auth-submit-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .auth-submit-btn:hover {
        opacity: 0.9;
      }
      .auth-switch {
        text-align: center;
        margin-top: 16px;
        font-size: 0.9rem;
        color: #666;
      }
      .auth-switch a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Initialize auth manager
   */
  init() {
    // Update UI on load
    this.updateAuthUI();
    
    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', (e) => {
      if (e.key === 'carinsight_token') {
        this.updateAuthUI();
      }
    });
  },
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.init();
});

// Export for use in other scripts
window.AuthManager = AuthManager;

console.log('🔐 AuthManager loaded');
