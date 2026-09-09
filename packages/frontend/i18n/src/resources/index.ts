import en from './en.json' with { type: 'json' };

export type Language =
  | 'en'
  | 'zh-Hans'
  | 'zh-Hant'
  | 'fr'
  | 'es'
  | 'es-AR'
  | 'es-CL'
  | 'pl'
  | 'de'
  | 'ru'
  | 'ja'
  | 'it'
  | 'ca'
  | 'da'
  | 'hi'
  | 'sv-SE'
  | 'ur'
  | 'ar'
  | 'uk'
  | 'ko'
  | 'pt-BR'
  | 'fa'
  | 'nb-NO'
  | 'kk'
  | 'tr';

export type LanguageResource = typeof en;
export const SUPPORTED_LANGUAGES: Record<
  Language,
  {
    name: string;
    originalName: string;
    flagEmoji: string;
    rtl?: boolean;
    resource:
      | LanguageResource
      | (() => Promise<{ default: Partial<LanguageResource> }>);
  }
> = {
  en: {
    name: 'English',
    originalName: 'English',
    flagEmoji: '🇬🇧',
    resource: en,
  },
  ko: {
    name: 'Korean (South Korea)',
    originalName: '한국어(대한민국)',
    flagEmoji: '🇰🇷',
    resource: () => import('./ko.json'),
  },
  'pt-BR': {
    name: 'Portuguese (Brazil)',
    originalName: 'português (Brasil)',
    flagEmoji: '🇧🇷',
    resource: () => import('./pt-BR.json'),
  },
  'zh-Hans': {
    name: 'Simplified Chinese',
    originalName: '简体中文',
    flagEmoji: '🇨🇳',
    resource: () => import('./zh-Hans.json'),
  },
  'zh-Hant': {
    name: 'Traditional Chinese',
    originalName: '繁體中文',
    flagEmoji: '🇭🇰',
    resource: () => import('./zh-Hant.json'),
  },
  fr: {
    name: 'French',
    originalName: 'français',
    flagEmoji: '🇫🇷',
    resource: () => import('./fr.json'),
  },
  es: {
    name: 'Spanish',
    originalName: 'español',
    flagEmoji: '🇪🇸',
    resource: () => import('./es.json'),
  },
  'es-AR': {
    name: 'Spanish (Argentina)',
    originalName: 'español (Argentina)',
    flagEmoji: '🇦🇷',
    resource: () => import('./es-AR.json'),
  },
  'es-CL': {
    name: 'Spanish (Chile)',
    originalName: 'español (Chile)',
    flagEmoji: '🇨🇱',
    resource: () => import('./es-CL.json'),
  },
  pl: {
    name: 'Polish',
    originalName: 'Polski',
    flagEmoji: '🇵🇱',
    resource: () => import('./pl.json'),
  },
  de: {
    name: 'German',
    originalName: 'Deutsch',
    flagEmoji: '🇩🇪',
    resource: () => import('./de.json'),
  },
  ru: {
    name: 'Russian',
    originalName: 'русский',
    flagEmoji: '🇷🇺',
    resource: () => import('./ru.json'),
  },
  ja: {
    name: 'Japanese',
    originalName: '日本語',
    flagEmoji: '🇯🇵',
    resource: () => import('./ja.json'),
  },
  it: {
    name: 'Italian',
    originalName: 'italiano',
    flagEmoji: '🇮🇹',
    resource: () => import('./it.json'),
  },
  ca: {
    name: 'Catalan',
    originalName: 'català',
    flagEmoji: '🇦🇩',
    resource: () => import('./ca.json'),
  },
  da: {
    name: 'Danish',
    originalName: 'dansk',
    flagEmoji: '🇩🇰',
    resource: () => import('./da.json'),
  },
  hi: {
    name: 'Hindi',
    originalName: 'हिन्दी',
    flagEmoji: '🇮🇳',
    resource: () => import('./hi.json'),
  },
  'sv-SE': {
    name: 'Swedish (Sweden)',
    originalName: 'svenska (Sverige)',
    flagEmoji: '🇸🇪',
    resource: () => import('./sv-SE.json'),
  },
  ur: {
    name: 'Urdu',
    originalName: 'اردو',
    flagEmoji: '🇵🇰',
    rtl: true,
    resource: () => import('./ur.json'),
  },
  ar: {
    name: 'Arabic',
    originalName: 'العربية',
    flagEmoji: '🇸🇦',
    rtl: true,
    resource: () => import('./ar.json'),
  },
  fa: {
    name: 'Persian',
    originalName: 'فارسی',
    flagEmoji: '🇮🇷',
    rtl: true,
    resource: () => import('./fa.json'),
  },
  uk: {
    name: 'Ukrainian',
    originalName: 'українська',
    flagEmoji: '🇺🇦',
    resource: () => import('./uk.json'),
  },
  'nb-NO': {
    name: 'Norwegian',
    originalName: 'Norsk (Bokmål)',
    flagEmoji: '🇳🇴',
    resource: () => import('./nb-NO.json'),
  },
  kk: {
    name: 'Kazakh',
    originalName: 'Қазақша',
    flagEmoji: '🇰🇿',
    resource: () => import('./kk.json'),
  },
  tr: {
    name: 'Turkish',
    originalName: 'Türkçe',
    flagEmoji: '🇹🇷',
    resource: () => import('./tr.json'),
  },
};

// ─── 浏览器语言识别 ────────────────────────────────────────────────────────
// 上游没有任何检测，首次访问一律落到英文，用户必须手动切一次才会被记住。
// 这里按 navigator.languages 的优先级顺序做三级匹配。

/**
 * 中文的 BCP 47 标签同时存在“地区”和“字形”两种写法，而资源只按字形拆分，
 * 需要单独归并：zh-CN / zh-SG / zh-MY → 简体，zh-TW / zh-HK / zh-MO → 繁体。
 * 裸 zh 按大陆用户占多数处理，归到简体。
 */
const CHINESE_REGION_TO_SCRIPT: Record<string, Language> = {
  cn: 'zh-Hans',
  sg: 'zh-Hans',
  my: 'zh-Hans',
  hans: 'zh-Hans',
  tw: 'zh-Hant',
  hk: 'zh-Hant',
  mo: 'zh-Hant',
  hant: 'zh-Hant',
};

function matchLanguage(tag: string): Language | null {
  const normalized = tag.trim();
  if (!normalized) return null;

  // 1. 精确命中，如 zh-Hans / pt-BR / es-AR
  const exact = Object.keys(SUPPORTED_LANGUAGES).find(
    key => key.toLowerCase() === normalized.toLowerCase()
  );
  if (exact) return exact as Language;

  const [base, region] = normalized.toLowerCase().split('-');

  // 2. 中文归并
  if (base === 'zh') {
    return CHINESE_REGION_TO_SCRIPT[region ?? ''] ?? 'zh-Hans';
  }

  // 3. 退到主语言段，如 en-US → en、es-MX → es
  return base in SUPPORTED_LANGUAGES ? (base as Language) : null;
}

/**
 * 按浏览器偏好顺序返回首个受支持的语言；全部落空时回退英文。
 */
export function detectBrowserLanguage(): Language {
  const tags =
    typeof navigator === 'undefined'
      ? []
      : (navigator.languages ?? [navigator.language]).filter(Boolean);

  for (const tag of tags) {
    const matched = matchLanguage(tag);
    if (matched) return matched;
  }

  return 'en';
}
