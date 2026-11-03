// Open Graph 이미지 파생 생성: 원본은 건드리지 않고 public/og.jpg (1200x630)만 만듭니다.
// 표지 사진(wedding.ts photos.cover)과 같은 컷을 써서 공유 미리보기와 첫 화면이 이어지게 합니다.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadSource } from './lib/source.mjs';

const [{ photos }] = await loadSource('/src/data/wedding.ts');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'public', photos.cover.src);
const out = path.join(root, 'public/og.jpg');

const meta = await sharp(src).metadata();
// 세로 사진에서 가로 띠를 잘라냅니다. FACE_Y 는 띄우고 싶은 지점(보통 얼굴)의 높이 비율(0=위, 1=아래)입니다.
// 표지 사진을 바꾸면 이 값을 새 사진에 맞춰 주세요 (자리표시 이미지와 보통의 상반신 사진은 0.4 가 맞습니다).
const FACE_Y = 0.4;
const bandH = Math.round((meta.width * 630) / 1200);
const top = Math.min(meta.height - bandH, Math.max(0, Math.round(meta.height * FACE_Y - bandH * 0.45)));

await sharp(src)
  .extract({ left: 0, top, width: meta.width, height: bandH })
  .resize(1200, 630)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out);

console.log('wrote', path.relative(root, out));
