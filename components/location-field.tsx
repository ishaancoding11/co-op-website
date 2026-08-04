'use client';

import { useState } from 'react';
import { CITY_COORDS, LOCATION_GROUPS } from '@/lib/types';
import { IconPin } from './ui';
import { Dropdown } from './dropdown';

type GeoState = 'idle' | 'asking' | 'granted' | 'denied';

/**
 * City select + optional browser geolocation. On "Use my location" we ask for the
 * standard permission, snap the dropdown to the nearest known city, and submit
 * lat/lng as a soft signal. Denied/unavailable → manual entry, unchanged.
 */
export function LocationField({ name = 'neighborhood', initial }: { name?: string; initial?: string | null }) {
  const [value, setValue] = useState(initial ?? 'Newport Beach');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<GeoState>('idle');

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeo('denied'); return; }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        let best: string | null = null;
        let bestD = Infinity;
        for (const [city, [clat, clng]] of Object.entries(CITY_COORDS)) {
          const d = (clat - lat) ** 2 + (clng - lng) ** 2;
          if (d < bestD) { bestD = d; best = city; }
        }
        if (best) setValue(best);
        setGeo('granted');
      },
      () => setGeo('denied'),
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Dropdown name={name} value={value} onChange={setValue} ariaLabel="City" className="flex-1"
          groups={Object.entries(LOCATION_GROUPS).map(([region, cities]) => ({ label: region, options: cities.map(c => ({ value: c, label: c })) }))} />
        <button type="button" onClick={useMyLocation} disabled={geo === 'asking'}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 text-sm font-medium text-muted hover:text-foreground hover:border-accent/50 disabled:opacity-50">
          <IconPin /> {geo === 'asking' ? 'Locating…' : 'Use my location'}
        </button>
      </div>
      {geo === 'granted' && <p className="text-xs text-sea">Snapped to the closest city — adjust if it&rsquo;s not quite right.</p>}
      {geo === 'denied' && <p className="text-xs text-muted">No problem — pick your city manually.</p>}
      {coords && <input type="hidden" name="latitude" value={coords.lat} />}
      {coords && <input type="hidden" name="longitude" value={coords.lng} />}
    </div>
  );
}
