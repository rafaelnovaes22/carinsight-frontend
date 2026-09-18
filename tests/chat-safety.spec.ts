import { expect, test, type Page } from '@playwright/test';

const maliciousText = '<img src=x data-xss onerror="alert(1)">';

async function mockConversation(page: Page): Promise<void> {
  await page.route('**/localhost:3000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let response: object = {};
    if (path === '/vehicles/security-car')
      response = {
        id: 'security-car',
        make: 'Teste',
        model: 'Seguro',
        price: 50000,
        yearModel: 2023,
        mileage: 10000,
        media: [],
      };
    if (path === '/api/chat/start')
      response = { sessionId: 'security-session', greeting: maliciousText };
    if (path.endsWith('/message'))
      response = {
        response: maliciousText,
        recommendations: [
          {
            reasoning: maliciousText,
            vehicle: {
              id: 'safe',
              make: maliciousText,
              model: 'Seguro',
              yearModel: 2023,
              price: 50000,
            },
          },
        ],
        suggestedActions: ["');alert(1);//"],
        handoff: { waLink: 'javascript:alert(1)' },
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test('conversation renders external content as text and rejects executable links', async ({
  page,
}) => {
  await mockConversation(page);
  await page.goto('/detalhes-carro.html?id=security-car');
  await page.locator('.btn-card-action-whats').click();
  await expect(page.locator('#chat-messages')).toContainText(maliciousText);
  await page.getByLabel('Mensagem para o assistente').fill('Quero comparar');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.locator('.chat-rec-card')).toContainText(maliciousText);
  await expect(page.locator('#chat-modal [data-xss]')).toHaveCount(0);
  await expect(page.locator('.chat-whatsapp-btn')).toHaveCount(0);
  await expect(page.locator('.chat-action-btn')).toHaveCount(0);
});

test('conversation supports closing with Escape and restores keyboard focus', async ({ page }) => {
  await mockConversation(page);
  await page.goto('/detalhes-carro.html?id=security-car');
  const trigger = page.locator('.btn-card-action-whats');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Assistente CarInsight' })).toBeVisible();
  await page.getByLabel('Mensagem para o assistente').press('Escape');
  await expect(page.locator('#chat-modal')).toBeHidden();
  await expect(trigger).toBeFocused();
});
