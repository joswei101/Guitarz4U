import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissCookies, humanPause } from './utils';

// Runs first, on a freshly reset database: the shop must be EMPTY at launch.
test.describe('public site (empty shop at launch)', () => {
  test('home page shows a polished empty-stock state, not fake products', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Guitarz4U/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Honest second-hand guitars');
    await expect(page.getByRole('heading', { name: 'New stock is on its way' })).toBeVisible();
    await expect(page.locator('.product-card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'No reviews yet' })).toBeVisible();
    await expect(page.getByRole('link', { name: /WhatsApp us/ }).first()).toHaveAttribute('href', /wa\.me\/27648567019/);
  });

  test('shop shows the restocking message and a notify-me form', async ({ page }) => {
    await page.goto('/shop');
    await dismissCookies(page);
    await expect(page.getByRole('heading', { name: 'The shop is restocking' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'No guitars found' })).toBeVisible();
    await page.locator('#sa-email').fill('alerts@example.test');
    await page.getByLabel('Type of guitar').selectOption('bass');
    await page.getByRole('checkbox', { name: /Email me when matching/ }).check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Notify me' }).click();
    await expect(page.getByText(/We'll email you when a matching guitar is listed/)).toBeVisible();
  });

  test('sold archive and reviews handle having no data', async ({ page }) => {
    await page.goto('/sold');
    await expect(page.getByRole('heading', { name: 'No sold guitars yet' })).toBeVisible();
    await page.goto('/reviews');
    await expect(page.getByRole('heading', { name: 'No reviews yet' })).toBeVisible();
  });

  test('there is no online payment functionality anywhere', async ({ page }) => {
    const banned = /payfast|credit card|card number|cvv|pay now|instant eft|yoco|paystack|stripe/i;
    for (const path of ['/', '/shop', '/cart', '/sell', '/repairs', '/how-it-works', '/legal/terms', '/faq']) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text, `payment wording on ${path}`).not.toMatch(banned);
      await expect(page.locator('input[autocomplete^="cc-"], input[name*="card" i]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /checkout|pay now|pay online/i })).toHaveCount(0);
    }
    await page.goto('/faq');
    await page.getByText('Can I pay on the website?').click();
    await expect(page.getByText(/The website does not take payments/)).toBeVisible();
  });

  test('contact details are correct and no street address is published', async ({ page }) => {
    await page.goto('/contact');
    const body = await page.locator('body').innerText();
    expect(body).toContain('064 856 7019');
    expect(body).toContain('Joshuaweinfas@gmail.com');
    expect(body).toContain('Shuaweinfas');
    expect(body).toContain('Sandringham, Johannesburg');
    expect(body).not.toMatch(/\d+\s+\w+\s+(street|road|avenue|drive)\b/i);
  });

  test('guest can send a contact message', async ({ page }) => {
    await page.goto('/contact');
    await dismissCookies(page);
    await page.getByLabel('Your name').fill('Guest Tester');
    await page.getByLabel('Email').fill('guest@example.test');
    await page.getByLabel('Message').fill('Do you have any left-handed guitars?');
    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('your message has been sent')).toBeVisible();
  });

  test('spam protection: honeypot and instant submissions are rejected', async ({ page }) => {
    await page.goto('/contact');
    await dismissCookies(page);
    await page.getByLabel('Your name').fill('Bot');
    await page.getByLabel('Email').fill('bot@example.test');
    await page.getByLabel('Message').fill('Buy cheap things');
    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await page.getByRole('button', { name: 'Send message' }).click(); // no pause = too fast
    await expect(page.locator('.alert-error')).toContainText('very quick');
    await page.evaluate(() => { (document.querySelector('input[name="website"]') as HTMLInputElement).value = 'spam.example'; });
    await humanPause(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('.alert-error')).toContainText('blocked');
  });

  test('server-side validation explains what is wrong', async ({ page }) => {
    await page.goto('/sell');
    await dismissCookies(page);
    await page.getByLabel('Email').first().fill('not-an-email');
    await humanPause(page);
    await page.getByRole('button', { name: 'Send my guitar details' }).click();
    await expect(page.locator('.alert-error')).toContainText('Please correct the highlighted fields');
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Please confirm this is a guitar, not loose parts.')).toBeVisible();
  });

  test('legal pages are clearly marked as drafts for owner review', async ({ page }) => {
    for (const key of ['privacy', 'terms', 'collection-reservation', 'seller-terms', 'repair-terms', 'returns', 'cookies', 'account-data']) {
      await page.goto(`/legal/${key}`);
      await expect(page.getByRole('note')).toContainText('Draft — awaiting owner review');
    }
    await page.goto('/legal/repair-terms');
    await expect(page.getByText('The repair warranty period has not been set yet.')).toBeVisible();
  });

  test('404 page, robots.txt, sitemap and manifest', async ({ page, request }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'That page is out of tune' })).toBeVisible();
    expect((await page.goto('/shop/no-such-guitar'))?.status()).toBe(404);
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /account');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/shop');
    expect(sitemap).not.toContain('/admin');
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.short_name).toBe('Guitarz4U');
    expect((await request.get('/sw.js')).ok()).toBeTruthy();
    expect((await request.get('/api/health')).ok()).toBeTruthy();
  });

  test('pages have unique titles, descriptions and a canonical URL', async ({ page }) => {
    const titles = new Set<string>();
    for (const path of ['/', '/shop', '/sell', '/repairs', '/about', '/contact', '/faq', '/reviews', '/how-it-works']) {
      await page.goto(path);
      titles.add(await page.title());
      expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
      if (path !== '/') await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
    }
    expect(titles.size).toBe(9);
    await page.goto('/');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)['address']['addressLocality']).toBe('Sandringham, Johannesburg');
  });

  test('security headers are sent', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });
});

test.describe('responsive layouts', () => {
  for (const [name, width, height] of [['mobile', 375, 812], ['tablet', 820, 1180], ['desktop', 1366, 900]] as const) {
    test(`${name}: no horizontal scrolling on key pages`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const path of ['/', '/shop', '/sell', '/repairs', '/reviews', '/about', '/how-it-works', '/faq', '/contact', '/auth/login', '/auth/register', '/legal/privacy', '/cart', '/sold']) {
        await page.goto(path);
        await dismissCookies(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
      }
      await page.goto('/');
      await page.screenshot({ path: `test-results/layout-${name}-home.png`, fullPage: true });
      await page.goto('/sell');
      await page.screenshot({ path: `test-results/layout-${name}-sell.png`, fullPage: false });
    });
  }

  test('mobile menu opens and works with the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dismissCookies(page);
    await page.getByLabel('Menu').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Repairs' }).click();
    await expect(page).toHaveURL(/\/repairs/);
  });
});

test.describe('accessibility (automated axe checks)', () => {
  for (const path of ['/', '/shop', '/sell', '/repairs', '/contact', '/faq', '/auth/login', '/auth/register', '/cart', '/legal/privacy']) {
    test(`${path} has no serious or critical accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await dismissCookies(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }

  test('skip link and visible focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test('crafted links cannot display fake notices', async ({ page }) => {
  await page.goto('/?ok=' + encodeURIComponent('Your account is locked. Call 011 555 1234 now'));
  await expect(page.locator('.alert')).toHaveCount(0);
  await page.goto('/cart?error=' + encodeURIComponent('Pay at https://evil.example'));
  await expect(page.locator('.alert-error')).toHaveCount(0);
  await page.goto('/?ok=' + encodeURIComponent('You have been signed out.'));
  await expect(page.getByRole('status').filter({ hasText: 'You have been signed out.' })).toBeVisible();
});
