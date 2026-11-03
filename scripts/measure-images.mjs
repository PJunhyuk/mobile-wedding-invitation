/**
 * 사진 로딩 측정 (검사가 아니라 수치만 출력): 느린 폰 조건(1.6Mbps · RTT 150ms · CPU 4배)의 모바일 Chromium 에서
 * 첫 방문(cold)과 재방문(warm)의 리소스 요청·응답 시각, 표지 LCP, 갤러리 사진을 고른 뒤 디코딩이 끝나기까지의 시간을 JSON 으로 냅니다.
 * 실기기 측정이 아니고, warm 결과는 서버의 캐시 헤더에 따라 달라집니다.
 * 사용: node scripts/measure-images.mjs [url]
 */
import { launchChromium, targetUrl, DEFAULT_PHONE } from './lib/browser.mjs';

const url = targetUrl();
const browser = await launchChromium();
const context = await browser.newContext({
  viewport: DEFAULT_PHONE,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on('pageerror', (e) => {
  throw e;
});
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 150,
  downloadThroughput: 200000,
  uploadThroughput: 100000,
  connectionType: 'cellular4g',
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  window.imageLab = { render: 0, lcp: 0 };
  new MutationObserver(() => {
    if (!window.imageLab.render && document.querySelector('.cover__img')) window.imageLab.render = performance.now();
  }).observe(document, { subtree: true, childList: true });
  new PerformanceObserver((list) => {
    window.imageLab.lcp = list.getEntries().at(-1).startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
});
for (const cache of ['cold', 'warm']) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const initial = await page.evaluate(() => ({
    ...window.imageLab,
    resources: performance
      .getEntriesByType('resource')
      .filter((r) => /webp|\.js/.test(r.name))
      .map((r) => ({
        name: r.name.split('/').slice(-2).join('/'),
        start: Math.round(r.startTime),
        end: Math.round(r.responseEnd),
        bytes: r.transferSize,
      })),
  }));
  // 청첩장을 읽어 내려오듯 앞 장면을 거쳐 갤러리에 들어갑니다
  await page.evaluate(() => document.querySelector('#info').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(1500);
  const choices = [];
  for (const index of [1, 2, 8, 1]) {
    choices.push(
      await page.evaluate(async (index) => {
        const button = document.querySelectorAll('[data-action="gallery-select"]')[index];
        const url = new URL(button.dataset.gallerySrc, location.href).href;
        const before = performance.getEntriesByName(url).at(-1);
        const start = performance.now();
        button.click();
        const img = document.querySelector('.gallery__featured-img');
        await img.decode();
        const decoded = performance.now();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const resource = performance.getEntriesByName(url).at(-1);
        return {
          index: index + 1,
          prepared: !!before,
          requestRelativeMs: resource ? Math.round(resource.startTime - start) : null,
          responseRelativeMs: resource ? Math.round(resource.responseEnd - start) : null,
          decodeReadyMs: Math.round(decoded - start),
          paintOpportunityMs: Math.round(performance.now() - start),
        };
      }, index),
    );
    await page.waitForTimeout(1500);
  }
  console.log(JSON.stringify({ cache, initial, choices }));
}
await browser.close();
