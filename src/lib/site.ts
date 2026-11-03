import { share } from '../data/wedding';

/**
 * 배포 주소와 하위 경로.
 *  - siteUrl: OG 태그·지도 앱 appname 에 쓰는 사이트 주소. 빌드 환경변수 SITE_URL 이 있으면 그것, 없으면 wedding.ts 의 share.url.
 *    (저장소의 share.url 은 그대로 두고 데모·미리보기 배포만 다른 주소로 빌드할 때 씁니다 — README '배포')
 *  - withBase: 사진 같은 public/ 자산의 절대 경로 앞에 빌드 base(BASE_PATH, 기본 '/')를 붙입니다.
 *    GitHub Pages 의 프로젝트 사이트처럼 하위 경로(/저장소명/)에 올릴 때 필요합니다.
 */
export const siteUrl: string = (import.meta.env.SITE_URL ?? '').trim() || share.url;

export const withBase = (path: string): string => import.meta.env.BASE_URL.replace(/\/$/, '') + path;
