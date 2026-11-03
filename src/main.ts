import './styles.css';
import { renderApp } from './render';
import { $, $$, prefersReducedMotion, toast, copyText } from './lib/dom';
import { bindNaverMap } from './lib/maps';

const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

app.innerHTML = renderApp();
app.removeAttribute('aria-busy');

const reduced = prefersReducedMotion();

/* ---- Scene Scroll: 화면에 들어온 장면만 조용히 드러냄 ---- */
const scenes = $$<HTMLElement>('[data-scene]');
if (!reduced) document.documentElement.classList.add('has-scene-motion');

/* 현재 장면을 보여 주는 세로 인디케이터. 링크라서 원하는 장면으로 바로 이동할 수도 있습니다. */
const sceneLabels: Record<string, string> = {
  cover: '표지',
  invitation: '초대의 글',
  feature: '대표 사진',
  info: '예식일',
  gallery: '갤러리',
  location: '오시는 길',
  gift: '마음 전하실 곳',
  closing: '맺음말',
};
const sceneRail = document.createElement('nav');
sceneRail.className = 'scene-rail';
sceneRail.setAttribute('aria-label', '청첩장 장면 이동');
sceneRail.innerHTML = scenes
  .map((scene, index) => {
    const label = sceneLabels[scene.id] ?? '장면';
    return `<a class="scene-rail__dot" href="#${scene.id}" aria-label="${index + 1}. ${label}"${index === 0 ? ' aria-current="step"' : ''}></a>`;
  })
  .join('');
document.body.appendChild(sceneRail);

const railDots = $$<HTMLAnchorElement>('.scene-rail__dot', sceneRail);
const setCurrentScene = (index: number) => {
  for (const [i, dot] of railDots.entries()) {
    if (i === index) dot.setAttribute('aria-current', 'step');
    else dot.removeAttribute('aria-current');
  }
};

if ('IntersectionObserver' in window) {
  const currentSceneObserver = new IntersectionObserver(
    (entries) => {
      const active = entries.find((entry) => entry.isIntersecting);
      if (!active) return;
      const index = scenes.indexOf(active.target as HTMLElement);
      if (index >= 0) setCurrentScene(index);
    },
    { rootMargin: '-46% 0px -46% 0px', threshold: 0 },
  );
  for (const scene of scenes) currentSceneObserver.observe(scene);
}

if (reduced || !('IntersectionObserver' in window)) {
  for (const scene of scenes) scene.classList.add('is-visible');
} else {
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        sceneObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  for (const scene of scenes) sceneObserver.observe(scene);
}

/* ---- 표지: 첫 스크롤이나 터치에 안내 문구가 사라짐 (한 번만) ---- */
const cover = document.getElementById('cover');
const hint = document.getElementById('scroll-hint');
if (!reduced) {
  const read = () => {
    hint?.classList.add('is-hidden');
    window.removeEventListener('scroll', onScroll);
    cover?.removeEventListener('pointerdown', read);
  };
  const onScroll = () => {
    if (window.scrollY > 24) read();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cover?.addEventListener('pointerdown', read, { passive: true });
  if (window.scrollY > 24) read();
}

/* ---- 사진 영역의 확대 방지 ----
   핀치는 CSS touch-action 이 막고, 여기서는 그것으로 막히지 않는 더블탭과 Safari 의 gesture 이벤트를 취소합니다.
   페이지 전체의 확대는 막지 않습니다 (글씨를 키워 보려는 분을 위해). */
for (const photo of $$('[data-photo-no-zoom]')) {
  for (const type of ['dblclick', 'gesturestart', 'gesturechange']) {
    photo.addEventListener(type, (event) => event.preventDefault());
  }
}

/* ---- 갤러리: 아래 썸네일로 위 대표 사진만 교체 ---- */
const gallery = document.getElementById('gallery');
const galleryFeatured = $<HTMLImageElement>('.gallery__featured-img');
const galleryFrame = $('.gallery__featured');
const galleryStrip = $('.gallery__thumbs');
const galleryStatus = document.getElementById('gallery-status');
const galleryThumbs = $$<HTMLButtonElement>('[data-action="gallery-select"]');
let galleryIndex = 0;
let galleryPointerStart: { id: number; x: number; y: number } | null = null;
gallery?.addEventListener('contextmenu', (e) => e.preventDefault());
gallery?.addEventListener('dragstart', (e) => e.preventDefault());

/* 썸네일 스트립만 직접 스크롤합니다. scrollIntoView 는 장면(세로)까지 함께 굴려
   현재 장면의 스크롤 위치를 흔들기 때문에 가로 위치만 직접 계산합니다. */
const scrollThumbIntoView = (target: HTMLElement) => {
  if (!galleryStrip) return;
  const strip = galleryStrip.getBoundingClientRect();
  const thumb = target.getBoundingClientRect();
  const left = galleryStrip.scrollLeft + (thumb.left - strip.left) - (strip.width - thumb.width) / 2;
  galleryStrip.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
};

/* 고른 사진은 썸네일을 거치지 않고 원본을 바로 띄웁니다. 기다림을 줄이려고 갤러리가 가까워지면
   현재 사진과 앞뒤 사진의 원본을 미리 받아 디코딩해 둡니다. 전체를 받지는 않습니다 — 참조는 최근 3장만 쥡니다. */
const PREPARED_MAX = 3;
const preparedPhotos = new Map<string, HTMLImageElement>();
let galleryNear = false;

/* 표지(LCP)와 대역폭을 다투지 않도록 표지를 다 받은 뒤에 시작합니다 */
const coverImage = $<HTMLImageElement>('.cover__img');
const coverReady =
  !coverImage || coverImage.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        coverImage.addEventListener('load', () => resolve(), { once: true });
        coverImage.addEventListener('error', () => resolve(), { once: true });
      });

