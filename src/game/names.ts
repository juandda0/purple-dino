// First names shown on the projector: strip characters that could hide or flip text (control, zero-width,
// bidirectional overrides), collapse spaces, max 16 chars. The database rules also reject ASCII controls
// (their regex works on bytes, so only the client can filter the Unicode ones reliably).
const ranges: Array<[number, number]> = [
  [0x00, 0x1f], [0x7f, 0x9f], // control characters
  [0x200b, 0x200f], // zero-width spaces and marks
  [0x202a, 0x202e], [0x2060, 0x206f], // bidi embeddings/overrides, invisible operators
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];
const hex = (n: number) => `\\u${n.toString(16).padStart(4, '0')}`;
const INVISIBLE = new RegExp(`[${ranges.map(([a, b]) => (a === b ? hex(a) : `${hex(a)}-${hex(b)}`)).join('')}]`, 'g');

export function cleanName(raw: string): string {
  return raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
