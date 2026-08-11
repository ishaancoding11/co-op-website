// Minimal, uniform line icons for meta rows, media placeholders and status
// glyphs — same 24px grid / 1.6 stroke / currentColor language as CategoryIcon.
// Keeps the UI free of decorative colour emoji while staying quiet and neutral.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

type IconName = 'pin' | 'price' | 'video' | 'audio' | 'link' | 'check' | 'mic' | 'lock' | 'mail' | 'bell' | 'sparkle' | 'message' | 'inbox' | 'clipboard' | 'star';

const PATHS: Record<IconName, React.ReactNode> = {
  pin: (<><path d="M12 21c4.5-4.2 6.5-7.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 13.6 7.5 16.8 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></>),
  price: (<><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7 7a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0l-7-7Z" /><circle cx="8.5" cy="8.5" r="1.1" /></>),
  video: (<><rect x="3" y="7" width="12" height="10" rx="2" /><path d="M15 10.5 21 7.5v9L15 13.5Z" /></>),
  audio: (<><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>),
  link: (<><path d="M9.5 14.5 14.5 9.5" /><path d="M8 12 6 14a3 3 0 0 0 4.2 4.2l2-2" /><path d="M16 12l2-2a3 3 0 0 0-4.2-4.2l-2 2" /></>),
  check: (<path d="M5 12.5 10 17.5 19 7" />),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v4" /></>),
  lock: (<><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>),
  mail: (<><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></>),
  bell: (<><path d="M6 16V10.5a6 6 0 0 1 12 0V16l1.5 2.5h-15Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  sparkle: (<><path d="M12 3c.6 4 1.8 5.2 5.8 5.8-4 .6-5.2 1.8-5.8 5.8-.6-4-1.8-5.2-5.8-5.8 4-.6 5.2-1.8 5.8-5.8Z" /><path d="M18 15.5c.3 1.8.9 2.4 2.7 2.7-1.8.3-2.4.9-2.7 2.7-.3-1.8-.9-2.4-2.7-2.7 1.8-.3 2.4-.9 2.7-2.7Z" /></>),
  message: (<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V6Z" />),
  inbox: (<><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M4 13 6.5 5.5A1.5 1.5 0 0 1 8 4.5h8a1.5 1.5 0 0 1 1.4 1L20 13v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" /></>),
  clipboard: (<><rect x="5" y="5" width="14" height="16" rx="2" /><rect x="9" y="3" width="6" height="4" rx="1.2" /><path d="M8.5 12h7M8.5 15.5h5" /></>),
  star: (<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z" />),
};

export type { IconName };

export function LineIcon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...P} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

// Maps a portfolio piece to its placeholder glyph when there's no image.
export function mediaIcon(mediaType: string, source?: string): IconName {
  if (mediaType === 'video') return 'video';
  if (mediaType === 'audio') return 'audio';
  if (source === 'completed_job') return 'check';
  return 'link';
}
