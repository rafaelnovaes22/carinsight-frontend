/**
 * CarInsight Chat UI
 * Modal de chat reutilizável em todas as páginas.
 * Renderiza mensagens, ações sugeridas, cards de recomendação e o
 * CTA de handoff para o WhatsApp da loja (handoff.waLink).
 * Depende de: api.js (CarInsightAPI) e chat.js (ChatManager).
 */

function openChat(vehicleId) {
  console.log('🗨️ Opening chat', vehicleId ? `for vehicle: ${vehicleId}` : '(general)');

  ChatManager.init(vehicleId || null)
    .then((response) => {
      window.currentChatVehicleId = vehicleId || null;
      showChatUI(response.greeting, response.vehicle);
    })
    .catch((error) => {
      console.error('❌ Failed to start chat:', error);
      alert('Erro ao iniciar conversa. Tente novamente.');
    });
}

/**
 * Show chat UI - creates the chat modal
 */
function showChatUI(greeting, vehicle) {
  let modal = document.getElementById('chat-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'chat-modal';
    modal.className = 'chat-modal';
    modal.innerHTML = `
      <div class="chat-modal-overlay" onclick="closeChatUI()"></div>
      <div class="chat-modal-content">
        <div class="chat-header">
          <div class="chat-header-info">
            <h3>💬 Assistente CarInsight</h3>
            <span class="chat-status">Online</span>
          </div>
          <button class="chat-close-btn" onclick="closeChatUI()">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="chat-vehicle-context" id="chat-vehicle-context"></div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-handoff" id="chat-handoff"></div>
        <div class="chat-actions" id="chat-actions"></div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" placeholder="Digite sua mensagem..."
                 onkeypress="handleChatKeypress(event)">
          <button class="chat-send-btn" onclick="sendChatMessage()">
            <i data-lucide="send"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    addChatStyles();
  }

  // Vehicle context banner
  const contextEl = document.getElementById('chat-vehicle-context');
  if (vehicle && contextEl) {
    const price = vehicle.price
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price)
      : '';
    contextEl.innerHTML = `
      <div class="chat-vehicle-card">
        <strong>${vehicle.make} ${vehicle.model} ${vehicle.yearModel}</strong>
        ${price ? `<span>${price}</span>` : ''}
      </div>
    `;
    contextEl.style.display = 'block';
  } else if (contextEl) {
    contextEl.style.display = 'none';
  }

  // Reset messages and show greeting
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    messagesEl.innerHTML = '';
    addMessageToUI('assistant', greeting);
  }
  const handoffEl = document.getElementById('chat-handoff');
  if (handoffEl) handoffEl.innerHTML = '';

  // Callbacks do ChatManager
  ChatManager.onMessageReceived = (msg) => {
    addMessageToUI(msg.role, msg.content, msg.suggestedActions, msg.recommendations, msg.handoff);
  };

  ChatManager.onError = (errorMessage) => {
    hideTypingIndicator();
    addMessageToUI('assistant', '⚠️ Tivemos um problema para processar sua mensagem. Pode tentar de novo?');
    console.error('Chat error:', errorMessage);
  };

  ChatManager.onLoadingChange = (loading) => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.chat-send-btn');
    if (input) input.disabled = loading;
    if (sendBtn) sendBtn.disabled = loading;
    if (loading) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  };

  modal.classList.add('show');

  setTimeout(() => {
    const input = document.getElementById('chat-input');
    if (input) input.focus();
  }, 300);

  if (window.lucide) lucide.createIcons();
}

function closeChatUI() {
  const modal = document.getElementById('chat-modal');
  if (modal) modal.classList.remove('show');
}

/**
 * Add message to chat UI, with optional action buttons,
 * recommendation cards and WhatsApp handoff CTA.
 */
function addMessageToUI(role, content, suggestedActions = null, recommendations = null, handoff = null) {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message chat-message-${role}`;
  messageDiv.innerHTML = `
    <div class="chat-message-content">
      ${ChatManager.formatMessage(content)}
    </div>
  `;
  messagesEl.appendChild(messageDiv);

  // Recommendation cards (backend: recommendations[])
  if (role === 'assistant' && recommendations && recommendations.length > 0) {
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'chat-recommendations';
    cardsDiv.innerHTML = recommendations.slice(0, 3).map((rec) => {
      const v = rec.vehicle;
      if (!v) return '';
      const price = v.price
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v.price)
        : 'Consulte';
      const km = v.mileage ? `${Math.round(v.mileage / 1000)} mil km` : '';
      const reasoning = rec.reasoning ? `<p class="chat-rec-reason">${rec.reasoning}</p>` : '';
      return `
        <div class="chat-rec-card">
          <div class="chat-rec-info">
            <strong>${v.make} ${v.model} ${v.yearModel}</strong>
            <span class="chat-rec-meta">${km}${km && price ? ' • ' : ''}${price}</span>
            ${reasoning}
          </div>
          <a class="chat-rec-link" href="detalhes-carro.html?id=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">Ver detalhes</a>
        </div>
      `;
    }).join('');
    messagesEl.appendChild(cardsDiv);
  }

  // WhatsApp handoff CTA - dispara pelo payload, não depende de suggestedActions
  if (role === 'assistant' && handoff && handoff.waLink) {
    renderHandoffCta(handoff);
  }

  // Suggested action buttons (sem duplicar o CTA de WhatsApp)
  if (suggestedActions && suggestedActions.length > 0) {
    const actionsEl = document.getElementById('chat-actions');
    if (actionsEl) {
      actionsEl.innerHTML = suggestedActions
        .filter((action) => action !== 'OPEN_WHATSAPP')
        .map((action) => `
          <button class="chat-action-btn" onclick="handleChatAction('${action}')">
            ${ChatManager.getActionLabel(action)}
          </button>
        `).join('');
    }
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Render the persistent WhatsApp CTA (lead pronto para a loja)
 */
function renderHandoffCta(handoff) {
  const handoffEl = document.getElementById('chat-handoff');
  if (!handoffEl) return;

  handoffEl.innerHTML = `
    <a class="chat-whatsapp-btn" href="${handoff.waLink}" target="_blank" rel="noopener"
       data-lead-id="${handoff.leadId || ''}">
      📲 Continuar no WhatsApp da loja
    </a>
  `;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;
  hideTypingIndicator();

  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'chat-message chat-message-assistant';
  indicator.innerHTML = `
    <div class="chat-message-content typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(indicator);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

function handleChatKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;

  const message = input.value.trim();
  input.value = '';

  const actionsEl = document.getElementById('chat-actions');
  if (actionsEl) actionsEl.innerHTML = '';

  ChatManager.sendMessage(message)
    .catch((error) => {
      console.error('Failed to send message:', error);
    });
}

function handleChatAction(action) {
  const actionsEl = document.getElementById('chat-actions');
  if (actionsEl) actionsEl.innerHTML = '';

  ChatManager.sendAction(action)
    .catch((error) => {
      console.error('Failed to send action:', error);
    });
}

function addChatStyles() {
  if (document.getElementById('chat-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'chat-styles';
  styles.textContent = `
    .chat-modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 9999;
    }
    .chat-modal.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-modal-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    .chat-modal-content {
      position: relative;
      width: 90%;
      max-width: 500px;
      max-height: 85vh;
      background: white;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .chat-header h3 { margin: 0; font-size: 1rem; }
    .chat-status { font-size: 0.75rem; opacity: 0.8; }
    .chat-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
    }
    .chat-vehicle-context {
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
    }
    .chat-vehicle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 300px;
      max-height: 400px;
    }
    .chat-message { max-width: 85%; }
    .chat-message-user { align-self: flex-end; }
    .chat-message-assistant { align-self: flex-start; }
    .chat-message-content {
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .chat-message-user .chat-message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .chat-message-assistant .chat-message-content {
      background: #f1f3f4;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    .chat-recommendations {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-self: stretch;
    }
    .chat-rec-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid #e2e5ea;
      border-radius: 12px;
      background: #fff;
    }
    .chat-rec-info { display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; }
    .chat-rec-meta { color: #666; font-size: 0.8rem; }
    .chat-rec-reason { margin: 2px 0 0; color: #667eea; font-size: 0.78rem; font-style: italic; }
    .chat-rec-link {
      flex-shrink: 0;
      font-size: 0.8rem;
      color: #667eea;
      text-decoration: none;
      border: 1px solid #667eea;
      border-radius: 16px;
      padding: 6px 12px;
      white-space: nowrap;
    }
    .chat-rec-link:hover { background: #667eea; color: white; }
    .chat-handoff { padding: 0 16px; }
    .chat-whatsapp-btn {
      display: block;
      text-align: center;
      margin: 4px 0 8px;
      padding: 12px 16px;
      background: #25D366;
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: 24px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(37,211,102,0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .chat-whatsapp-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37,211,102,0.45);
    }
    .chat-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 16px 12px;
    }
    .chat-action-btn {
      padding: 8px 16px;
      border: 1px solid #667eea;
      background: white;
      color: #667eea;
      border-radius: 20px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chat-action-btn:hover { background: #667eea; color: white; }
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid #eee;
    }
    #chat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 24px;
      font-size: 0.9rem;
      outline: none;
    }
    #chat-input:focus { border-color: #667eea; }
    .chat-send-btn {
      width: 44px;
      height: 44px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .typing-indicator { display: flex; gap: 4px; padding: 16px !important; }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }
  `;
  document.head.appendChild(styles);
}

// Exposição global (páginas usam onclick inline)
window.openChat = openChat;
window.showChatUI = showChatUI;
window.closeChatUI = closeChatUI;
window.handleChatKeypress = handleChatKeypress;
window.sendChatMessage = sendChatMessage;
window.handleChatAction = handleChatAction;

console.log('💬 ChatUI loaded');
