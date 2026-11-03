/**
 * 청첩장의 모든 교체 가능 정보는 이 파일 한 곳에서 관리합니다.
 * 아래 값은 전부 자리표시자(placeholder)입니다 — 그대로 배포하지 말고 본인 정보로 바꾸세요.
 *
 * ⚠️ 이 파일의 값은 빌드되어 웹 소스(자바스크립트 번들)에 그대로 공개됩니다.
 *    계좌번호·연락처 등 공개해도 되는 정보만 넣으세요.
 *
 * 확인되지 않은 값은 추측해서 채우지 않고 빈 문자열로 둡니다.
 * 비어 있는 항목(혼주 성함·계좌·초대의 글 출처)은 화면에서 자동으로 숨겨집니다.
 *
 * 화면 문구(이름·초대의 글 등)를 바꾼 뒤에는 글꼴 서브셋을 확인하세요 — README '글꼴' 참고.
 * 기본 서브셋은 KS X 1001 한글 2,350자를 담고 있어 흔한 이름·문장은 그대로 나옵니다.
 */

export interface Person {
  /** 화면에 표시되는 이름 (성 제외 가능) */
  name: string;
  /** 성을 포함한 전체 이름 */
  fullName: string;
  /** 표지 영문 조판용 이름 */
  englishName: string;
  parents: { father: string; mother: string; label: string };
}

export const groom: Person = {
  name: '민준',
  fullName: '김민준',
  englishName: 'MINJUN KIM',
  parents: { father: '김영수', mother: '박미영', label: '아들' },
};

export const bride: Person = {
  name: '서연',
  fullName: '이서연',
  englishName: 'SEOYEON LEE',
  parents: { father: '이정호', mother: '최은정', label: '딸' },
};

/* ---------- 마음 전하실 곳 ---------- */

export interface AccountEntry {
  /** 관계 (신랑 / 신랑 아버지 / …) */
  relation: string;
  /** 성함 */
  name: string;
  /** 은행명 — 예: '국민은행' */
  bank: string;
  /** 계좌번호 — 비어 있으면 이 행은 화면에 표시되지 않습니다 */
  number: string;
  /** 예금주 — 비어 있으면 name 을 사용 */
  holder?: string;
}

export interface AccountGroup {
  /** 접기 제목에 쓰이는 측 이름 */
  side: string;
  entries: AccountEntry[];
}

/**
 * 표시 규칙: number 가 빈 행은 숨김 → 한쪽 entries 가 전부 비면 그 측 접기 숨김 → 전부 비면 섹션 자체 숨김.
 * 은행명이 확인되지 않은 항목은 bank만 비워 두며, 계좌번호가 있으면 행은 표시합니다.
 * 아래 계좌번호는 형식만 보여 주는 자리표시자입니다.
 */
export const accounts: AccountGroup[] = [
  {
    side: '신랑 측',
    entries: [
      { relation: '신랑', name: groom.fullName, bank: '○○은행', number: '000-000000-00-000' },
      { relation: '신랑 아버지', name: groom.parents.father, bank: '○○은행', number: '000-000000-00-000' },
      { relation: '신랑 어머니', name: groom.parents.mother, bank: '○○은행', number: '000-000000-00-000' },
    ],
  },
  {
    side: '신부 측',
    entries: [
      { relation: '신부', name: bride.fullName, bank: '○○은행', number: '000-000000-00-000' },
      { relation: '신부 아버지', name: bride.parents.father, bank: '○○은행', number: '000-000000-00-000' },
      { relation: '신부 어머니', name: bride.parents.mother, bank: '○○은행', number: '000-000000-00-000' },
    ],
  },
];

/** 예식 일시 (KST). ISO 8601 + 오프셋을 반드시 포함하세요. */
export const ceremony = {
  start: '2027-05-15T13:00:00+09:00',
  timeZone: 'Asia/Seoul',
};

/**
 * 예식장 — 교통 안내는 예식장 공식 안내를 기준으로 적으세요.
 */
export const venue = {
  name: '○○웨딩홀',
  hall: '3층 그랜드홀',
  address: '서울특별시 중구 세종대로 110',
  /** 지번 주소 (주차장 입구 안내 등에 쓰입니다) */
  addressLot: '서울특별시 중구 태평로1가 31',
  /** 예식장 문의 전화 */
  phone: '02-000-0000',
  /** 지도 표시용 좌표 — 자리표시자는 서울시청입니다 */
  coords: { lat: 37.5665, lng: 126.978 },
  /**
   * 지도 앱 링크 — 각 앱의 '공유 > 링크 복사'로 얻은 URL.
   * 카카오는 비어 있으면 src/lib/maps.ts 가 장소명 검색 URL을 씁니다.
   */
  map: {
    /** 네이버지도 공유 링크 (기록용 — 버튼은 아래 naverPlaceId 를 씁니다) */
    naver: '',
    /**
     * 네이버 장소 ID — 앱을 바로 열려면 공유 링크가 아닌 ID가 필요합니다 (src/lib/maps.ts).
     * 공유 링크(naver.me/…)가 리디렉션하는 주소의 pinId 값입니다. 장소를 바꾸면 둘을 함께 바꾸세요.
     * 비어 있으면 버튼은 장소명 검색 화면으로만 가고 앱 바로 열기는 하지 않습니다.
     */
    naverPlaceId: '',
    kakao: '',
  },
};

