import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const chatSource = await readFile(new URL('../chat.js', import.meta.url), 'utf8');

/** @param {object} api @returns {object} */
function loadChat(api = {}) {
  const context = {
    window: {},
    URL,
    console: { log() {}, warn() {}, error() {} },
    CarInsightAPI: api,
  };
  vm.runInNewContext(chatSource, context);
  return context.window.ChatManager;
}

test('treats user and model HTML as text while keeping supported formatting', () => {
  const chat = loadChat();
  const message = chat.formatMessage('<img src=x onerror="alert(1)"> *orçamento*\n_ok_');
  assert.ok(!message.includes('<img'));
  assert.ok(message.includes('&lt;img'));
  assert.ok(message.includes('<strong>orçamento</strong><br><em>ok</em>'));
});

test('only opens genuine HTTPS WhatsApp destinations', () => {
  const chat = loadChat();
  for (const candidate of [
    'javascript:alert(1)',
    'https://wa.me.evil.test/5511999999999',
    'https://user@wa.me/5511999999999',
    'http://wa.me/5511999999999',
    'https://wa.me/invalid',
  ]) {
    assert.equal(chat.safeWhatsappUrl(candidate), null);
  }
  assert.equal(
    chat.safeWhatsappUrl('https://wa.me/5511999999999?text=Oi'),
    'https://wa.me/5511999999999?text=Oi',
  );
});

test('does not render arbitrary action names as executable buttons', () => {
  const chat = loadChat();
  assert.equal(chat.isSupportedAction("');alert(1);//"), false);
  assert.equal(chat.isSupportedAction('SHOW_DETAILS'), true);
});

test('restored chat returns a usable greeting without creating a new session', async () => {
  const chat = loadChat({
    getChatSessionId: () => 'existing-session',
    getChatState: async () => ({ profile: { budget: 70000 } }),
    startChat: () => assert.fail('must preserve existing session'),
  });
  const restored = await chat.init();
  assert.equal(restored.sessionId, 'existing-session');
  assert.equal(restored.restored, true);
  assert.match(restored.greeting, /continuar/);
});
