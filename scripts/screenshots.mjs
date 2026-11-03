// 주요 장면 스크린샷 (320·375·430 폭). 사용: npm run preview 실행 후 node scripts/screenshots.mjs <outdir> <tag> [reduce]
import { launchChromium, PREVIEW_URL } from './lib/browser.mjs';
import path from 'node:path';
const [out, tag, reduced] = process.argv.slice(2);
const browser = await launchChromium(['--disable-gpu']);
for (const [w, h] of [
  [320, 660],
  [375, 812],
  [430, 932],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    locale: 'ko-KR',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE', m.text());
  });
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `${tag}-${w}-cover.png`) });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += h * 0.6) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  for (const id of ['invitation', 'info', 'gallery', 'location', 'gift']) {
    const ok = await page.evaluate((id) => {
      document.documentElement.style.scrollBehavior = 'auto';
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView();
      return true;
    }, id);
    if (!ok) continue;
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${tag}-${w}-${id}.png`) });
  }
  // 계좌 패널은 접힌 채 렌더링되므로 첫 탭을 열어 두고 찍습니다
  await page.click('[data-action="gift-tab"]').catch(() => {});
  await page.waitForTimeout(200);
  // 달력·지도·계좌처럼 섹션 중간에 있는 요소
  for (const [name, sel] of [
    ['calendar', '.info__cal'],
    ['map', '.location__map-links'],
    ['accounts', '.gift__accounts'],
  ]) {
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    }, sel);
    if (!ok) continue;
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${tag}-${w}-${name}.png`) });
  }
  // 두 번째 썸네일을 눌러 대표 사진이 바뀐 상태
  const swapped = await page
    .click('.gallery__thumbs li:nth-child(2) .gallery__thumb', { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (swapped) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${tag}-${w}-gallery-2.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `${tag}-${w}-full.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('shots done');
