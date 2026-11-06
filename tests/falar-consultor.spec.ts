import { test, expect, Page } from '@playwright/test';

/**
 * Formulário de /falar-consultor: o lead segue para o WhatsApp da loja com os dados preenchidos.
 * window.open é interceptado, então nada é aberto nem enviado de verdade.
 */

const STORE_LINK = 'https://wa.me/5511949105033';

async function openPage(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { openedUrls: string[] }).openedUrls = [];
    window.open = ((url: string) => {
      (window as unknown as { openedUrls: string[] }).openedUrls.push(url);
      return null;
    }) as typeof window.open;
  });
  await page.goto('/falar-consultor.html');
}

const openedUrls = (page: Page) =>
  page.evaluate(() => (window as unknown as { openedUrls: string[] }).openedUrls);

test('botão direto aponta para o WhatsApp da loja', async ({ page }) => {
  await openPage(page);
  await expect(page.locator('a.btn-whatsapp-direct')).toHaveAttribute('href', STORE_LINK);
});

test('envio abre o WhatsApp da loja com os dados do formulário', async ({ page }) => {
  await openPage(page);
  await page.fill('#client-name', 'João & Silva');
  await page.fill('#client-phone', '(11) 91234-5678');
  await page.fill('#client-email', 'joao@example.com');
  await page.selectOption('#interest-car', 'suv');
  await page.fill('#client-message', 'Quero financiar?');
  await page.click('#consultant-form button[type="submit"]');

  const urls = await openedUrls(page);
  expect(urls).toHaveLength(1);
  const url = new URL(urls[0]);
  expect(url.origin + url.pathname).toBe(STORE_LINK);
  expect(url.searchParams.get('text')).toBe(
    [
      'Olá! Vim do site CarInsight e gostaria de atendimento.',
      'Nome: João & Silva',
      'WhatsApp: (11) 91234-5678',
      'E-mail: joao@example.com',
      'Interesse: SUV',
      'Mensagem: Quero financiar?',
    ].join('\n')
  );

  await expect(page.locator('#form-feedback')).toBeVisible();
  await expect(page.locator('#form-feedback-link')).toHaveAttribute('href', urls[0]);
});

test('campos opcionais vazios ficam fora da mensagem', async ({ page }) => {
  await openPage(page);
  await page.fill('#client-name', 'Ana');
  await page.fill('#client-phone', '11912345678');
  await page.fill('#client-email', 'ana@example.com');
  await page.click('#consultant-form button[type="submit"]');

  const text = new URL((await openedUrls(page))[0]).searchParams.get('text');
  expect(text).not.toContain('Interesse:');
  expect(text).not.toContain('Mensagem:');
});

test('campos obrigatórios vazios não abrem o WhatsApp', async ({ page }) => {
  await openPage(page);
  await page.click('#consultant-form button[type="submit"]');

  expect(await openedUrls(page)).toHaveLength(0);
  await expect(page.locator('#form-feedback')).toBeHidden();
});
