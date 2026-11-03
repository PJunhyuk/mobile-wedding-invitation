import { html, raw, lines, escapeHtml } from './lib/dom';
import {
  groom,
  bride,
  venue,
  locationNotice,
  invitation,
  photos,
  ceremony,
  accounts,
  type Photo,
  type Person,
  type AccountEntry,
} from './data/wedding';
import { when, dateLine, timeLine, monthGrid, ddayPhrase } from './lib/date';
import { naverWebUrl, kakaoWebUrl } from './lib/maps';
import { withBase } from './lib/site';

const hasParents = (p: Person) => p.parents.father.trim() !== '' || p.parents.mother.trim() !== '';

const picture = (
  p: Photo,
  extra: {
    loading?: 'lazy' | 'eager';
    className?: string;
    priority?: boolean;
    thumb?: boolean;
  } = {},
) =>
  html`<img
    class="${extra.className ?? ''}"
    src="${withBase(extra.thumb ? p.thumb : p.src)}"
    alt="${p.alt}"
    width="${p.width}" height="${p.height}"
    loading="${extra.loading ?? (extra.thumb ? 'lazy' : 'eager')}"
    decoding="async"
    draggable="false"
    ${raw(extra.priority ? 'fetchpriority="high"' : '')}
  />`;

/** 사진 프레임이 원본 비율을 따르게 하는 CSS 변수 (styles.css 의 --photo-ratio) */
const ratioStyle = (p: Photo) => `--photo-ratio: ${p.width / p.height}`;

/* ---------- 1. 표지 ---------- */
const cover = () => html`
  <section class="cover scene scene--still" id="cover" aria-labelledby="cover-title" data-scene="표지">
    <div class="cover__main">
      <figure class="cover__photo" data-photo-no-zoom>
        ${raw(picture(photos.cover, { priority: true, className: 'cover__img' }))}
      </figure>
      <div class="cover__story">
        <h1 class="cover__names" id="cover-title">
          <span class="cover__name">${groom.englishName}</span>
          <span class="cover__and" aria-hidden="true">&amp;</span>
          <span class="cover__name">${bride.englishName}</span>
          <span class="visually-hidden">결혼합니다</span>
        </h1>
        <span class="cover__rule" aria-hidden="true"></span>
        <p class="cover__date">
          <time datetime="${ceremony.start}">${dateLine} · ${timeLine}</time>
        </p>
        <p class="cover__venue">${venue.name}<br />${venue.hall}</p>
      </div>
    </div>
    <div class="cover__foot">
      <p class="cover__hint" id="scroll-hint" aria-hidden="true">
        <span class="cover__hint-line"></span>
        <span>SCROLL</span>
      </p>
    </div>
  </section>
`;

/* ---------- 2. 초대의 글 ---------- */
const inviteFamily = () => {
  const people = [groom, bride].filter(hasParents);
  if (people.length === 0) return '';
  return html`<div class="invite-family">
    ${raw(
      people
        .map(
          (p, index) => html`${index > 0 ? raw('<span class="invite-family__heart" aria-hidden="true">♡</span>') : ''}
            <div class="invite-family__side">
              <p class="invite-family__parents">${[p.parents.father, p.parents.mother].filter((name) => name.trim() !== '').join(' · ')}의 ${p.parents.label}</p>
              <p class="invite-family__name">${p.name}</p>
            </div>`,
        )
        .join(''),
    )}
  </div>`;
};

/** 인용 출처 줄 — 시인·제목이 둘 다 비어 있으면(직접 쓴 글) 표시하지 않습니다 */
const inviteSource = () => {
  const author = invitation.author.trim();
  const title = invitation.title.trim();
  if (author === '' && title === '') return '';
  const parts = [author, title === '' ? '' : `「${title}」`].filter((t) => t !== '');
  return html`<cite class="invite__source">${parts.join(' · ')}</cite>`;
};

