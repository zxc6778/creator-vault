/** Local static paths — no foreign CDN (works in China without VPN). */
const base = import.meta.env.BASE_URL;

export const COVERS = {
  c1: `${base}covers/cover-1.svg`,
  c2: `${base}covers/cover-2.svg`,
  c3: `${base}covers/cover-3.svg`,
  c4: `${base}covers/cover-4.svg`,
} as const;

export const TIP_PREVIEW = `${base}#tip/preview`;

export function tipLinkForAddress(address: string, sig?: string): string {
  const id = address.replace(/^0x/i, "").slice(0, 16);
  const path = `${base}#tip/${id}`;
  return sig ? `${path}?sig=${encodeURIComponent(sig.slice(0, 18))}` : path;
}
