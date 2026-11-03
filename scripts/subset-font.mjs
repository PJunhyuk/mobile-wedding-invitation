/**
 * 화면 글꼴 서브셋 생성 스크립트.
 * 화면에 나오는 글자(scripts/lib/site-text.mjs 가 모읍니다)만 남깁니다. 명조는 명조로 조판되는 글자만 남깁니다.
 * 문구를 바꾸거나 새 글자를 추가했으면 반드시 다시 실행하세요 — 서브셋에 없는 글자는 시스템 글꼴로 대체돼 티가 납니다.
 *
 *   node scripts/subset-font.mjs [--broad] <PretendardVariable.woff2 원본> <GowunBatang-Regular.ttf 원본>
 *
 * --broad: 화면 글자에 KS X 1001 한글 2,350자를 더합니다 (두 글꼴 모두). 저장소의 기본 서브셋이 이 모드로 만든 것이라
 *          이름·문구를 바꿔도 대개 그대로 나옵니다. 용량을 줄이려면 --broad 없이 다시 만드세요 (수십 KB 대).
 *
 * 원본 내려받는 곳
 *   Pretendard  https://github.com/orioncactus/pretendard 릴리스의 web/variable/woff2/PretendardVariable.woff2
 *   Gowun Batang  https://github.com/google/fonts 의 ofl/gowunbatang/GowunBatang-Regular.ttf (OFL)
 *
 * 두 글꼴 모두 src/fonts/ 로 나갑니다. public/ 이 아니라 src/ 인 이유는
 * 빌드가 파일명에 내용 해시를 붙여야 서브셋을 새로 만들었을 때 재방문자에게도 전달되기 때문입니다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';
import { siteChars, serifChars, ksx1001Hangul, FONT_FILES } from './lib/site-text.mjs';
import { loadSource } from './lib/source.mjs';

const broad = process.argv.includes('--broad');
const sources = process.argv.slice(2).filter((a) => a !== '--broad');
const fonts = FONT_FILES.map((f, i) => ({ ...f, src: sources[i] }));

if (fonts.some((f) => !f.src)) {
  console.error('사용법: node scripts/subset-font.mjs [--broad] <PretendardVariable.woff2 원본> <GowunBatang-Regular.ttf 원본>');
  process.exit(1);
}

/* 인자를 바꿔 넣으면 사이트 전체가 엉뚱한 글꼴로 나가는데, @font-face 이름은 CSS 가 정하므로
   화면만 보고는 알아채기 어렵습니다. 원본의 글꼴 이름으로 먼저 확인합니다. */
for (const font of fonts) {
  const family = fontkit.openSync(font.src).familyName ?? '';
  if (!family.startsWith(font.family)) {
    console.error(`인자 순서를 확인하세요: ${font.src} 의 글꼴 이름은 '${family}' 인데 ${font.name} 자리에 있습니다.`);
    process.exit(1);
  }
}

const extra = broad ? ksx1001Hangul() : [];
const all = [...new Set([...(await siteChars()), ...extra])].join('');
const [{ invitation }] = await loadSource('/src/data/wedding.ts');
const serif = [...new Set([...serifChars(invitation), ...extra])].join('');

/* 두 서브셋을 모두 만든 뒤에 씁니다 — 중간에 실패해도 src/fonts/ 가 반쪽만 갱신되지 않습니다 */
const built = await Promise.all(
  fonts.map(async (font) => {
    const src = await readFile(font.src);
    const chars = font.serifOnly ? serif : all;
    const out = await subsetFont(src, chars, { targetFormat: 'woff2', variationAxes: font.axes });
    return { font, src, out, count: [...chars].length };
  }),
);

for (const { font, src, out, count } of built) {
  await writeFile(font.out, out);
  console.log(`${font.out}: ${count}자, ${(src.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB`);
}
