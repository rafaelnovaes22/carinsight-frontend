import { expect, test } from '@playwright/test';

test('missing vehicle links never show an example listing', async ({ page }) => {
  await page.goto('/detalhes-carro.html');
  await expect(
    page.getByRole('heading', { name: 'Escolha um veículo para consultar' }),
  ).toBeVisible();
  await expect(page.locator('#vehicle-details')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('Corolla');
  await expect(page.locator('body')).not.toContainText('158.900');
});

test('failed lookups provide a way back to the reference catalog', async ({ page }) => {
  await page.route('**/localhost:3000/vehicles/missing', (route) =>
    route.fulfill({ status: 404, body: '{}' }),
  );
  await page.goto('/detalhes-carro.html?id=missing');
  await expect(page.getByRole('heading', { name: 'Veículo indisponível' })).toBeVisible();
  await expect(page.locator('#vehicle-details')).toBeHidden();
  await expect(page.locator('#detail-status a')).toHaveAttribute('href', 'index.html#catalog');
});

test('vehicle fields cannot inject HTML and absent facts stay absent', async ({ page }) => {
  const malicious = '<img src=x data-xss onerror="alert(1)">';
  await page.route('**/localhost:3000/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'safe',
        make: 'Marca',
        model: malicious,
        mileage: 0,
        technicalSpecs: { engine: malicious },
        features: [malicious],
        media: [{ type: 'IMAGE', url: 'javascript:alert(1)' }],
      }),
    }),
  );
  await page.goto('/detalhes-carro.html?id=safe');
  await expect(page.locator('.vehicle-header')).toContainText(malicious);
  await expect(page.locator('.features-chips')).toContainText(malicious);
  await expect(page.locator('[data-xss]')).toHaveCount(0);
  await expect(page.locator('#vehicle-gallery img')).toHaveCount(0);
  await expect(page.locator('#vehicle-gallery')).toContainText('Fotos não informadas');
  await expect(page.locator('.price-tag-large')).toContainText('Preço não informado');
  await expect(page.locator('.specs-list-grid')).toContainText('0 km');
  await expect(page.locator('.dealer-name')).toContainText('Anunciante não informado');
});
