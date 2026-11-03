/**
 * 화면에 나올 수 있는 글자 모음: index.html + src/**\/*.ts 의 문자열·템플릿 리터럴
 * + 실행 중에 만들어지는 글자 + ASCII + 자주 쓰는 문장부호.
 * 폰트 서브셋 생성(subset-font.mjs)과 커버리지 검사(check-content.mjs)가 같은 집합을 씁니다.
 *
 * 소스에서 "주석을 빼는" 대신 "글자로 나갈 수 있는 리터럴만 모으는" 방식입니다.
 * 주석·식별자·키워드는 애초에 후보에 들어오지 않으므로
 *  - 한글 주석이 서브셋을 키우거나 검사를 흔들지 않고,
 *  - 템플릿 리터럴 안의 `//` 를 주석으로 오인해 화면 글자를 삼키는 일도 없습니다.
 *    (렉서를 직접 돌리면 `${...}` 뒤부터 위상이 어긋나 실제로 이 문제가 있었습니다)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/** 화면에 실제로 그려지는 기호 — 커버리지 검사가 이 글자들까지 확인합니다. */
export const SCREEN_SYMBOLS = '·…「」♡♥';
/** 넣어 두면 좋은 예비 기호 (검사 대상은 아닙니다) */
const SPARE_SYMBOLS = ' —–‘’“”『』×‹›←→↑↓※';
const EXTRA = SCREEN_SYMBOLS + SPARE_SYMBOLS;

/**
 * 서브셋 결과물 — 생성 스크립트와 검사 스크립트가 같은 목록을 봅니다.
 *  - Pretendard: 화면의 모든 글자. 굵기 축은 CSS 가 쓰는 400~700 만 남깁니다 (styles.css 의 @font-face 와 같은 범위).
 *  - Gowun Batang: 명조로 조판되는 글자만 (영문 표제·숫자·기호 + 초대의 글). 나머지 한글은 명조로 그려지지 않으므로 넣지 않습니다.
 */
export const FONT_FILES = [
  { name: 'Pretendard Variable', out: 'src/fonts/PretendardVariable.woff2', serifOnly: false, axes: { wght: { min: 400, max: 700 } } },
  { name: 'Gowun Batang', out: 'src/fonts/GowunBatang.woff2', serifOnly: true },
];

/** 요일 이름은 src/lib/date.ts 의 Intl 이 실행 중에 만들어 소스에 글자로 남지 않으므로 여기서 직접 넣습니다. */
const weekdayFormat = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' });
const runtimeText = Array.from({ length: 7 }, (_, i) => weekdayFormat.format(new Date(Date.UTC(2021, 10, 7 + i)))).join('');
if (!/[가-힣]/.test(runtimeText)) {
  throw new Error('Intl 이 한국어 요일 이름을 만들지 못했습니다 (full-icu 가 없는 Node 인지 확인하세요)');
}

/** 소스에서 화면 글자가 될 수 있는 리터럴만 모읍니다. */
export function literalText(source) {
  const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
  let out = '';
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out += node.text;
    }
    node.forEachChild(visit);
  };
  visit(file);
  return out;
}

const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('');

/**
 * 명조(Gowun Batang)로 그려지는 글자: 영문·숫자·기호와 초대의 글(시·시인·제목). invitation 은 wedding.ts 의 값입니다.
 * (.ts 를 여기서 직접 import 하지 않습니다 — scripts/lib/source.mjs 참고)
 * 다른 한글을 명조로 바꾸면(styles.css 의 var(--serif)) 여기에도 그 글을 더해야 합니다 — `npm run check:fonts` 가 잡아냅니다.
 */
export function serifChars(invitation) {
  const poem = [...invitation.stanzas.flat(), invitation.author, invitation.title].join('');
  return [...new Set(ASCII + SCREEN_SYMBOLS + poem)];
}

export async function siteChars() {
  let text = EXTRA + runtimeText + (await readFile('index.html', 'utf8'));
  for (const entry of await readdir('src', { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    text += literalText(await readFile(path.join(entry.parentPath ?? entry.path, entry.name), 'utf8'));
  }
  text += ASCII;
  return [...new Set([...text])].filter((c) => c.codePointAt(0) >= 0x20);
}

/**
 * KS X 1001 완성형 한글 2,350자. `npm run fonts -- --broad` 가 서브셋에 더해, 문구를 바꿔도 흔한 글자는
 * 서브셋을 다시 만들지 않고 그대로 나오게 합니다 (저장소에 들어 있는 기본 서브셋이 이것입니다).
 * EUC-KR 의 한글 영역(B0A1–C8FE)을 Node 의 TextDecoder 로 풀어서 얻습니다 — 표를 저장소에 두지 않아도 됩니다.
 */
export function ksx1001Hangul() {
  const bytes = [];
  for (let lead = 0xb0; lead <= 0xc8; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) bytes.push(lead, trail);
  }
  const chars = [...new TextDecoder('euc-kr').decode(Uint8Array.from(bytes))].filter((c) => /[가-힣]/.test(c));
  if (chars.length !== 2350) {
    throw new Error(`KS X 1001 한글이 2350자가 아니라 ${chars.length}자입니다 (full-icu 가 없는 Node 인지 확인하세요)`);
  }
  return chars;
}
