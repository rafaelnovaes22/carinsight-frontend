/**
 * CarInsight Chat UI
 * Modal de chat reutilizável em todas as páginas.
 * Renderiza mensagens, ações sugeridas, cards de recomendação e o
 * CTA de handoff para o WhatsApp da loja (handoff.waLink).
 * Depende de: api.js (CarInsightAPI) e chat.js (ChatManager).
 */

/** @type {HTMLElement|null} */
let chatReturnFocus = null;

function openChat(vehicleId) {
  chatReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      <div class="chat-modal-content" role="dialog" aria-modal="true" aria-label="Assistente CarInsight">
        <div class="chat-header">
          <div class="chat-header-info">
            <h3>💬 Assistente CarInsight</h3>
            <span class="chat-status">Online</span>
          </div>
          <button class="chat-close-btn" aria-label="Fechar conversa" onclick="closeChatUI()">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="chat-vehicle-context" id="chat-vehicle-context"></div>
        <div class="chat-messages" id="chat-messages" role="log" aria-live="polite"></div>
        <div class="chat-handoff" id="chat-handoff"></div>
        <div class="chat-actions" id="chat-actions"></div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" aria-label="Mensagem para o assistente" placeholder="Digite sua mensagem..."
                 onkeypress="handleChatKeypress(event)">
          <button class="chat-send-btn" aria-label="Enviar mensagem" onclick="sendChatMessage()">
            <i data-lucide="send"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('keydown', containChatFocus);
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
        <strong>${ChatManager.escapeText(vehicle.make)} ${ChatManager.escapeText(vehicle.model)} ${ChatManager.escapeText(vehicle.yearModel)}</strong>
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
    addMessageToUI(
      'assistant',
      '⚠️ Tivemos um problema para processar sua mensagem. Pode tentar de novo?',
    );
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
  chatReturnFocus?.focus();
}

/** @param {KeyboardEvent} event @returns {void} */
function containChatFocus(event) {
  if (event.key === 'Escape') return closeChatUI();
  if (event.key !== 'Tab') return;
  const modal = document.getElementById('chat-modal');
  const controls = [
    ...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]'),
  ];
  const first = controls[0];
  const last = controls[controls.length - 1];
  const backward = event.shiftKey && document.activeElement === first;
  const forward = !event.shiftKey && document.activeElement === last;
  if (!backward && !forward) return;
  event.preventDefault();
  const next = backward ? last : first;
  if (next instanceof HTMLElement) next.focus();
}

/**
 * Add message to chat UI, with optional action buttons,
 * recommendation cards and WhatsApp handoff CTA.
 */
function addMessageToUI(
  role,
  content,
  suggestedActions = null,
  recommendations = null,
  handoff = null,
) {
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
    cardsDiv.innerHTML = recommendations
      .slice(0, 3)
      .map((rec) => {
        const v = rec.vehicle;
        if (!v) return '';
        const price = v.price
          ? new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(v.price)
          : 'Consulte';
        const km = v.mileage ? `${Math.round(v.mileage / 1000)} mil km` : '';
        const reasoning = rec.reasoning
          ? `<p class="chat-rec-reason">${ChatManager.escapeText(rec.reasoning)}</p>`
          : '';
        return `
        <div class="chat-rec-card">
          <div class="chat-rec-info">
            <strong>${ChatManager.escapeText(v.make)} ${ChatManager.escapeText(v.model)} ${ChatManager.escapeText(v.yearModel)}</strong>
            <span class="chat-rec-meta">${km}${km && price ? ' • ' : ''}${price}</span>
            ${reasoning}
          </div>
          <a class="chat-rec-link" href="detalhes-carro.html?id=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">Ver detalhes</a>
        </div>
      `;
      })
      .join('');
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
        .filter((action) => ChatManager.isSupportedAction(action))
        .map(
          (action) => `
          <button class="chat-action-btn" onclick="handleChatAction('${action}')">
            ${ChatManager.getActionLabel(action)}
          </button>
        `,
        )
        .join('');
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
  const whatsappUrl = ChatManager.safeWhatsappUrl(handoff.waLink);
  handoffEl.replaceChildren();
  if (!whatsappUrl) return;

  handoffEl.innerHTML = `
    <a class="chat-whatsapp-btn" href="${ChatManager.escapeText(whatsappUrl)}" target="_blank" rel="noopener noreferrer"
       data-lead-id="${ChatManager.escapeText(handoff.leadId || '')}">
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

  ChatManager.sendMessage(message).catch((error) => {
    console.error('Failed to send message:', error);
  });
}

function handleChatAction(action) {
  const actionsEl = document.getElementById('chat-actions');
  if (actionsEl) actionsEl.innerHTML = '';

  ChatManager.sendAction(action).catch((error) => {
    console.error('Failed to send action:', error);
  });
}

function addChatStyles() {
  if (document.getElementById('chat-styles')) return;

  const styles = document.createElement('link');
  styles.id = 'chat-styles';
  styles.rel = 'stylesheet';
  styles.href = 'chat.css';
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
