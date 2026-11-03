/**
 * 사진 프레임 검사: 모든 사진이 잘림도 안쪽 여백도 없이 원본 비율 그대로 보여야 합니다.
 * 표지·대표·맺음말 사진과 갤러리 전 장(대표 자리 + 썸네일)을 세 가지 폰 크기에서 확인합니다.
 * 사용: npm run preview 실행 후 node scripts/check-photo-framing.mjs [url] [스크린샷 폴더]
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { launchChromium, targetUrl, PHONES } from './lib/browser.mjs';
import { loadSource } from './lib/source.mjs';

const [{ photos }] = await loadSource('/src/data/wedding.ts');

const url = targetUrl();
const out = process.argv[3];
if (out) await mkdir(out, { recursive: true });

/** 브라우저 안에서 실행: 사진이 프레임(부모)에 꼭 맞고 화면 안에 다 들어오는지 잽니다. */
const measure = async (image) => {
  await image.decode();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const box = image.getBoundingClientRect();
  const frame = image.parentElement.getBoundingClientRect();
  return {
    fit: getComputedStyle(image).objectFit,
    radius: getComputedStyle(image.parentElement).borderRadius,
    loaded: image.naturalWidth > 0 && image.naturalHeight > 0,
    // 프레임과 크기가 같고 비율이 원본과 같으면 잘림도 여백도 없습니다
    snug: Math.abs(frame.width - box.width) < 1 && Math.abs(frame.height - box.height) < 1,
    ratio: Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight) < 0.002,
    inViewport: box.left >= -0.5 && box.top >= -0.5 && box.right <= innerWidth + 0.5 && box.bottom <= innerHeight + 0.5,
  };
};
const FULL = { fit: 'contain', radius: '0px', loaded: true, snug: true, ratio: true, inViewport: true };

const browser = await launchChromium();
try {
  for (const [width, height] of PHONES) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });

    for (const name of ['cover', 'feature', 'closing']) {
      await page.locator(`#${name}`).evaluate((scene) => scene.scrollIntoView({ behavior: 'instant' }));
      assert.deepEqual(await page.locator(`#${name} img`).evaluate(measure), FULL, `${width}: ${name}`);
      if (out) await page.screenshot({ path: `${out}/${width}-${name}.png` });
    }

    const thumbs = page.locator('[data-gallery-src]');
    assert.equal(await thumbs.count(), photos.gallery.length);
    await page.locator('#gallery').evaluate((scene) => scene.scrollIntoView({ behavior: 'instant' }));
    for (let index = 0; index < photos.gallery.length; index++) {
      const label = `${width}: gallery ${index + 1}`;
      const thumb = thumbs.nth(index);
      await thumb.evaluate((button) => {
        button.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
        button.click();
      });
      assert.deepEqual(await page.locator('.gallery__featured-img').evaluate(measure), FULL, label);
      assert.deepEqual(await thumb.locator('img').evaluate(measure), FULL, `${label} (thumb)`);
      if (out) await page.screenshot({ path: `${out}/${width}-gallery-${String(index + 1).padStart(2, '0')}.png` });
    }

    assert.deepEqual(errors, []);
    console.log(`${width}x${height}: 표지·대표·맺음말 + 갤러리 ${photos.gallery.length}장(원본·썸네일) 통과`);
    await page.close();
  }
} finally {
  await browser.close();
}
