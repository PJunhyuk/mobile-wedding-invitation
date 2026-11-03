/**
 * public/images/*.webp → public/images/thumbs/*.webp 썸네일 생성 스크립트.
 * 갤러리 가로 스트립(66 CSS px)이 이 썸네일을 씁니다.
 * 사진을 추가·교체하면 `node scripts/thumbs.mjs` 를 다시 실행하세요.
 */
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'public/images';
const OUT = 'public/images/thumbs';
const WIDTH = 320; // 스트립 66 CSS px 의 4배까지 커버. 큰 사진은 원본을 씁니다

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC, { withFileTypes: true }))
  .filter((f) => f.isFile() && f.name.endsWith('.webp'))
  .map((f) => f.name);

/* 수십 장을 한 장씩 인코딩하면 코어를 놀립니다 (측정: 순차 1.5초 → 병렬 0.3초) */
await Promise.all(
  files.map((name) =>
    sharp(path.join(SRC, name))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(path.join(OUT, name)),
  ),
);
console.log(`generated ${files.length} thumbnails in ${OUT}`);
