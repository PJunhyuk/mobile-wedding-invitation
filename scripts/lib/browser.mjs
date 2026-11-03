/**
 * 브라우저 검사 스크립트가 함께 쓰는 Chromium 실행기 (playwright-core 는 브라우저를 내려받지 않습니다).
 * PLAYWRIGHT_CHROME 으로 실행 파일 경로를 바꿀 수 있고, 시스템 라이브러리가 없으면 LD_LIBRARY_PATH 가 필요합니다.
 */
import { chromium } from 'playwright-core';

const executablePath =
  process.env.PLAYWRIGHT_CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1187/chrome-linux/chrome`;

export const launchChromium = (args = []) => chromium.launch({ executablePath, args: ['--no-sandbox', ...args] });

/** 검사 대상 주소 — 기본값은 `npm run preview` 서버 */
export const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/';
