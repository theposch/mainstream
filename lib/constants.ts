// Masonry Grid Breakpoints
export const MASONRY_BREAKPOINTS = {
  default: 5,
  1920: 5,
  1600: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
} as const;

// Animation Durations (in seconds)
export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  spring: 0.5,
} as const;

// Easing Functions
export const ANIMATION_EASING = {
  easeInOut: 'easeInOut',
  easeOut: 'easeOut',
  easeIn: 'easeIn',
  spring: 'spring',
} as const;

// Z-Index Layers
export const Z_INDEX = {
  navbar: 50,
  modal: 100,
  dropdown: 60,
  tooltip: 70,
} as const;

// Button Styles (for consistent styling)
export const BUTTON_STYLES = {
  primary: "bg-white text-black hover:bg-zinc-200 rounded-full font-medium",
  secondary: "bg-zinc-900 hover:bg-zinc-800 text-white rounded-full",
  icon: "p-2 rounded-full text-zinc-400 hover:text-white transition-colors",
  iconWithBg: "p-2 bg-black/50 hover:bg-zinc-800 rounded-full text-white transition-colors backdrop-blur-md",
} as const;

// Image Sizes for Responsive Loading
export const IMAGE_SIZES = {
  thumbnail: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  full: "100vw",
  avatar: "64px",
} as const;

// Keyboard Keys
export const KEYS = {
  escape: 'Escape',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  enter: 'Enter',
  tab: 'Tab',
  space: ' ',
} as const;

// Routes
export const ROUTES = {
  home: '/home',
  library: '/library',
  asset: (id: string) => `/e/${id}`,
  project: (id: string) => `/project/${id}`,
  user: (username: string) => `/u/${username}`,
  team: (slug: string) => `/t/${slug}`,
} as const;

