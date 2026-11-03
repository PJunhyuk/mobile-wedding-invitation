/**
 * 브라우저 검사 스크립트가 함께 쓰는 Chromium 실행기 (playwright-core 는 브라우저를 내려받지 않습니다).
 * 실행 파일은 이 순서로 찾습니다.
 *  1. PLAYWRIGHT_CHROME 환경변수
 *  2. playwright 가 내려받아 둔 Chromium (`npx playwright install chromium` 을 한 번 실행하면 생깁니다)
 *  3. OS 별 Google Chrome·Chromium 의 흔한 설치 위치
 * 리눅스에서 시스템 라이브러리가 없으면 LD_LIBRARY_PATH 가 필요할 수 있습니다.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
const systemChrome = {
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  ],
  win32: [
    `${process.env['PROGRAMFILES'] ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  ],
}[process.platform] ?? [];

const bundled = (() => {
  try {
    return chromium.executablePath();
  } catch {
    return '';
  }
})();

/* 직접 지정한 경로가 틀렸으면 다른 브라우저로 조용히 넘어가지 않고 멈춥니다 */
if (process.env.PLAYWRIGHT_CHROME && !existsSync(process.env.PLAYWRIGHT_CHROME)) {
  throw new Error(`PLAYWRIGHT_CHROME=${process.env.PLAYWRIGHT_CHROME} 에 실행 파일이 없습니다`);
}
const candidates = [process.env.PLAYWRIGHT_CHROME, bundled, ...systemChrome].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  throw new Error(
    `Chromium 실행 파일을 찾지 못했습니다. PLAYWRIGHT_CHROME=<경로> 로 지정하거나 \`npx playwright install chromium\` 을 실행하세요.\n찾아본 곳: ${candidates.join(', ')}`,
  );
}

export const launchChromium = (args = []) => chromium.launch({ executablePath, args: ['--no-sandbox', ...args] });

/** 검사 대상 주소 — 기본값은 `npm run preview` 서버 */
export const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/';
