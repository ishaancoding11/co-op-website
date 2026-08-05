import 'server-only';

/**
 * Content-sniffing for uploads.
 *
 * The browser-supplied `file.type` and the filename extension are both trivially
 * spoofable: a caller can rename `payload.html` to `avatar.png` and set the MIME
 * to `image/png`. Storage then serves it back with that Content-Type, which is
 * how an "image" upload turns into a stored-XSS or a disguised executable. So
 * before anything is written to a bucket we look at the file's actual leading
 * bytes (its magic number) and trust *that*, not what the client claimed.
 *
 * This is a real validation boundary — it runs on the server, on untrusted input.
 * It is deliberately an allow-list: a file whose signature we don't recognise is
 * rejected rather than waved through on the client's say-so.
 */

type MediaKind = 'image' | 'video' | 'audio';

// Each signature is a list of [offset, bytes] fragments that must all match.
// Ordered so container formats (RIFF/ftyp) are disambiguated by their subtype.
type Sig = { kind: MediaKind; parts: [number, number[]][] };

const SIGNATURES: Sig[] = [
  // ----- Images -----
  { kind: 'image', parts: [[0, [0xff, 0xd8, 0xff]]] },                       // JPEG
  { kind: 'image', parts: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]] }, // PNG
  { kind: 'image', parts: [[0, [0x47, 0x49, 0x46, 0x38]]] },                 // GIF8
  { kind: 'image', parts: [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x45, 0x42, 0x50]]] }, // WEBP (RIFF….WEBP)
  // ----- Audio (checked before video so RIFF/WAVE and OggS resolve to audio) -----
  { kind: 'audio', parts: [[0, [0x49, 0x44, 0x33]]] },                       // MP3 with ID3 tag
  { kind: 'audio', parts: [[0, [0xff, 0xfb]]] },                             // MP3 frame
  { kind: 'audio', parts: [[0, [0xff, 0xf3]]] },                             // MP3 frame
  { kind: 'audio', parts: [[0, [0xff, 0xf2]]] },                             // MP3 frame
  { kind: 'audio', parts: [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x41, 0x56, 0x45]]] }, // WAV (RIFF….WAVE)
  { kind: 'audio', parts: [[0, [0x4f, 0x67, 0x67, 0x53]]] },                 // OggS
  { kind: 'audio', parts: [[4, [0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41]]] }, // ….ftypM4A
  // ----- Video -----
  { kind: 'video', parts: [[4, [0x66, 0x74, 0x79, 0x70]]] },                 // MP4 / MOV / other ftyp (after M4A above)
  { kind: 'video', parts: [[0, [0x1a, 0x45, 0xdf, 0xa3]]] },                 // Matroska / WebM
];

function matches(head: Uint8Array, sig: Sig): boolean {
  return sig.parts.every(([offset, bytes]) =>
    bytes.every((b, i) => head[offset + i] === b));
}

/** Sniff the real media kind from a file's leading bytes; null if unrecognised. */
async function sniff(file: File): Promise<MediaKind | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const sig of SIGNATURES) {
    if (matches(head, sig)) return sig.kind;
  }
  return null;
}

/**
 * Confirm a file really is an image before it's stored as an avatar/logo.
 * Throws on anything that isn't a recognised image signature.
 */
export async function assertImageUpload(file: File): Promise<void> {
  if ((await sniff(file)) !== 'image') {
    throw new Error('That file doesn’t look like an image. Please upload a JPEG, PNG, WebP or GIF.');
  }
}

/**
 * Determine a portfolio item's media kind from its bytes (not its claimed type),
 * so `media_type` is trustworthy. Throws on an unrecognised file.
 */
export async function detectMediaKind(file: File): Promise<MediaKind> {
  const kind = await sniff(file);
  if (!kind) {
    throw new Error('Unsupported file type. Upload an image, video or audio file.');
  }
  return kind;
}
