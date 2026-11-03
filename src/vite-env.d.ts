/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 빌드 때 넘긴 사이트 주소 (vite.config.ts 의 envPrefix 로 노출). 없으면 wedding.ts 의 share.url 을 씁니다. */
  readonly SITE_URL?: string;
}
