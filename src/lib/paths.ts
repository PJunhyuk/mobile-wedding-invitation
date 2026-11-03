/**
 * 사진·공유 이미지 경로 규칙 — 한 곳에서만 해석합니다.
 * wedding.ts 의 경로는 '/images/…' 처럼 사이트 루트 기준 절대 경로입니다 (./ 도 받아 줍니다).
 * import.meta 를 쓰지 않으므로 vite.config.ts 와 검사 스크립트도 그대로 가져다 씁니다.
 */
const strip = (p: string): string => p.replace(/^\.?\//, '');

/** 빌드 base(BASE_PATH) 뒤에 붙인 URL — 하위 경로 배포에서도 사이트 안을 가리킵니다 */
export const joinBase = (base: string, p: string): string => (p ? base.replace(/\/?$/, '/') + strip(p) : p);

/** public/ 아래의 디스크 경로 (스크립트용) */
export const publicFile = (p: string): string => `public/${strip(p)}`;
