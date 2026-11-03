import { share } from '../data/wedding';

/**
 * 배포 주소와 하위 경로.
 *  - siteUrl: OG 태그·지도 앱 appname 에 쓰는 사이트 주소 (끝에 /). vite.config.ts 가 빌드 환경변수 SITE_URL(없으면 share.url)을
 *    정규화해 define 으로 넘겨 주므로 HTML 메타와 이 값이 항상 같습니다. (저장소의 share.url 은 그대로 두고 데모·미리보기만
 *    다른 주소로 빌드할 때 씁니다 — README '배포')
 *  - withBase: 사진 같은 public/ 자산 경로 앞에 빌드 base(BASE_PATH, 기본 '/')를 붙입니다.
 *    GitHub Pages 의 프로젝트 사이트처럼 하위 경로(/저장소명/)에 올릴 때 필요합니다.
 */
export const siteUrl: string = import.meta.env.SITE_URL || share.url;

export const withBase = (p: string): string => (p ? import.meta.env.BASE_URL + p.replace(/^\.?\//, '') : p);
