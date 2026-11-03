import { venue } from '../data/wedding';
import { siteUrl } from './site';

const placeName = encodeURIComponent(venue.name);
const placeId = venue.map.naverPlaceId;

/**
 * 네이버지도의 장소 상세 화면 (웹). 앱이 없거나 열리지 않을 때의 기본 목적지입니다.
 * 장소 ID 가 비어 있으면 장소명 검색 화면으로 가고, 앱 바로 열기는 하지 않습니다.
 */
export const naverWebUrl = placeId
  ? `https://map.naver.com/p/entry/place/${placeId}`
  : `https://map.naver.com/p/search/${placeName}`;

/** 지도 앱 버튼 링크. 카카오는 공유 링크를 쓰고, 비어 있으면 장소명으로 검색합니다. */
export const mapLinks = [
  { id: 'naver', label: '네이버지도', href: naverWebUrl },
  { id: 'kakao', label: '카카오지도', href: venue.map.kakao || `https://map.kakao.com/?q=${placeName}` },
];

/**
 * 네이버지도 앱을 바로 여는 주소. 앱 스킴이 없는 플랫폼(PC 등)은 null.
 * 형식은 네이버 공유 링크(naver.me)가 모바일에서 앱을 띄울 때 쓰는 것과 같습니다 (README '네이버지도 버튼' 참고).
 */
export function naverAppUrl(userAgent: string, maxTouchPoints = 0): string | null {
  if (!placeId) return null;
  const query = new URLSearchParams({
    app: 'Y',
    pinType: 'site',
    appname: new URL(siteUrl).origin,
    appMenu: 'location',
    pinId: placeId,
    menu: 'location',
    version: '2',
  }).toString();
  if (/Android/i.test(userAgent)) {
    /* 앱이 없으면 브라우저가 S.browser_fallback_url 로 직접 이동합니다 */
    return `intent://?${query}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=${encodeURIComponent(naverWebUrl)};end`;
  }
  /* iPadOS 는 맥 UA 를 보내므로 터치 지점 수로 구분합니다 */
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 2)) {
    return `navermaps://?${query}`;
  }
  return null;
}

/** 앱이 뜨지 않은 채 이만큼 지나면 웹 장소 화면으로 대신 갑니다 */
const APP_WAIT_MS = 1800;
/** 타이머가 이보다 늦게 돌면 앱이나 OS 대화상자에 다녀온 것으로 보고 아무것도 하지 않습니다 */
const APP_WAIT_LIMIT_MS = 3000;

/**
 * 네이버지도 버튼: 모바일에서는 앱을 먼저 열어 보고, 페이지가 그대로 보이면 웹으로 갑니다.
 * 앱이 실제로 열렸는지는 웹에서 알 수 없어, 페이지가 가려지거나 포커스를 잃으면 열린 것으로 봅니다.
 */
export function bindNaverMap(link: HTMLAnchorElement): void {
  let cancelPending: (() => void) | undefined;
  link.addEventListener('click', (event) => {
    /* 새 탭으로 열기 같은 수식 키 클릭은 브라우저 기본 동작에 맡깁니다 */
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const appUrl = naverAppUrl(navigator.userAgent, navigator.maxTouchPoints);
    if (!appUrl) return;
    event.preventDefault();
    cancelPending?.();

    const started = Date.now();
    const timer = setTimeout(() => {
      cancel();
      if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - started < APP_WAIT_LIMIT_MS) {
        window.location.assign(naverWebUrl);
      }
    }, APP_WAIT_MS);
    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', cancel);
      window.removeEventListener('blur', cancel);
      cancelPending = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cancel();
    };
    cancelPending = cancel;
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', cancel);
    window.addEventListener('blur', cancel);

    try {
      /* 클릭 안에서 같은 탭으로 요청해야 브라우저가 앱 실행을 막지 않습니다 */
      window.location.assign(appUrl);
    } catch {
      cancel();
      window.location.assign(naverWebUrl);
    }
  });
}
