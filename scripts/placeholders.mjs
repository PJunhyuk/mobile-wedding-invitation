/**
 * 자리표시 사진 생성 (`npm run placeholders`).
 * wedding.ts 가 참조하는 사진 중 파일명이 placeholder- 로 시작하는 것을, 데이터의 크기 그대로 public/images/ 에 만듭니다.
 * 실제 사진을 넣기 전까지 레이아웃을 보고, 저장소를 공개해도 인물 사진이 들어가지 않게 하려는 용도입니다.
 * 글자는 시스템 글꼴에 기대지 않고 src/fonts/GowunBatang.woff2 의 글리프 외곽선을 SVG 경로로 그립니다.
 * 만든 뒤 `npm run thumbs` 와 `npm run og` 를 실행하세요.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as fontkit from 'fontkit';
import { loadSource } from './lib/source.mjs';
import { FONT_FILES } from './lib/site-text.mjs';

const OUT = 'public/images';
const font = fontkit.openSync(FONT_FILES.find((f) => f.serifOnly).out);

/* 사이트의 색 — styles.css 의 종이색·먹색 계열 */
const PALETTES = [
  ['#f4efe8', '#e3d9cf'],
  ['#eef0ee', '#d6dcd8'],
  ['#f3ecec', '#e2d2d0'],
  ['#eceff3', '#d2d9e2'],
  ['#f1efe9', '#dcd6c8'],
];
const INK = '#2c3946';

/** 글자를 글리프 외곽선 경로로 — 폰트가 없는 환경(CI)에서도 같은 그림이 나옵니다 */
function textPath(text, size, x, y, fill, letterSpacing = 0) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  const width = run.advanceWidth * scale + letterSpacing * (text.length - 1);
  let pen = x - width / 2;
  const parts = [];
  run.glyphs.forEach((glyph, i) => {
    const d = glyph.path.toSVG();
    if (d) parts.push(`<path d="${d}" transform="translate(${pen.toFixed(2)} ${y}) scale(${scale} ${-scale})"/>`);
    pen += run.positions[i].xAdvance * scale + letterSpacing;
  });
  return `<g fill="${fill}">${parts.join('')}</g>`;
}

function svg({ width, height, label, index }) {
  const [a, b] = PALETTES[index % PALETTES.length];
  const unit = Math.min(width, height);
  const inset = unit * 0.06;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="${unit * 0.003}"/>
  <circle cx="${width / 2}" cy="${height * 0.42}" r="${unit * 0.16}" fill="none" stroke="${INK}" stroke-opacity="0.25" stroke-width="${unit * 0.004}"/>
  ${textPath(label, unit * 0.075, width / 2, height * 0.56, INK, unit * 0.012)}
  ${textPath(`${width} x ${height}`, unit * 0.03, width / 2, height * 0.605, INK)}
  ${textPath('PLACEHOLDER', unit * 0.022, width / 2, height - inset * 1.9, INK, unit * 0.006)}
</svg>`;
}

const [{ photos }, { publicFile }] = await loadSource('/src/data/wedding.ts', '/src/lib/paths.ts');
/* 라벨은 photos 의 키에서 — 사진 자리를 더해도 이 스크립트는 그대로입니다 */
const targets = Object.entries(photos)
  .flatMap(([role, value]) =>
    Array.isArray(value)
      ? value.map((photo, i) => ({ photo, label: `${role.toUpperCase()} ${String(i + 1).padStart(2, '0')}` }))
      : [{ photo: value, label: role.toUpperCase() }],
  )
  .filter(({ photo }) => path.basename(photo.src).startsWith('placeholder-'));

await mkdir(OUT, { recursive: true });
await Promise.all(
  targets.map(({ photo, label }, index) =>
    sharp(Buffer.from(svg({ width: photo.width, height: photo.height, label, index })))
      .webp({ quality: 80 })
      .toFile(publicFile(photo.src)),
  ),
);
console.log(`generated ${targets.length} placeholder images in ${OUT}`);
