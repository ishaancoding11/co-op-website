export type CreativeCategory =
  | 'photographer' | 'graphic_designer' | 'videographer' | 'brand_designer'
  | 'muralist' | 'content_creator' | 'musician';

export const CATEGORY_LABELS: Record<CreativeCategory, string> = {
  photographer: 'Photographer',
  graphic_designer: 'Graphic Designer',
  videographer: 'Videographer',
  brand_designer: 'Brand / Logo Designer',
  muralist: 'Muralist / Painter',
  content_creator: 'Content Creator',
  musician: 'Musician / Performer',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CreativeCategory[];

// ===== Currency =====
export type Currency = 'USD' | 'KZT';
export type Country = 'US' | 'KZ';

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', KZT: '₸' };

// City/region-level locations for the dropdowns, grouped by area (pilot city first).
// Sub-neighborhoods (e.g. Corona del Mar, Balboa Island) are intentionally folded
// into their parent city — see NOTES.md.
export const LOCATION_GROUPS: Record<string, string[]> = {
  Pilot: ['Newport Beach'],
  'Orange County': [
    'Costa Mesa', 'Irvine', 'Laguna Beach', 'Huntington Beach', 'Dana Point',
    'San Clemente', 'Tustin', 'Anaheim', 'Fullerton',
  ],
  'Los Angeles': [
    'Los Angeles', 'Santa Monica', 'Culver City', 'West Hollywood',
    'Pasadena', 'Long Beach', 'Manhattan Beach',
  ],
  'San Diego': ['San Diego', 'Encinitas', 'Carlsbad', 'Oceanside', 'Del Mar'],
  'Bay Area': [
    'San Francisco', 'Oakland', 'Berkeley', 'San Jose', 'Palo Alto',
    'Mountain View', 'Marin County', 'Walnut Creek', 'Santa Cruz',
  ],
  'Central & Northern CA': [
    'Sacramento', 'Fresno', 'Santa Barbara', 'San Luis Obispo', 'Monterey',
  ],
  Kazakhstan: [
    'Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz',
    'Pavlodar', 'Oskemen', 'Semey', 'Atyrau', 'Kostanay', 'Kyzylorda', 'Aktau',
  ],
};

export const NEIGHBORHOODS = Object.values(LOCATION_GROUPS).flat();

// Cities that settle in tenge. Everything else defaults to USD. Kept in sync
// with currency_for_place() in migration 0011 so a job's displayed currency
// matches the one stored on the row.
export const KZ_CITIES = new Set(LOCATION_GROUPS.Kazakhstan);

export function currencyForPlace(place: string | null | undefined): Currency {
  return place && KZ_CITIES.has(place) ? 'KZT' : 'USD';
}

export function countryForPlace(place: string | null | undefined): Country {
  return currencyForPlace(place) === 'KZT' ? 'KZ' : 'US';
}

// A business's government registration id: a US EIN (9 digits, usually written
// XX-XXXXXXX) or a Kazakhstan БИН (12 digits). Co-op calls no registry to
// confirm the number is real — there is no free one — so this only checks the
// *shape* per country, enough to catch a typo or a phone number typed in the
// wrong box. The stored value is normalised to digits only.
export function registrationLabelFor(country: Country): string {
  return country === 'KZ' ? 'БИН' : 'EIN';
}

/**
 * Validate + normalise a registration number for a country. Returns the
 * digits-only value to store, or an error message describing the expected shape.
 * An empty input is allowed (the field is optional) and returns { value: null }.
 */
export function validateRegistrationNumber(
  raw: string | null | undefined,
  country: Country,
): { value: string | null; error?: string } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { value: null };
  const digits = trimmed.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) {
    return { value: null, error: `${registrationLabelFor(country)} should contain only digits.` };
  }
  const expected = country === 'KZ' ? 12 : 9;
  if (digits.length !== expected) {
    return { value: null, error: `${registrationLabelFor(country)} must be ${expected} digits.` };
  }
  return { value: digits };
}

