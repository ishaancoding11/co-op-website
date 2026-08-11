import type { CreativeCategory } from '@/lib/types';

// Minimal, uniform line icons — 24px grid, 1.6 stroke, currentColor.
// One quiet visual per category; no emoji, no fill.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<CreativeCategory, React.ReactNode> = {
  photographer: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l1-1.6A1 1 0 0 1 9 5h6a1 1 0 0 1 .8.4l1 1.6h1.7A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  graphic_designer: (
    <>
      <path d="M4 20c0-2 1-4.5 3-6.5l7.5-7.5a2 2 0 0 1 3 3L10 16.5C8 18.5 6 19.5 4 20Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </>
  ),
  videographer: (
    <>
      <rect x="3" y="7" width="12" height="10" rx="2" />
      <path d="M15 10.5 21 7.5v9L15 13.5Z" />
    </>
  ),
  brand_designer: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  muralist: (
    <>
      <rect x="3.5" y="4.5" width="12" height="6" rx="1.5" />
      <path d="M15.5 7.5H19a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 19 12.5h-6.5" />
      <path d="M12.5 12.5V15a1.5 1.5 0 0 1-1.5 1.5H10a1 1 0 0 0-1 1V20" />
    </>
  ),
  content_creator: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  musician: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
};

export function CategoryIcon({ category, size = 22 }: { category: CreativeCategory; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...P} aria-hidden>
      {PATHS[category]}
    </svg>
  );
}
