/**
 * 소스(.ts)를 빌드와 같은 해석기(vite)로 불러옵니다.
 * Node 로 .ts 를 직접 import 하면 22.18 미만의 Node 에서 실패하는데, Cloudflare 빌드(Workers Builds)는 설정에 따라
 * 그런 Node 로 돌 수 있습니다. 빌드 명령(`npm run check`)에 들어가는 스크립트는 소스를 이 함수로만 읽습니다.
 */
import { createServer } from 'vite';

export async function loadSource(...paths) {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    return await Promise.all(paths.map((p) => server.ssrLoadModule(p)));
  } finally {
    await server.close();
  }
}
