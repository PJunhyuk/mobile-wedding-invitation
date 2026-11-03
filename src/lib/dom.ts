/** 작은 DOM 유틸 — 프레임워크 없이 안전하게 문자열 템플릿을 씁니다. */

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const characters = Object.fromEntries(Object.entries(entities).map(([c, e]) => [e, c]));

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => entities[c] ?? c);
/** escapeHtml 의 역 — 검사 스크립트가 렌더된 마크업에서 실제 글자를 되찾을 때 씁니다 */
export const unescapeHtml = (s: string): string => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => characters[e] ?? e);

/** 템플릿 리터럴 태그: 보간값은 자동 이스케이프, `raw()`로 감싼 값만 그대로 삽입 (null·undefined·false 는 빈 문자열) */
class Raw {
  constructor(public readonly value: string) {}
}
export const raw = (v: string): Raw => new Raw(v);

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((out, s, i) => {
    const v = values[i - 1];
    return out + (v instanceof Raw ? v.value : v == null || v === false ? '' : escapeHtml(String(v))) + s;
  });

/** 줄 배열 → 이스케이프해서 <br /> 로 이은 마크업 */
export const lines = (ls: readonly string[]): Raw => raw(ls.map(escapeHtml).join('<br />'));

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer = 0;
export function toast(message: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2200);
}

/** 복사하고 결과를 토스트로 알립니다 */
export async function copyWithToast(text: string, okMessage: string): Promise<void> {
  toast((await copyText(text)) ? okMessage : '복사에 실패했습니다');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
