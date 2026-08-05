import { test, expect } from '@playwright/test';

test.describe('ASCII / Glitch — интерфейс', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('страница на русском и бренд виден', async ({ page }) => {
    await expect(page.locator('#бренд')).toHaveText('ASCII / GLITCH');
    await expect(page.getByRole('heading', { name: 'Видеофильтр' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Включить камеру' })).toBeVisible();
    await expect(page.getByText('Камера не подключена')).toBeVisible();
  });

  test('переключение режима Матрица / Глитч', async ({ page }) => {
    await page.getByRole('radio', { name: 'Глитч' }).click();
    await expect(page.locator('#бейдж-режима')).toHaveText('Киберпанк');
    await expect(page.getByRole('radio', { name: 'Глитч' })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('radio', { name: 'Матрица' }).click();
    await expect(page.locator('#бейдж-режима')).toHaveText('Матрица');
  });

  test('ползунок силы эффекта обновляет значение', async ({ page }) => {
    const слайдер = page.locator('#сила-эффекта');
    await слайдер.fill('75');
    await expect(page.locator('#сила-значение')).toHaveText('75');
    await expect(слайдер).toHaveAttribute('aria-valuenow', '75');
  });

  test('выбор формата записи', async ({ page }) => {
    await page.locator('#формат-записи').selectOption('gif');
    await expect(page.locator('#формат-записи')).toHaveValue('gif');
  });

  test('кнопки стоп/запись/скачать изначально корректны', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Остановить камеру' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Начать запись' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Скачать запись' })).toBeDisabled();
  });

  test('свайп мышью меняет режим', async ({ page }) => {
    const зона = page.locator('#зона-свайпа');
    const box = await зона.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    // Свайп вправо → глитч
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 40, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('#бейдж-режима')).toHaveText('Киберпанк');

    // Свайп влево → матрица
    await page.mouse.move(box.x + box.width - 40, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('#бейдж-режима')).toHaveText('Матрица');
  });

  test('ошибка камеры показывается на русском без устройств', async ({ page, context }) => {
    await context.grantPermissions([]);
    // Блокируем getUserMedia
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        get() {
          return {
            getUserMedia: () =>
              Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
          };
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Включить камеру' }).click();
    await expect(page.locator('#тост')).toBeVisible();
    await expect(page.locator('#тост')).toContainText(/камер|доступ|запрещ/i);
  });

  test('адаптив 320px — панель и холст видны', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await expect(page.locator('#холст-вывода')).toBeVisible();
    await expect(page.locator('.панель')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Включить камеру' })).toBeVisible();
  });

  test('в UI нет типичных английских кнопок', async ({ page }) => {
    const текст = await page.locator('body').innerText();
    expect(текст).not.toMatch(/\bStart\b/);
    expect(текст).not.toMatch(/\bStop\b/);
    expect(текст).not.toMatch(/\bDownload\b/);
    expect(текст).not.toMatch(/\bRecord\b/);
    expect(текст).not.toMatch(/\bSettings\b/);
  });
});
