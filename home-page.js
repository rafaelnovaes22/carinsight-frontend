/**
 * CarInsight Home Page Integration
 * Additional functionality for index.html
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🏠 Home Page integration loaded');

  // Update favorites count in menu if exists
  updateFavoritesCount();

  // Add general chat button to header if not exists
  addChatButton();

  // Listen for auth changes
  window.addEventListener('authChange', (e) => {
    console.log('Auth changed:', e.detail);
    updateFavoritesCount();
  });
});

/**
 * Update favorites count badge in sidebar menu
 */
function updateFavoritesCount() {
  if (!window.FavoritesManager) return;

  const count = FavoritesManager.getCount();
  const savedLink = document.querySelector('.sidebar-links a[href="meus-salvos.html"]');
  
  if (savedLink && count > 0) {
    // Check if badge already exists
    let badge = savedLink.querySelector('.favorites-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'favorites-badge';
      badge.style.cssText = 'background:#667eea;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;';
      savedLink.appendChild(badge);
    }
    badge.textContent = count;
  }
}

/**
 * Add floating chat button to page
 */
function addChatButton() {
  // Check if button already exists
  if (document.getElementById('floating-chat-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'floating-chat-btn';
  btn.innerHTML = '<i data-lucide="message-circle"></i>';
  btn.title = 'Falar com assistente';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.5)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
  });

  btn.addEventListener('click', () => {
    openGeneralChat();
  });

  document.body.appendChild(btn);

  if (window.lucide) lucide.createIcons();
}

/**
 * Open general chat (without specific vehicle)
 */
function openGeneralChat() {
  if (!window.ChatManager) {
    console.error('ChatManager not loaded');
    return;
  }

  ChatManager.init(null) // null = general chat
    .then((response) => {
      console.log('✅ General chat initialized:', response);
      if (window.showChatUI) {
        showChatUI(response.greeting, null);
      }
    })
    .catch((error) => {
      console.error('❌ Failed to start chat:', error);
      alert('Erro ao iniciar conversa. Tente novamente.');
    });
}

// Expose globally
window.openGeneralChat = openGeneralChat;