const invite = () => html`
  <section class="page page--invite invite scene" id="invitation" aria-labelledby="invite-title" data-scene="초대의 글">
    <h2 class="scene__title invite__title" id="invite-title">INVITATION</h2>
    <div class="invite__copy" lang="ko">
      ${raw(invitation.stanzas.map((stanza) => `<p>${stanza.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</p>`).join(''))}
      ${raw(inviteSource())}
    </div>
    <span class="invite__rule" aria-hidden="true"></span>
    <p class="invite__message">${lines(invitation.message)}</p>
    ${raw(inviteFamily())}
  </section>
`;

/* ---------- 3. 대표 장면 ---------- */
const feature = () => html`
  <section class="feature scene scene--still" id="feature" aria-labelledby="feature-title" data-scene="대표 사진">
    <h2 class="visually-hidden" id="feature-title">대표 사진</h2>
    <figure class="feature__frame" data-photo-no-zoom>
      ${raw(picture(photos.feature, { className: 'feature__img' }))}
    </figure>
  </section>
`;

/* ---------- 4. 예식 안내 ---------- */
const calendar = () => {
  const cells = monthGrid(when.year, when.month);
  /* 표시는 머리글자 한 자, 안내 음성은 요일 이름 전체 (S 와 T 가 두 번씩 쓰입니다) */
  const heads = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return html`
    <table class="cal" aria-label="${when.year}년 ${when.month}월 달력">
      <thead>
        <tr>${raw(
          heads
            .map(
              (d, i) =>
                `<th scope="col"><span class="visually-hidden">${names[i]}요일</span><span aria-hidden="true">${d}</span></th>`,
            )
            .join(''),
        )}</tr>
      </thead>
      <tbody>
        ${raw(
          Array.from({ length: cells.length / 7 }, (_, r) => {
            const row = cells.slice(r * 7, r * 7 + 7);
            return `<tr>${row
              .map((d) => {
                if (d === null) return '<td></td>';
                const isDay = d === when.day;
                return `<td>${
                  isDay
                    ? `<span class="cal__mark" aria-current="date"><span class="visually-hidden">예식일 </span>${d}</span>`
                    : d
                }</td>`;
              })
              .join('')}</tr>`;
          }).join(''),
        )}
      </tbody>
    </table>
  `;
};

const info = () => {
  const [ddayEm, ddaySuffix] = ddayPhrase();
  return html`
    <section class="page page--info info scene" id="info" aria-labelledby="info-title" data-scene="예식일">
      <h2 class="scene__title info__title" id="info-title">WEDDING DAY</h2>
      <div class="info__body">
        <p class="info__line"><time datetime="${ceremony.start}">${dateLine} ${timeLine}</time></p>
        <div class="info__schedule">
          <div class="info__calendar-block">
            <p class="info__month">${when.month}<span class="visually-hidden">월</span></p>
            <div class="info__cal">${raw(calendar())}</div>
          </div>
          <div class="info__dday-block">
            <p class="dday__message"><span>${groom.name}</span><b aria-hidden="true">♡</b><span>${bride.name}</span>의 결혼식이 <strong>${ddayEm}</strong><span>${ddaySuffix}</span></p>
          </div>
        </div>
      </div>
    </section>
  `;
};

/* ---------- 5. 사진 — 선택 사진 + 가로 썸네일 스트립 ---------- */
const gallery = () => {
  const list = photos.gallery;
  const selected = list[0];
  if (!selected) return '';
  return html`
  <section class="page page--gallery gallery scene scene--still" id="gallery" aria-labelledby="gallery-title" data-scene="갤러리">
    <h2 class="scene__title gallery__title" id="gallery-title">GALLERY</h2>
    <figure class="gallery__featured" data-photo-no-zoom style="${ratioStyle(selected)}">
      ${raw(picture(selected, { className: 'gallery__featured-img' }))}
    </figure>
    <ol class="gallery__thumbs" data-photo-no-zoom aria-label="웨딩 사진 선택">
      ${raw(
        list
          .map(
            (p, index) => {
              const first = index === 0;
              return html`<li>
              <button
                type="button"
                class="gallery__thumb${first ? ' is-selected' : ''}"
                data-action="gallery-select"
                style="${ratioStyle(p)}"
                data-gallery-src="${withBase(p.src)}"
                aria-label="${p.alt}"
                aria-current="${String(first)}"
              >${raw(picture(p, { className: 'gallery__thumb-img', thumb: true }))}</button>
            </li>`;
            },
          )
          .join(''),
      )}
    </ol>
    <p class="visually-hidden" id="gallery-status" role="status" aria-live="polite"></p>
  </section>
`;
};

/* ---------- 6. 오시는 길 ---------- */
const location = () => html`
  <section class="page page--venue venue scene scene--long" id="location" aria-labelledby="venue-title" data-scene="오시는 길">
    <h2 class="scene__title" id="venue-title">LOCATION</h2>

    <div class="venue__head">
      <p class="venue__name">${venue.name}</p>
      <p class="venue__hall">${venue.hall}</p>
      <p class="venue__addr-main">${venue.address}</p>
    </div>

    <div class="location__map-links" role="group" aria-label="지도 앱 선택">
      <!-- 네이버는 같은 탭에서 앱을 직접 엽니다 (main.ts 가 data-naver-map 에 연결). 카카오는 새 창의 공유 링크. -->
      <a href="${naverWebUrl}" data-naver-map aria-label="네이버지도에서 ${venue.name}">네이버지도</a>
      <a href="${kakaoWebUrl}" target="_blank" rel="noopener noreferrer" aria-label="카카오지도에서 ${venue.name} 검색 (새 창)">카카오지도</a>
    </div>

    <div class="location__notice">
      <p class="location__notice-title">NOTICE</p>
      ${raw(
        locationNotice.lines
          .map((line) => `<p>${lines(Array.isArray(line) ? line : [line]).value}</p>`)
          .join(''),
      )}
      <p class="location__bus-lines">
        ${raw(
          locationNotice.busLines
            .map((bus) => `<span><b>${escapeHtml(bus.label)}</b><em>${escapeHtml(bus.numbers)}</em></span>`)
            .join(''),
        )}
      </p>
    </div>
  </section>
`;

/* ---------- 7. 마음 전하실 곳 ---------- */
const hasNumber = (e: AccountEntry) => e.number.trim() !== '';

const accountRow = (e: AccountEntry) => {
  const holder = (e.holder ?? '').trim() || e.name;
  const who = `${e.relation} ${e.name}`.trim();
  return html`
  <li class="account">
    <div class="account__body">
      <p class="account__who">
        <span class="account__label">예금주</span>
        <strong class="account__name">${holder}</strong>
      </p>
      <p class="account__num">
        <span class="account__label">계좌번호</span>
        <span class="account__details">
          <span class="account__bank">${e.bank}</span>
          <span class="account__digits">${e.number}</span>
        </span>
      </p>
    </div>
    <button
      type="button"
      class="account__copy"
      data-action="copy"
      data-copy="${e.number}"
      data-toast="계좌번호를 복사했습니다"
      aria-label="${who} ${e.bank} 계좌번호 복사"
    >
      복사
    </button>
  </li>
`;
};

const gift = () => {
  const groups = accounts.filter((g) => g.entries.some(hasNumber));
  if (groups.length === 0) return '';
  return html`
  <section class="page page--gift gift scene" id="gift" aria-labelledby="gift-title" data-scene="마음 전하실 곳" data-gift>
    <h2 class="scene__title" id="gift-title">WITH YOUR HEART</h2>
    <div class="gift__content">
      <p class="gift__heading">마음 전하실 곳</p>
      <p class="gift__message">기쁜 시작을 축복해주신 마음<br />오래도록 기억하겠습니다.</p>
      <div class="gift__accounts">
        <div class="gift__tabs" role="group" aria-label="계좌 구분">
          ${raw(
            groups
              .map(
                (group, index) =>
                  `<button type="button" data-action="gift-tab" data-gift-tab="${index}" aria-controls="gift-panel-${index}" aria-expanded="false">${escapeHtml(group.side.replace(' 측', ' 측에게'))}</button>`,
              )
              .join(''),
          )}
        </div>
        <div class="gift__panels">
          ${raw(
            groups
              .map(
                (group, index) =>
                  `<div id="gift-panel-${index}" data-gift-panel hidden><ul class="account-list">${group.entries
                    .filter(hasNumber)
                    .map(accountRow)
                    .join('')}</ul></div>`,
              )
              .join(''),
          )}
        </div>
      </div>
    </div>
  </section>
`;
};

/* ---------- 8. 마지막 장 ---------- */
const closing = () => html`
  <section class="page page--closing closing scene scene--still" id="closing" aria-labelledby="closing-title" data-scene="맺음말">
    <figure class="closing__photo" data-photo-no-zoom style="${ratioStyle(photos.closing)}">
      ${raw(picture(photos.closing, { className: 'closing__img', loading: 'lazy' }))}
    </figure>
    <div class="closing__inner">
      <h2 class="scene__title" id="closing-title">THANK YOU</h2>
      <div class="closing__actions">
        <button type="button" class="closing__action" data-action="share">공유하기</button>
        <button type="button" class="closing__action" data-action="copy-url">링크 복사</button>
      </div>
    </div>
  </section>
`;

export function renderApp(): string {
  /* 데이터가 비면 해당 섹션 함수가 빈 문자열을 돌려주고 그 장면은 사라집니다 */
  return [cover(), invite(), feature(), info(), gallery(), location(), gift(), closing()].join('');
}