/**
 * 오시는 길 NOTICE — location 섹션에 표시되는 유일한 교통 안내 원본입니다.
 * (예식장 공식 안내 기준으로 적으세요. 여기만 고치면 화면에 그대로 반영됩니다.)
 */
export const locationNotice = {
  /** 문자열 배열 항목은 <br>로 줄바꿈되어 한 문단으로 표시됩니다. */
  lines: [
    '무료주차는 2시간이며, 초과 시 주차비가 발생합니다.',
    ['지하철 1·2호선 시청역 5번 출구에서 도보 3분이며,', '주말에는 역 앞에서 셔틀버스가 운행됩니다.'],
    '버스는 시청앞 정류장에서 하차해 주세요.',
  ] as (string | string[])[],
  busLines: [
    { label: '간선(파랑)', numbers: '101, 150, 401, 402' },
    { label: '지선(초록)', numbers: '1711, 7016, 7022' },
    { label: '직행(빨강)', numbers: '9401, 9701' },
    { label: '경기일반', numbers: '1000, 1200' },
  ],
};

/**
 * 초대의 글.
 *  - stanzas: 명조로 조판되는 인용문(시 등). 연마다 행 배열이고, 행 구분은 이 배열 그대로 화면에 나옵니다.
 *  - author/title: 인용 출처. 둘 다 비어 있으면 출처 줄이 숨겨집니다.
 *    저작권이 살아 있는 시를 넣을 때는 인용 범위와 출처 표기를 확인하세요.
 *  - message: 인용문 아래의 초대 문구. 배열 항목마다 줄바꿈됩니다.
 */
export const invitation = {
  stanzas: [
    ['두 사람이 만나', '하나의 계절을 이루기까지', '많은 분들의 사랑이 있었습니다.'],
    ['이제 서로의 손을 잡고', '같은 길을 걸어가려 합니다.', '그 첫걸음을 함께 지켜봐 주세요.'],
  ],
  author: '',
  title: '',
  message: ['서로의 계절을 오래 바라보다', '이제 같은 집으로 돌아가려 합니다.', '새로운 시작을 알리는 날,', '소중한 분들을 정중히 초대합니다.'],
};

/* ---------- 사진 ---------- */

export interface Photo {
  src: string;
  /** 갤러리 스트립용 축소본 (scripts/thumbs.mjs 로 생성) */
  thumb: string;
  alt: string;
  /** 원본 크기 — 프레임이 이 비율을 그대로 따르므로 사진은 잘리지 않습니다 */
  width: number;
  height: number;
}

/**
 * 사진 하나를 정의합니다. 파일은 public/images/<file>.webp 에 있어야 합니다.
 * 경로는 / 로 시작합니다 — 서버가 /foo/ 같은 주소에도 이 페이지를 돌려주므로 상대 경로는 그런 주소에서 깨집니다.
 * 파일명은 한번 정하면 바꾸지 않는 것을 권합니다 (예: <가져온 날짜>-<원본 id>-<원본 sha256 앞 8자>). 역할과 순서는 파일명이 아니라 이 파일이 정합니다.
 * 교체할 때: 파일을 public/images/ 에 넣고 `npm run thumbs` 를 실행한 뒤 아래 항목을 바꾸고, 더 쓰지 않는 옛 파일은 지웁니다 (check:content 가 잡습니다).
 * 크기를 생략하면 3:4 세로 크롭(1500×2000)으로 봅니다.
 *
 * 지금 들어 있는 파일은 `npm run placeholders` 가 만든 자리표시 이미지입니다. 실제 사진으로 바꾸세요.
 */
const img = (file: string, alt: string, width = 1500, height = 2000): Photo => ({
  src: `/images/${file}.webp`,
  thumb: `/images/thumbs/${file}.webp`,
  alt,
  width,
  height,
});

/** 사진 — 몇 장인지는 check:content 가 세어 줍니다. */
export const photos = {
  /** 표지 */
  cover: img('placeholder-cover', '표지 사진 자리'),
  /** 대표 장면 */
  feature: img('placeholder-feature', '대표 사진 자리'),
  /** 갤러리 — 배열 순서가 곧 썸네일 스트립 순서입니다. */
  gallery: [
    img('placeholder-gallery-01', '갤러리 사진 1'),
    img('placeholder-gallery-02', '갤러리 사진 2'),
    img('placeholder-gallery-03', '갤러리 사진 3'),
    img('placeholder-gallery-04', '갤러리 사진 4'),
    img('placeholder-gallery-05', '갤러리 사진 5'),
    img('placeholder-gallery-06', '갤러리 사진 6'),
    img('placeholder-gallery-07', '갤러리 사진 7'),
    img('placeholder-gallery-08', '갤러리 사진 8'),
  ],
  /** 마지막 장 */
  closing: img('placeholder-closing', '맺음말 사진 자리'),
};

export const share = {
  title: '김민준 ♥ 이서연 결혼합니다',
  description: '2027년 5월 15일 토요일 오후 1시 ○○웨딩홀',
  /** 배포 URL (OG 태그와 공유 링크에 사용) — 배포한 주소로 바꾸세요 */
  url: 'https://example.com/',
  ogImage: '/og.jpg',
};
