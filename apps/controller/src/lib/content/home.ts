/**
 * The marketing copy deck, verbatim from `evidence-dumps/home-page/file`.
 *
 * Plain module data, not `$state`: nothing here ever changes at runtime, and the
 * best-practice guidance is to reserve `$state` for values that actually drive an
 * update. Keeping it out of a component also means the copy can be diffed against
 * the reference without reading markup.
 */

export interface Feature {
  /** filename under /public/images/circle-icons/one-color/ */
  readonly icon: 'locked' | 'cloud' | 'browser';
  readonly alt: string;
  readonly title: string;
  /** Verbatim inline alignment from the original markup; absent means inherited. */
  readonly titleAlign?: 'center';
  readonly lines: readonly string[];
}

export const HERO_HEADLINE = 'Web-based Trading Room for Professionals';

export const FEATURES: readonly Feature[] = [
  {
    icon: 'locked',
    alt: '',
    title: 'Rooms are encrypted & secured',
    lines: ['All communications use encryption.', 'Encrypted video, audio, and text']
  },
  {
    icon: 'cloud',
    alt: '',
    title: 'Cloud Based',
    titleAlign: 'center',
    lines: [
      'No software to install, update, or maintain.',
      'Presenters and Users log in from their web enabled devices'
    ]
  },
  {
    icon: 'browser',
    alt: '',
    title: 'Runs from the web browser. No Flash! No Java!. Pure HTML5 solution.',
    titleAlign: 'center',
    lines: ['There is no expensive hardware or software to buy.']
  }
];

export const TESTIMONIALS_HEADING = 'Real user comments after switching to ProTradingRoom:';

export const TESTIMONIALS: readonly string[] = [
  'Looks way cleaner and sounds great!',
  'WOW absolutely no Lag!',
  'Crisper charts!',
  'The audio quality is so much better!',
  'Yes! Way better than Omnovia',
  'PC resources much healthier. Webinato slowed me right down!',
  'I like it a lot more!'
];

export const MOBILE = {
  heading: 'Connect to the trading room from mobile devices',
  body: 'ProTradingRoom works from the mobile browser on Android, iOS, and other devices.'
} as const;

export const CTA_HEADING = 'Need to talk to somebody to get more information about pricing and custom integrations?';

/** Intrinsic dimensions used where attributes do not alter the captured sizing behavior. */
export const IMAGE_SIZES = {
  brand: { w: 88, h: 55 },
  brandDark: { w: 128, h: 80 },
  hero: { w: 1440, h: 956 },
  comments: { w: 1297, h: 1273 },
  mobile: { w: 326, h: 297 },
  icon: { w: 128, h: 128 }
} as const;
