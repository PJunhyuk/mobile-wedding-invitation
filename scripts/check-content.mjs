/**
 * 데이터·자산 정합성 검사 (`npm run check` 에 포함).
 *  1. 폰트: 화면에 그려지는 글자가 전부 Pretendard 서브셋에, 명조로 조판되는 글자가 전부 Gowun Batang 서브셋에
 *     있어야 합니다. 없으면 `npm run fonts` 안내와 함께 실패. (어느 글자가 실제로 명조로 그려지는지는 check:fonts 가 브라우저에서 확인)
 *  2. 사진: wedding.ts 가 참조하는 모든 사진에 원본과 썸네일 파일이 있어야 하고, 반대로 public/images 의 모든 파일이 참조되어야 합니다
 *     (교체한 옛 사진이 남아 있으면 배포본에 그대로 실립니다).
 *  3. 경로: 화면의 사진 주소가 / 로 시작해야 합니다 (서버가 모르는 주소에도 이 페이지를 돌려주므로).
 *
 * 필요한 글자는 서브셋 생성기가 쓰는 siteChars() 가 아니라 renderApp() 이 실제로 만든 마크업에서 뽑습니다.
 * 같은 함수를 쓰면 "생성기가 자기 자신과 일치하는지"만 검사하게 되어,
 * 생성기가 글자를 놓치면 검사도 같이 놓칩니다.
 */
import { readFile, readdir } from 'node:fs/promises';
import * as fontkit from 'fontkit';
import { literalText, serifChars, SCREEN_SYMBOLS, FONT_FILES } from './lib/site-text.mjs';
import { loadSource } from './lib/source.mjs';

const problems = [];

/* 프로젝트의 해석기(vite)로 렌더러와 데이터를 그대로 불러옵니다 — 빌드와 같은 결과를 봅니다 */
const [{ renderApp }, { photos, invitation }, { unescapeHtml: decode }] = await loadSource(
  '/src/render.ts',
  '/src/data/wedding.ts',
  '/src/lib/dom.ts',
);
const html = renderApp();

const painted = [
  decode(html.replace(/<[^>]*>/g, '\n')), // 화면에 그려지는 글
  // 사진을 못 받았을 때 자리에 뜨는 대체 글, 복사 버튼이 띄우는 토스트 문구
  ...[...html.matchAll(/\b(?:alt|data-toast)="([^"]*)"/g)].map((m) => decode(m[1])),
  // 실행 중에만 나오는 문구 (공유·복사 토스트) — main.ts 는 브라우저 전용이라 문자열만 훑습니다
  literalText(await readFile('src/main.ts', 'utf8')),
].join('\n');

// 1. 폰트 커버리지
const symbols = new Set(SCREEN_SYMBOLS);
const required = [...new Set([...painted])].filter((c) => /[가-힣]|[\x20-\x7e]/.test(c) || symbols.has(c));
const serif = serifChars(invitation);
for (const { out, serifOnly } of FONT_FILES) {
  const font = fontkit.openSync(out);
  const missing = (serifOnly ? serif : required).filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
  if (missing.length > 0) {
    problems.push(`${out} 에 없는 글자 ${missing.length}자: ${missing.join(' ')}\n   → npm run fonts -- <Pretendard 원본> <GowunBatang 원본>`);
  }
}

// 2. 사진 데이터 — wedding.ts 가 참조하는 파일은 있어야 하고, 폴더의 파일은 전부 참조되어야 합니다
const all = Object.values(photos).flat();
const referenced = new Set(all.flatMap((photo) => [photo.src, photo.thumb]).filter(Boolean));
const existing = new Set();
for (const dir of ['/images', '/images/thumbs']) {
  for (const name of await readdir(`public${dir}`)) existing.add(`${dir}/${name}`);
}
for (const file of referenced) if (!existing.has(file)) problems.push(`파일 없음: ${file}`);
for (const file of existing) {
  if (file.endsWith('.webp') && !referenced.has(file)) problems.push(`쓰지 않는 파일: public${file} — 지우거나 wedding.ts 에 넣으세요`);
}

// 3. 경로: 서버가 모르는 주소(/foo/ 등)에도 이 페이지를 돌려주므로, 상대 경로는 그런 주소에서 빈 화면·빈 사진이 됩니다
/* \bsrc= 는 data-gallery-src= 의 끝부분도 함께 잡습니다 */
for (const [, url] of html.matchAll(/\bsrc="([^"]*)"/g)) {
  if (!/^(\/|https?:)/.test(url)) problems.push(`상대 경로: ${url} — / 로 시작해야 /foo/ 같은 주소에서도 보입니다 (wedding.ts 의 img)`);
}

if (problems.length > 0) {
  console.error('content check 실패:');
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
console.log(`content check 통과: 화면 글자 ${required.length}자, 갤러리 ${photos.gallery.length}장, 사진 ${all.length}장`);
