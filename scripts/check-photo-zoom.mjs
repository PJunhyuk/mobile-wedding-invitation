/**
 * 사진 영역 확대 방지 검사: 확대는 사진 영역에서만 막고 페이지 전체의 확대는 막지 않아야 합니다.
 * 사진을 누르거나 두 번 눌러도 크기가 그대로인지, 갤러리 선택·쓸어 넘기기와 지도 링크가 그대로 동작하는지도 봅니다.
 * Chromium 검사이므로 실제 Safari 의 핀치나 OS 확대까지 증명하지는 않습니다.
 * 사용: npm run preview 실행 후 node scripts/check-photo-zoom.mjs [url]
 */
import assert from 'node:assert/strict';
import { launchChromium, PREVIEW_URL } from './lib/browser.mjs';
import { venue } from '../src/data/wedding.ts';

const url = process.argv[2] ?? PREVIEW_URL;
const browser = await launchChromium();
try {
  for (const width of [320, 375, 430]) {
    const page = await browser.newPage({
      viewport: { width, height: 812 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    assert.ok(!/user-scalable|maximum-scale/.test(viewport));
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction), 'auto');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).touchAction), 'auto');
    assert.equal(await page.locator('[data-photo-no-zoom]').count(), 5);
    for (const selector of ['.cover__photo', '.feature__frame', '.gallery__featured', '.closing__photo']) {
      const frame = page.locator(selector);
      await frame.scrollIntoViewIfNeeded();
      await frame.locator('img').evaluate((image) => image.decode());
      const before = await frame.boundingBox();
      await frame.hover();
      await frame.click();
      await frame.dblclick();
      const after = await frame.boundingBox();
      assert.equal(before.width, after.width);
      assert.equal(before.height, after.height);
      assert.equal(await frame.locator('img').evaluate((el) => getComputedStyle(el).transform), 'none');
      const gestures = await frame.evaluate((el) =>
        ['dblclick', 'gesturestart', 'gesturechange'].map((type) => {
          const event = new Event(type, { bubbles: true, cancelable: true });
          el.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      );
      assert.deepEqual(gestures, [true, true, true]);
      assert.ok(!(await frame.evaluate((el) => getComputedStyle(el).touchAction)).includes('pinch-zoom'));
    }
    await page.locator('[data-gallery-src]').nth(2).click();
    assert.equal(await page.locator('[data-gallery-src]').nth(2).getAttribute('aria-current'), 'true');
    const frame = page.locator('.gallery__featured');
    await frame.scrollIntoViewIfNeeded();
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.equal(await page.locator('[data-gallery-src]').nth(3).getAttribute('aria-current'), 'true');
    assert.ok(
      (await page.locator('[data-naver-map]').getAttribute('href')).endsWith(`/place/${venue.map.naverPlaceId}`),
    );
    assert.equal(await page.locator(`a[href="${venue.map.kakao}"]`).getAttribute('target'), '_blank');
    assert.deepEqual(errors, []);
    console.log(`${width}: 사진 영역만 확대 방지, 누름 전후 크기 동일, 갤러리 선택·쓸기, 지도 링크 통과`);
    await page.close();
  }
} finally {
  await browser.close();
}
