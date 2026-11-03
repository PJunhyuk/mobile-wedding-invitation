import { execFileSync } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import { share, photos } from './src/data/wedding.ts';

/**
 * 배포 위치는 환경변수로 넘깁니다 (저장소의 wedding.ts 는 그대로 두고 데모·미리보기만 다른 곳에 올릴 수 있게).
 *  - BASE_PATH: 사이트가 놓이는 하위 경로. 기본 '/'. GitHub Pages 프로젝트 사이트는 '/<저장소명>/'.
 *  - SITE_URL : OG 태그와 공유 링크에 쓰는 전체 주소 (끝에 / 포함). 기본은 wedding.ts 의 share.url.
 */
const base = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const siteEnv = (process.env.SITE_URL ?? '').trim();
const siteUrl = siteEnv ? siteEnv.replace(/\/?$/, '/') : share.url;

/**
 * index.html 의 {{key}} 토큰을 src/data/wedding.ts 값으로 치환하고,
 * 표지 사진 preload 를 같은 데이터에서 만들어 넣습니다.
 * OG/메타 태그와 우선 로드 대상까지 데이터 파일 한 곳에서 관리하기 위한 최소한의 플러그인입니다.
 * build 는 이 빌드의 커밋으로, <meta name="build"> 에 들어갑니다.
 */
function htmlData(build: string): Plugin {
  const map: Record<string, string> = {
    'share.title': share.title,
    'share.description': share.description,
    'share.url': siteUrl,
    /* ogImage 는 사이트 주소 기준 상대 경로로 풉니다 — 하위 경로 배포에서도 /og.jpg 가 사이트 안을 가리키게 */
    'share.ogImage': new URL(share.ogImage.replace(/^\//, ''), siteUrl).toString(),
  };
  return {
    name: 'html-data',
    transformIndexHtml(html) {
      return {
        /* 오타나 이름이 바뀐 토큰이 빈 문자열로 조용히 나가지 않도록 빌드를 세웁니다 */
        html: html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
          const value = map[key];
          if (value === undefined) throw new Error(`index.html 의 {{${key}}} 에 대응하는 값이 없습니다`);
          return value;
        }),
        /* 표지 사진을 바꾸면 preload 도 따라오도록 wedding.ts 에서 직접 만듭니다 */
        tags: [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'image', href: base + photos.cover.src.replace(/^\//, ''), fetchpriority: 'high' },
            injectTo: 'head' as const,
          },
          /* 배포본이 어느 커밋인지 밖에서 알 수 있게 합니다. 빌드가 실패하면 사이트는 직전 배포로 남아
             겉보기엔 멀쩡하므로, scripts/check-live.mjs 가 이 값으로 main 의 최신 커밋이 올라갔는지 확인합니다. */
          { tag: 'meta', attrs: { name: 'build', content: build }, injectTo: 'head' as const },
        ],
      };
    },
  };
}

/**
 * 이 빌드의 커밋. Cloudflare 빌드는 git 체크아웃에서 돌므로 git 으로 읽습니다.
 * 플랫폼 변수(Pages 의 CF_PAGES_COMMIT_SHA, Workers 의 WORKERS_CI_COMMIT_SHA)는 프로젝트 종류마다 달라 기대지 않습니다.
 */
function buildCommit(): string {
  try {
    /* 커밋이 없는 새 저장소에서는 git 이 stderr 에 불평하므로 조용히 대체값으로 넘어갑니다 */
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA ?? 'unknown';
  }
}

/**
 * 없는 주소에 대한 대체 페이지. GitHub Pages 는 404.html 을, Netlify 는 404.html 을 404 페이지로 씁니다.
 * (Cloudflare Workers 는 wrangler.jsonc 의 not_found_handling 이 같은 일을 하므로 이 파일을 쓰지 않습니다.)
 * 자산 경로가 절대 경로라 어떤 주소에서 열려도 CSS·JS·사진을 찾습니다.
 */
const notFoundPage = (): Plugin => ({
  name: 'not-found-page',
  apply: 'build',
  closeBundle: () => copyFile('dist/index.html', 'dist/404.html'),
});

export default defineConfig({
  /* 서버가 모르는 주소(/foo/ 등)에도 이 페이지를 돌려주므로, 자산은 상대 경로가 아니라 사이트 루트(base)에서 찾게 합니다.
     상대 경로면 그런 주소에서 CSS·JS 를 못 찾아 빈 화면이 됩니다. */
  base,
  /* SITE_URL 을 소스(src/lib/site.ts)에서도 읽을 수 있게 노출합니다 */
  envPrefix: ['VITE_', 'SITE_'],
  plugins: [htmlData(buildCommit()), notFoundPage()],
  build: {
    target: 'es2020',
    cssTarget: 'safari14',
    assetsInlineLimit: 0,
    /* 청크가 하나뿐이라 modulepreload 폴리필이 할 일이 없습니다 */
    modulePreload: { polyfill: false },
  },
  server: { host: true },
});