const preparePhoto = (index: number) => {
  const src = galleryThumbs[index]?.dataset.gallerySrc;
  if (!src) return;
  const prepared = preparedPhotos.get(src);
  if (prepared) {
    /* 다시 쓰인 사진을 맨 뒤로 옮겨, 밀려날 때는 가장 오래 안 쓴 것부터 나가게 합니다 */
    preparedPhotos.delete(src);
    preparedPhotos.set(src, prepared);
    return;
  }
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.src = src;
  preparedPhotos.set(src, image);
  /* 못 받은 사진은 지워 두어 다음에 다시 시도합니다 */
  image.decode().catch(() => preparedPhotos.delete(src));
  if (preparedPhotos.size > PREPARED_MAX) preparedPhotos.delete(preparedPhotos.keys().next().value!);
};

const prepareNeighbors = async () => {
  if (!galleryNear || !galleryFeatured || galleryThumbs.length === 0) return;
  const index = galleryIndex;
  await coverReady;
  /* 지금 보이는 사진이 먼저입니다. 기다리는 사이 다른 사진을 골랐다면 그쪽 호출에 맡깁니다. */
  await galleryFeatured.decode().catch(() => {});
  if (!galleryNear || index !== galleryIndex) return;
  const count = galleryThumbs.length;
  preparePhoto((index - 1 + count) % count);
  preparePhoto((index + 1) % count);
  preparePhoto(index);
};

/* 갤러리 한 화면 앞에서부터 준비합니다 */
if (gallery && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    (entries) => {
      galleryNear = entries.some((entry) => entry.isIntersecting);
      if (galleryNear) void prepareNeighbors();
    },
    { rootMargin: `${window.innerHeight}px 0px` },
  ).observe(gallery);
}

/* 썸네일에 손이 닿는 순간(호버·포커스·누름) 그 사진을 먼저 요청해 클릭보다 한발 앞섭니다 */
for (const [index, thumb] of galleryThumbs.entries()) {
  const prepareIntent = () => {
    if (coverImage?.complete) preparePhoto(index);
  };
  thumb.addEventListener('pointerenter', prepareIntent);
  thumb.addEventListener('focus', prepareIntent);
  thumb.addEventListener('pointerdown', prepareIntent, { passive: true });
}