// Approximate centroids for snapping browser geolocation to the nearest city.
// Soft convenience signal only — never used for verification.
export const CITY_COORDS: Record<string, [number, number]> = {
  'Newport Beach': [33.6189, -117.9298], 'Costa Mesa': [33.6412, -117.9187],
  Irvine: [33.6846, -117.8265], 'Laguna Beach': [33.5427, -117.7854],
  'Huntington Beach': [33.6595, -117.9988], 'Dana Point': [33.4672, -117.6981],
  'San Clemente': [33.427, -117.612], Tustin: [33.7458, -117.8261],
  Anaheim: [33.8366, -117.9143], Fullerton: [33.8704, -117.9242],
  'Los Angeles': [34.0522, -118.2437], 'Santa Monica': [34.0195, -118.4912],
  'Culver City': [34.0211, -118.3965], 'West Hollywood': [34.09, -118.3617],
  Pasadena: [34.1478, -118.1445], 'Long Beach': [33.7701, -118.1937],
  'Manhattan Beach': [33.8847, -118.4109],
  'San Diego': [32.7157, -117.1611], Encinitas: [33.037, -117.292],
  Carlsbad: [33.1581, -117.3506], Oceanside: [33.1959, -117.3795], 'Del Mar': [32.9595, -117.2653],
  'San Francisco': [37.7749, -122.4194], Oakland: [37.8044, -122.2712],
  Berkeley: [37.8715, -122.273], 'San Jose': [37.3382, -121.8863],
  'Palo Alto': [37.4419, -122.143], 'Mountain View': [37.3861, -122.0839],
  'Marin County': [38.0834, -122.7633], 'Walnut Creek': [37.9101, -122.0652],
  'Santa Cruz': [36.9741, -122.0308],
  Sacramento: [38.5816, -121.4944], Fresno: [36.7378, -119.7871],
  'Santa Barbara': [34.4208, -119.6982], 'San Luis Obispo': [35.2828, -120.6596],
  Monterey: [36.6002, -121.8947],
  Almaty: [43.222, 76.8512], Astana: [51.1605, 71.4704], Shymkent: [42.3417, 69.5901],
  Karaganda: [49.8047, 73.1094], Aktobe: [50.2839, 57.167], Taraz: [42.9, 71.3667],
  Pavlodar: [52.2871, 76.9674], Oskemen: [49.9714, 82.6059], Semey: [50.4111, 80.2275],
  Atyrau: [47.0945, 51.9238], Kostanay: [53.2144, 63.6246], Kyzylorda: [44.8479, 65.4823],
  Aktau: [43.6525, 51.1575],
};

export const WEEKDAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

export type UserRow = { id: string; display_name: string | null; email: string | null };

export type CreativeProfile = {
  user_id: string; bio: string | null; neighborhood: string | null;
  categories: CreativeCategory[]; rate_min: number | null; rate_max: number | null;
  availability: string | null; available_days?: string[]; response_time_hours: number | null;
  avatar_url: string | null; is_public: boolean; currency?: Currency;
  users?: UserRow;
};

export type BusinessProfile = {
  user_id: string; business_name: string; category: string | null; neighborhood: string | null;
  needs: CreativeCategory[]; needs_description?: string | null; budget_band: string | null;
  budget_min?: number | null; budget_max?: number | null; currency?: Currency;
  registration_number?: string | null;
  brand_vibe_tags: string[] | null;
  logo_url: string | null; verification_email: string | null;
  is_verified: boolean; verified_at: string | null;
  users?: UserRow;
};

export type Job = {
  id: string; business_id: string; title: string; description: string;
  category: CreativeCategory; budget_min: number | null; budget_max: number | null;
  deadline: string | null; location: string | null; currency?: Currency;
  status: 'open' | 'in_progress' | 'completed' | 'closed'; created_at: string;
  business_profiles?: BusinessProfile;
};

export type Match = {
  id: string; business_id: string; creative_id: string; job_id: string | null;
  source: 'swipe' | 'job_apply' | 'direct'; pitch: string | null;
  pitch_portfolio_ids: string[];
  business_action: 'liked' | 'passed' | null; creative_action: 'liked' | 'passed' | null;
  application_status: 'applied' | 'shortlisted' | 'accepted' | 'declined' | null;
  is_matched: boolean; matched_at: string | null; created_at: string;
};

export type Message = { id: string; match_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export type Agreement = {
  id: string; match_id: string; business_id: string; creative_id: string;
  job_id: string | null; package_id: string | null; scope: string | null;
  agreed_price: number | null; currency?: Currency;
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  completed_by_business_at: string | null; completed_by_creative_at: string | null;
  created_at: string;
};

export type Review = {
  id: string; agreement_id: string; reviewer_id: string; reviewee_id: string;
  stars: number; body: string | null; created_at: string; users?: UserRow;
};

export type PortfolioItem = {
  id: string; creative_id: string; media_url: string | null;
  media_type: 'image' | 'video' | 'audio' | 'link'; caption: string | null;
  source: 'uploaded' | 'completed_job'; job_id: string | null;
  is_hidden: boolean; is_favorite?: boolean; sort_order: number; created_at: string;
};

export type Package = {
  id: string; creative_id: string; tier: 'basic' | 'standard' | 'premium';
  title: string; deliverables: string[]; turnaround_days: number | null;
  revisions: number | null; price: number; currency?: Currency;
};

export type MusicianDetails = {
  creative_id: string; venues: { name: string; event?: string; date?: string }[];
  audio_links: string[]; video_links: string[];
  rate_per_set_min: number | null; rate_per_set_max: number | null;
};

export type Notification = {
  id: string; user_id: string; type: string;
  content: { title?: string; body?: string; href?: string };
  is_read: boolean; created_at: string;
};

// Money is an indicative range (a budget/rate), never a charged amount, so it is
// shown in whole units with the row's own currency symbol. `currency` defaults
// to USD so any not-yet-updated caller still renders correctly for the pilot.
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString('en-US')}`;
}

export function priceRange(min: number | null, max: number | null, currency: Currency = 'USD') {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
  return formatMoney((min ?? max) as number, currency);
}

// Privacy: creatives are shown to other people as "First L." (never a full name),
// so they can't easily be searched up externally from their Co-op presence.
// Only the account owner sees their own full name (nav, settings, edit forms).
export function displayNameFor(fullName: string | null | undefined): string {
  const name = (fullName ?? '').trim();
  if (!name) return 'Creative';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
