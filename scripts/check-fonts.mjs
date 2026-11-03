/**
 * 글꼴 검사: 화면의 글자마다 CSS 가 실제로 고른 글꼴(명조·고딕)의 서브셋에 그 글자가 있어야 합니다.
 * check:content 는 "명조로 나가는 글자"를 데이터에서 짐작하지만, 어느 요소가 명조인지는 CSS 가 정하므로
 * 여기서는 브라우저가 계산한 font-family 로 확인합니다. 빠진 글자는 시스템 글꼴로 대체되어 티가 납니다.
 * 사용: npm run preview 실행 후 node scripts/check-fonts.mjs [url]
 */
import * as fontkit from 'fontkit';
import { launchChromium, targetUrl, DEFAULT_PHONE } from './lib/browser.mjs';
import { FONT_FILES } from './lib/site-text.mjs';

const url = targetUrl();
const browser = await launchChromium();
let used;
try {
  const page = await browser.newPage({ viewport: DEFAULT_PHONE });
  await page.goto(url, { waitUntil: 'networkidle' });
  /* 접힌 계좌 패널의 글자도 포함하도록 textContent 를 그대로 읽습니다 */
  used = await page.evaluate(() => {
    const byFamily = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      /* 낭독기 전용 글자(.visually-hidden)는 그려지지 않으므로 어느 글꼴이든 상관없습니다 */
      if (!parent || parent.closest('script, style, .visually-hidden')) continue;
      const family = getComputedStyle(parent).fontFamily.split(',')[0].replace(/["']/g, '').trim();
      byFamily[family] = (byFamily[family] ?? '') + node.textContent;
    }
    return byFamily;
  });
} finally {
  await browser.close();
}

const problems = [];
for (const [family, text] of Object.entries(used)) {
  const file = FONT_FILES.find((f) => f.family === family);
  if (!file) {
    problems.push(`서브셋이 없는 글꼴로 조판된 글자가 있습니다: ${family}`);
    continue;
  }
  const font = fontkit.openSync(file.out);
  const missing = [...new Set(text)].filter((c) => c.trim() !== '' && !font.hasGlyphForCodePoint(c.codePointAt(0)));
  if (missing.length > 0) problems.push(`${file.out} 에 없는 글자 ${missing.length}자: ${missing.join(' ')}`);
}

if (problems.length > 0) {
  console.error('fonts check 실패:');
  for (const p of problems) console.error(` - ${p}`);
  console.error('   → scripts/lib/site-text.mjs 의 글자 모음을 확인하고 npm run fonts 를 다시 실행하세요');
  process.exit(1);
}
console.log(
  `fonts check 통과: ${Object.entries(used)
    .map(([family, text]) => `${family} ${new Set(text.replace(/\s/g, '')).size}자`)
    .join(', ')}`,
);