const showGalleryPhoto = (index: number, scrollThumb = false) => {
  const target = galleryThumbs[index];
  if (!galleryFeatured || !target) return;
  galleryIndex = index;
  /* 프레임이 새 사진의 비율을 따르도록 크기와 --photo-ratio 를 함께 바꿉니다 */
  galleryFeatured.width = Number(target.dataset.galleryWidth);
  galleryFeatured.height = Number(target.dataset.galleryHeight);
  galleryFrame?.style.setProperty('--photo-ratio', target.style.getPropertyValue('--photo-ratio'));
  galleryFeatured.src = target.dataset.gallerySrc ?? '';
  galleryFeatured.alt = target.dataset.galleryAlt ?? '';
  for (const thumb of galleryThumbs) {
    const current = thumb === target;
    thumb.classList.toggle('is-selected', current);
    thumb.setAttribute('aria-current', String(current));
  }
  if (galleryStatus) galleryStatus.textContent = `${index + 1} / ${galleryThumbs.length}`;
  if (scrollThumb) scrollThumbIntoView(target);
  /* 사진을 골랐다면 갤러리를 보고 있는 것입니다 (IntersectionObserver 가 없는 브라우저 포함) */
  galleryNear = true;
  void prepareNeighbors();
};

const moveGalleryPhoto = (direction: -1 | 1) => {
  if (galleryThumbs.length === 0) return;
  showGalleryPhoto((galleryIndex + direction + galleryThumbs.length) % galleryThumbs.length, true);
};

/* 두 손가락으로 확대하려는 동작이 사진 넘김으로 새지 않도록 첫 손가락만 따라갑니다.
   포인터를 캡처해 프레임 밖에서 손을 떼도 같은 스와이프로 인식합니다. */
if (galleryFrame) {
  const frame = galleryFrame;
  frame.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    galleryPointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener('pointerup', (event) => {
    if (galleryPointerStart?.id !== event.pointerId) return;
    const deltaX = event.clientX - galleryPointerStart.x;
    const deltaY = event.clientY - galleryPointerStart.y;
    galleryPointerStart = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    moveGalleryPhoto(deltaX < 0 ? 1 : -1);
  });
  frame.addEventListener('pointercancel', (event) => {
    if (galleryPointerStart?.id === event.pointerId) galleryPointerStart = null;
  });
}

/* 스와이프는 마우스·키보드로 대체할 방법이 없으므로 갤러리 안에서 좌우 화살표로도 넘깁니다.
   포커스를 바뀐 썸네일로 옮겨 어디를 보고 있는지 잃지 않게 합니다. */
gallery?.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (galleryThumbs.length === 0) return;
  event.preventDefault();
  moveGalleryPhoto(event.key === 'ArrowRight' ? 1 : -1);
  galleryThumbs[galleryIndex]?.focus();
});

/* ---- 네이버지도: 모바일에서는 앱을 바로 엽니다 ---- */
const naverMapLink = $<HTMLAnchorElement>('[data-naver-map]');
if (naverMapLink) bindNaverMap(naverMapLink);

/* ---- 공유 ---- */
/* 밖으로 나가는 주소는 쿼리·해시 없이 깔끔하게 보냅니다(예전 공유 링크의 ?share=… 로 들어온 경우 포함).
   복사한 링크도 결국 카카오톡에 붙여 넣게 되므로 공유하기와 같은 주소를 씁니다. */
const shareUrl = () => {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return url.toString();
};

const copyShareUrl = async () => toast((await copyText(shareUrl())) ? '링크를 복사했습니다' : '복사에 실패했습니다');

async function doShare() {
  if (navigator.share) {
    try {
      await navigator.share({ url: shareUrl() });
      return;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
    }
  }
  await copyShareUrl();
}

/* ---- 액션 위임 ---- */
document.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  switch (action) {
    case 'copy': {
      const ok = await copyText(target.dataset.copy ?? '');
      toast(ok ? (target.dataset.toast ?? '복사했습니다') : '복사에 실패했습니다');
      break;
    }
    case 'gallery-select':
      showGalleryPhoto(galleryThumbs.indexOf(target as HTMLButtonElement));
      break;
    case 'share':
      await doShare();
      break;
    case 'copy-url':
      await copyShareUrl();
      break;
    case 'gift-tab': {
      const root = target.closest<HTMLElement>('[data-gift]');
      const index = Number(target.dataset.giftTab ?? 0);
      if (!root) break;
      const selected = target.getAttribute('aria-expanded') === 'true';
      for (const tab of $$<HTMLButtonElement>('[data-gift-tab]', root)) {
        tab.setAttribute('aria-expanded', String(!selected && Number(tab.dataset.giftTab) === index));
      }
      for (const [panelIndex, panel] of $$<HTMLElement>('[data-gift-panel]', root).entries()) {
        panel.hidden = selected || panelIndex !== index;
      }
      break;
    }
  }
});
