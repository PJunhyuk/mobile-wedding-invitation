/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** vite.config.ts 가 define 으로 넣는 정규화된 사이트 주소 (빌드 환경변수 SITE_URL, 없으면 wedding.ts 의 share.url) */
  readonly SITE_URL?: string;
}
