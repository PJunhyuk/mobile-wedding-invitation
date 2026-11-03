/**
 * 지도 링크 검사 (`npm run check` 에 포함).
 *  1. 주소: 네이버 웹·앱 주소가 확인된 장소를 가리키고, 플랫폼별로 맞는 형식이 나오는지.
 *  2. 버튼 동작: 앱을 열어 본 뒤 웹으로 넘어가거나 넘어가지 않아야 하는 경우들 (src/lib/maps.ts 의 bindNaverMap).
 * 브라우저 없이 가짜 window·document·타이머로 돌리므로, 실제로 앱이 열리는지는 실기기에서만 확인할 수 있습니다.
 */
import assert from 'node:assert/strict';
import { loadSource } from './lib/source.mjs';

const [{ venue }, { naverAppUrl, naverWebUrl, kakaoWebUrl, bindNaverMap }, { renderApp }] = await loadSource(
  '/src/data/wedding.ts',
  '/src/lib/maps.ts',
  '/src/render.ts',
);
const placeId = venue.map.naverPlaceId;
const placeQuery = encodeURIComponent(venue.name);

// 0. 화면의 두 버튼 — 네이버는 같은 탭(앱 열기), 카카오는 새 창. 카카오 공유 링크가 비어 있으면 장소명 검색.
const html = renderApp();
assert.ok(html.includes(`href="${naverWebUrl}" data-naver-map`));
assert.ok(html.includes(`href="${kakaoWebUrl}" target="_blank" rel="noopener noreferrer"`));
assert.equal(kakaoWebUrl, venue.map.kakao || `https://map.kakao.com/?q=${placeQuery}`);

// 장소 ID 가 비어 있으면(자리표시자 상태) 검색 화면으로만 가고 앱은 열지 않습니다
if (!placeId) {
  assert.equal(naverWebUrl, `https://map.naver.com/p/search/${placeQuery}`);
  for (const ua of ['iPhone', 'Android', 'Windows']) assert.equal(naverAppUrl(ua, 5), null);
  console.log('maps check 통과: 네이버 장소 ID 가 비어 있어 검색 주소만 검사했습니다 (wedding.ts 의 venue.map.naverPlaceId 를 채우면 앱 열기 분기도 검사합니다)');
  process.exit(0);
}

// 1. 주소
assert.equal(naverWebUrl, `https://map.naver.com/p/entry/place/${placeId}`);
assert.equal(naverAppUrl('Windows'), null);
assert.equal(naverAppUrl('Macintosh', 0), null);
for (const ua of ['iPhone', 'iPad', 'iPod', 'Macintosh']) {
  const url = new URL(naverAppUrl(ua, 5));
  assert.equal(url.protocol, 'navermaps:');
  assert.equal(url.searchParams.get('pinId'), placeId);
}
const android = naverAppUrl('Android');
assert.ok(android.startsWith('intent://?'));
assert.ok(android.includes(`pinId=${placeId}`));
assert.ok(android.includes('scheme=nmap;'));
assert.ok(android.includes(`S.browser_fallback_url=${encodeURIComponent(naverWebUrl)};`));

// 2. 버튼 동작
/** 버튼을 한 번 눌렀을 때의 결과: 기본 동작을 막았는지, 어디로 이동했는지 */
const press = ({
  userAgent = 'iPhone',
  ctrlKey = false,
  clicks = 1,
  blocked = false,
  after = () => {},
  elapsed = 1800,
}) => {
  let now = 0;
  const timers = new Map();
  const navigations = [];
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', hasFocus: () => true });
  const win = Object.assign(new EventTarget(), {
    location: {
      assign(url) {
        if (blocked && url !== naverWebUrl) throw new Error('blocked');
        navigations.push(url);
      },
    },
  });
  const fakes = {
    document: doc,
    window: win,
    navigator: { userAgent, maxTouchPoints: 0 },
    setTimeout: (fn) => timers.set(timers.size + 1, fn).size,
    clearTimeout: (id) => timers.delete(id),
  };
  const saved = Object.keys(fakes).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const realNow = Date.now;
  Date.now = () => now;
  for (const [key, value] of Object.entries(fakes)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  try {
    let click;
    let prevented = false;
    bindNaverMap({ addEventListener: (_type, fn) => (click = fn) });
    for (let i = 0; i < clicks; i++) click({ button: 0, ctrlKey, preventDefault: () => (prevented = true) });
    after(doc, win);
    now = elapsed;
    for (const [id, fn] of [...timers]) {
      timers.delete(id);
      fn();
    }
    assert.equal(timers.size, 0, '남은 타이머가 없어야 합니다');
    return { prevented, navigations };
  } finally {
    Date.now = realNow;
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
};
const app = naverAppUrl('iPhone');
const leave = (doc) => {
  doc.visibilityState = 'hidden';
  doc.dispatchEvent(new Event('visibilitychange'));
  doc.visibilityState = 'visible';
};

// PC·수식 키 클릭: 링크의 기본 동작 그대로
assert.deepEqual(press({ userAgent: 'Windows' }), { prevented: false, navigations: [] });
assert.deepEqual(press({ ctrlKey: true }), { prevented: false, navigations: [] });
// 앱이 열리지 않고 페이지가 그대로면 웹으로
assert.deepEqual(press({}).navigations, [app, naverWebUrl]);
assert.deepEqual(press({ userAgent: 'Android' }).navigations, [naverAppUrl('Android'), naverWebUrl]);
// 페이지가 가려지거나 포커스를 잃었으면(앱이 열렸으면) 웹으로 가지 않음
assert.deepEqual(press({ after: leave }).navigations, [app]);
assert.deepEqual(press({ after: (_doc, win) => win.dispatchEvent(new Event('pagehide')) }).navigations, [app]);
assert.deepEqual(press({ after: (_doc, win) => win.dispatchEvent(new Event('blur')) }).navigations, [app]);
// 타이머가 한참 뒤에 돌았으면(백그라운드에 다녀왔으면) 웹으로 가지 않음
assert.deepEqual(press({ elapsed: 10_000 }).navigations, [app]);
// 앱 주소 이동이 막히면 곧바로 웹으로
assert.deepEqual(press({ blocked: true }).navigations, [naverWebUrl]);
// 연달아 눌러도 웹 이동은 한 번
assert.deepEqual(press({ clicks: 2 }).navigations, [app, app, naverWebUrl]);

console.log('maps check 통과: 장소 주소, 플랫폼별 앱 주소, 웹 대체·취소 조건, 카카오 링크');
