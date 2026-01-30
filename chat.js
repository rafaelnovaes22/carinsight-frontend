/**
 * CarInsight Chat Manager
 * Handles chat sessions, messages, and UI state
 */

const ChatManager = {
  // Current session state
  currentSession: null,
  messages: [],
  isLoading: false,
  
  // Callbacks for UI updates (to be set by the page)
  onMessageReceived: null,
  onLoadingChange: null,
  onSessionStart: null,
  onError: null,

  /**
   * Initialize chat for a specific vehicle or general conversation
   * @param {string} vehicleId - Optional vehicle ID
   * @returns {Promise<{sessionId: string, greeting: string}>}
   */
  async init(vehicleId = null) {
    console.log('🗨️ ChatManager: Initializing', vehicleId ? `for vehicle ${vehicleId}` : 'general chat');
    
    try {
      this.setLoading(true);
      
      // Check for existing session
      const existingSessionId = CarInsightAPI.getChatSessionId(vehicleId);
      
      if (existingSessionId) {
        // Try to restore existing session
        try {
          const state = await CarInsightAPI.getChatState(existingSessionId);
          if (state && !state.error) {
            this.currentSession = {
              sessionId: existingSessionId,
              vehicleId,
              ...state,
            };
            console.log('✅ Restored existing session:', existingSessionId);
            return { sessionId: existingSessionId, restored: true };
          }
        } catch (e) {
          console.log('⚠️ Could not restore session, starting new one');
        }
      }
      
      // Start new session
      const response = await CarInsightAPI.startChat(vehicleId);
      
      this.currentSession = {
        sessionId: response.sessionId,
        vehicleId,
        vehicle: response.vehicle,
      };
      
      // Add greeting as first message
      this.messages = [{
        role: 'assistant',
        content: response.greeting,
        timestamp: new Date(),
      }];
      
      console.log('✅ New chat session started:', response.sessionId);
      
      if (this.onSessionStart) {
        this.onSessionStart(this.currentSession, response.greeting);
      }
      
      return response;
    } catch (error) {
      console.error('❌ ChatManager: Init failed', error);
      if (this.onError) this.onError(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * Send a message and get response
   * @param {string} content - Message content
   * @returns {Promise<object>}
   */
  async sendMessage(content) {
    if (!this.currentSession?.sessionId) {
      throw new Error('No active chat session');
    }
    
    if (!content.trim()) {
      return null;
    }
    
    console.log('📤 Sending message:', content.substring(0, 50));
    
    try {
      this.setLoading(true);
      
      // Add user message to history
      const userMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      this.messages.push(userMessage);
      
      if (this.onMessageReceived) {
        this.onMessageReceived(userMessage);
      }
      
      // Send to API
      const response = await CarInsightAPI.sendChatMessage(
        this.currentSession.sessionId,
        content.trim()
      );
      
      // Add assistant response to history
      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        suggestedActions: response.suggestedActions,
        recommendations: response.recommendations,
        currentNode: response.currentNode,
      };
      this.messages.push(assistantMessage);
      
      console.log('📥 Response received, node:', response.currentNode);
      
      if (this.onMessageReceived) {
        this.onMessageReceived(assistantMessage);
      }
      
      return response;
    } catch (error) {
      console.error('❌ ChatManager: Send failed', error);
      if (this.onError) this.onError(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * Send a quick action (predefined message)
   * @param {string} action - Action type
   */
  async sendAction(action) {
    const actionMessages = {
      'HANDOFF_HUMAN': 'Quero falar com um vendedor',
      'SHOW_FINANCING': 'Quero simular financiamento',
      'SCHEDULE_VISIT': 'Quero agendar uma visita',
      'SHOW_DETAILS': 'Quero ver mais detalhes',
      'MORE_OPTIONS': 'Quero ver mais opções',
    };
    
    const message = actionMessages[action];
    if (message) {
      return this.sendMessage(message);
    }
  },

  /**
   * Reset current chat session
   */
  async reset() {
    if (this.currentSession?.sessionId) {
      try {
        await CarInsightAPI.resetChat(this.currentSession.sessionId);
        console.log('🗑️ Chat session reset');
      } catch (e) {
        console.warn('Could not reset session on server:', e);
      }
    }
    
    this.currentSession = null;
    this.messages = [];
  },

  /**
   * Get all messages in current session
   * @returns {array}
   */
  getMessages() {
    return [...this.messages];
  },

  /**
   * Get current session info
   * @returns {object|null}
   */
  getSession() {
    return this.currentSession;
  },

  /**
   * Check if chat is active
   * @returns {boolean}
   */
  isActive() {
    return !!this.currentSession?.sessionId;
  },

  /**
   * Set loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    this.isLoading = loading;
    if (this.onLoadingChange) {
      this.onLoadingChange(loading);
    }
  },

  /**
   * Format message content (convert WhatsApp-style formatting to HTML)
   * @param {string} content
   * @returns {string}
   */
  formatMessage(content) {
    if (!content) return '';
    
    return content
      // Bold: *text* -> <strong>text</strong>
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      // Italic: _text_ -> <em>text</em>
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br>')
      // Bullet points
      .replace(/^• /gm, '&bull; ');
  },

  /**
   * Get action button label
   * @param {string} action
   * @returns {string}
   */
  getActionLabel(action) {
    const labels = {
      'HANDOFF_HUMAN': '👨‍💼 Falar com vendedor',
      'SHOW_FINANCING': '💰 Simular financiamento',
      'FINANCING_SIMULATION': '💰 Simular financiamento',
      'SCHEDULE_VISIT': '📅 Agendar visita',
      'SHOW_DETAILS': '📋 Ver detalhes',
      'TRADE_IN_EVALUATION': '🔄 Avaliar troca',
      'RETRY': '🔄 Tentar novamente',
    };
    return labels[action] || action;
  },
};

// Export for use in other scripts
window.ChatManager = ChatManager;

console.log('🗨️ ChatManager loaded');
