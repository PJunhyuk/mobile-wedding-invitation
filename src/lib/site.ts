import { joinBase } from './paths';

/**
 * 배포 위치 — 값은 vite.config.ts 가 정합니다 (빌드 환경변수 SITE_URL·BASE_PATH, 없으면 wedding.ts 의 share.url 과 '/').
 *  - siteUrl: OG 태그·지도 앱 appname 에 쓰는 사이트 주소 (끝에 /). define 으로 들어오므로 HTML 메타와 항상 같습니다.
 *  - withBase: public/ 자산의 절대 경로 앞에 빌드 base 를 붙입니다 (GitHub Pages 프로젝트 사이트 같은 하위 경로 배포용).
 */
export const siteUrl: string = import.meta.env.SITE_URL;

export const withBase = (p: string): string => joinBase(import.meta.env.BASE_URL, p);
