/**
 * 배포된 사이트가 살아 있는지 검사 (`npm run check:live`). README '배포' 의 워크플로로 GitHub Actions 에서 주기적으로 돌릴 수 있습니다.
 *  - HTML 이 200 으로 오고 제목이 들어 있는지
 *  - HTML 이 가리키는 CSS·JS·글꼴과 공유 이미지, 표지 사진이 실제 파일로 오는지 (반쯤 깨진 배포를 잡습니다)
 *  - 검색 차단(robots 메타, 헤더는 호스팅이 지원할 때만)
 *  - EXPECTED_SHA 를 주면, 그 커밋이 배포되었는지 (워크플로는 main 의 최신 커밋을 넘깁니다)
 * 브라우저 없이 fetch 만 쓰므로 어디서나 돌릴 수 있습니다. 사용: node scripts/check-live.mjs [url]
 * 주소를 생략하면 wedding.ts 의 share.url (또는 빌드 환경변수 SITE_URL) 을 봅니다 — 자리표시자 그대로면 example.com 을 검사하게 됩니다.
 */
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadSource } from './lib/source.mjs';

const [{ share }, { siteUrl }] = await loadSource('/src/data/wedding.ts', '/src/lib/site.ts');
const base = new URL(process.argv[2] ?? siteUrl);
if (base.hostname === 'example.com') {
  console.error('검사할 주소가 example.com 입니다 — wedding.ts 의 share.url 을 배포 주소로 바꾸거나 인자로 주소를 넘기세요');
  process.exit(1);
}
const problems = [];
/* 연결 실패 한 번은 네트워크가 잠깐 끊긴 것일 수 있어 5초 뒤 한 번 더 시도합니다 (진짜 장애는 다시 해도 실패합니다).
   한 시간마다 도는 감시가 순간 끊김마다 메일을 보내지 않게 하려는 것입니다. */
const get = async (url, init) => {
  const once = () => fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000), ...init });
  try {
    return await once().catch(() => sleep(5_000).then(once));
  } catch (error) {
    problems.push(`${url}: 연결 실패 (${error.cause?.code ?? error.message})`);
    return null;
  }
};

let deployed;
const page = await get(new URL(`?live-check=${Date.now()}`, base));
if (page) {
  if (page.status !== 200) problems.push(`${base}: HTTP ${page.status}`);
  /* 헤더를 못 보내는 호스팅(GitHub Pages 등)이 있으므로 경고만 합니다. robots 메타는 아래에서 필수로 봅니다. */
  if (page.headers.get('x-robots-tag') !== 'noindex') console.warn('경고: X-Robots-Tag: noindex 헤더가 없습니다 (public/_headers 를 읽는 호스팅이면 확인하세요)');
  const html = await page.text();
  if (!html.includes(`<title>${share.title}</title>`)) problems.push(`HTML 에 제목 '${share.title}' 이 없습니다`);
  if (!html.includes('name="robots"')) problems.push('HTML 에 robots 메타가 없습니다');

  /* 빌드가 실패하면 사이트는 직전 배포로 남아 겉보기엔 멀쩡합니다. 새 커밋이 안 올라가는 것은 여기서만 드러납니다.
     푸시 직후에는 빌드 중일 수 있으므로 커밋한 지 20분이 지나도 다를 때만 실패로 봅니다. */
  deployed = html.match(/<meta name="build" content="([^"]*)"/)?.[1] ?? '알 수 없음';
  const expected = process.env.EXPECTED_SHA;
  if (expected && deployed !== expected) {
    let minutes = Infinity;
    try {
      minutes = (Date.now() / 1000 - Number(execFileSync('git', ['log', '-1', '--format=%ct', expected], { encoding: 'utf8' }))) / 60;
    } catch {
      /* 커밋 시각을 모르면 기다리지 않고 바로 알립니다 */
    }
    if (minutes >= 20) {
      problems.push(
        `main 의 최신 커밋 ${expected.slice(0, 7)} 이 배포되지 않았습니다 (지금 배포본: ${deployed.slice(0, 7)}) — 호스팅의 빌드·배포 로그를 확인하세요`,
      );
    }
  }

  /* HTML 이 실제로 가리키는 파일들 — 해시가 붙은 이름이라 이 목록이 곧 현재 배포본입니다 */
  /* 이 사이트의 하위 경로로 시작하는 것만 — 외부 스크립트 주소에 /assets/ 가 들어 있어도 섞이지 않게 */
  const assets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith(`${base.pathname}assets/`));
  if (assets.length < 4) problems.push(`HTML 이 가리키는 assets 가 ${assets.length}개뿐입니다 (CSS·JS·글꼴 2개가 있어야 합니다)`);
  /* 공유 이미지와 표지 사진도 HTML 이 실제로 가리키는 주소로 봅니다 (하위 경로 배포에서도 맞습니다) */
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const cover = html.match(/rel="preload" as="image" href="([^"]+)"/)?.[1];
  if (!ogImage) problems.push('HTML 에 og:image 가 없습니다');
  if (!cover) problems.push('HTML 에 표지 사진 preload 가 없습니다');
  /* 서버가 없는 경로에도 index.html 을 200 으로 줄 수 있으므로, 상태 코드가 아니라 파일 종류로 확인합니다 */
  /* og:image 는 share.url 기준의 절대 주소라, 미리보기·데모처럼 다른 주소를 검사할 때는 경로만 가져와 검사 대상 사이트에서 찾습니다 */
  const files = [...assets, ogImage && new URL(ogImage, base).pathname, cover, 'favicon.svg'].filter(Boolean);
  await Promise.all(
    files.map(async (file) => {
      const res = await get(new URL(file, base), { method: 'HEAD' });
      if (!res) return;
      const type = res.headers.get('content-type') ?? '';
      if (res.status !== 200 || type.startsWith('text/html')) problems.push(`${file}: HTTP ${res.status} ${type} (파일이 없습니다)`);
    }),
  );
}

/* http 로 들어와도 https 로 보내야 공유·복사 API 가 동작합니다 (호스팅의 'HTTPS 강제' 설정).
   장애는 아니므로 경고만 합니다. */
const plain = await get(new URL(base.href.replace(/^https:/, 'http:')));
if (plain && !(plain.status >= 301 && plain.status <= 308 && plain.headers.get('location')?.startsWith('https://'))) {
  console.warn(`경고: http:// 가 https 로 넘어가지 않습니다 (HTTP ${plain.status})`);
}

if (problems.length > 0) {
  console.error(`live check 실패 (${base}):`);
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
console.log(`live check 통과: ${base} HTML·CSS·JS·글꼴·공유 이미지·표지 사진 (배포본 ${deployed.slice(0, 7)})`);
