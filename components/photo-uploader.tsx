'use client';

import { useState } from 'react';
import { Avatar } from './ui';

export function PhotoUploader({ name, label, currentUrl, currentName }: {
  name: string; label: string; currentUrl?: string | null; currentName: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-4">
      <div className="rounded-full p-0.5 bg-gradient-to-tr from-accent via-gold to-sea shrink-0">
        <div className="rounded-full p-0.5 bg-background">
          {preview
            ? <img src={preview} alt="" width={72} height={72} className="rounded-full object-cover" style={{ width: 72, height: 72 }} />
            : <Avatar name={currentName} url={currentUrl} size={72} />}
        </div>
      </div>
      <label className="block">
        <span className="block text-sm font-medium mb-1">{label}</span>
        <input type="file" name={name} accept="image/*"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          className="block text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:text-accent file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-line" />
      </label>
    </div>
  );
}
