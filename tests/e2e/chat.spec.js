import { test, expect } from '@playwright/test';

test.describe('Pruebas E2E - Chat UNA', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof jQuery !== 'undefined' && typeof io !== 'undefined');
  });

  test('debe renderizar una imagen cuando se envia una URL de imagen', async ({ page }) => {
    await page.fill('#nombre', 'Tester');
    await page.fill('#m', 'https://example.com/foto.jpg');
    await page.click('button');

    const img = page.locator('#messages img');
    await expect(img).toBeVisible({ timeout: 10000 });
    await expect(img).toHaveAttribute('src', /foto\.jpg/);
  });

  test('debe renderizar un video de YouTube cuando se envia una URL de YouTube', async ({ page }) => {
    await page.fill('#nombre', 'Tester');
    await page.fill('#m', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.click('button');

    const iframe = page.locator('#messages iframe');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    await expect(iframe).toHaveAttribute('src', /youtube\.com\/embed\/dQw4w9WgXcQ/);
  });

  test('debe sanitizar un script malicioso sin mostrar alert', async ({ page }) => {
    let dialogAppeared = false;
    page.on('dialog', async dialog => {
      dialogAppeared = true;
      await dialog.dismiss();
    });

    await page.fill('#nombre', 'Atacante');
    await page.fill('#m', '<script>alert("xss")</script>');
    await page.click('button');

    await page.waitForTimeout(2000);

    expect(dialogAppeared).toBe(false);

    const lastMessage = page.locator('#messages li').last();
    await expect(lastMessage).toBeVisible();
    const html = await lastMessage.innerHTML();
    expect(html).not.toContain('<script>');
  });

});
