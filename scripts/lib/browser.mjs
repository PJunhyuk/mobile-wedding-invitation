/**
 * 브라우저 검사 스크립트가 함께 쓰는 Chromium 실행기 (playwright-core 는 브라우저를 내려받지 않습니다).
 * 실행 파일은 이 순서로 찾습니다.
 *  1. PLAYWRIGHT_CHROME 환경변수 (지정했는데 없으면 다른 브라우저로 넘어가지 않고 멈춥니다)
 *  2. playwright 가 내려받아 둔 Chromium (`npx playwright install chromium` 을 한 번 실행하면 생깁니다)
 *  3. OS 에 설치된 Google Chrome (playwright 의 channel: 'chrome' — 리눅스·맥·윈도우의 기본 설치 위치)
 * 리눅스에서 시스템 라이브러리가 없으면 LD_LIBRARY_PATH 가 필요할 수 있습니다.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const explicit = process.env.PLAYWRIGHT_CHROME;
if (explicit && !existsSync(explicit)) throw new Error(`PLAYWRIGHT_CHROME=${explicit} 에 실행 파일이 없습니다`);

const bundled = (() => {
  try {
    return chromium.executablePath();
  } catch {
    return '';
  }
})();
const executablePath = explicit || (existsSync(bundled) ? bundled : undefined);

export async function launchChromium(args = []) {
  try {
    return await chromium.launch({ ...(executablePath ? { executablePath } : { channel: 'chrome' }), args: ['--no-sandbox', ...args] });
  } catch (error) {
    throw new Error(
      `Chromium 을 실행하지 못했습니다. PLAYWRIGHT_CHROME=<경로> 로 지정하거나 \`npx playwright install chromium\` 을 실행하세요.\n${error.message}`,
    );
  }
}

/** 검사 대상 주소 — 첫 인자, 없으면 PREVIEW_URL, 없으면 `npm run preview` 서버 */
export const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/';
export const targetUrl = () => process.argv[2] ?? PREVIEW_URL;

/** 검사하는 폰 화면 크기 (CSS px) — 작은 폰, 흔한 폰, 큰 폰 */
export const PHONES = [
  [320, 660],
  [375, 812],
  [430, 932],
];
export const DEFAULT_PHONE = { width: 375, height: 812 };
