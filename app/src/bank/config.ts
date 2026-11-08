/** Bank location config. Bank is public static content (hosting/CDN), same for guests and users. */

/** Image base is the sibling `img` of the bank base: `/bank` -> `/img`, `https://cdn.x/p/bank` -> `https://cdn.x/p/img`. */
export function deriveImgBase(bankBase: string): string {
  const trimmed = bankBase.replace(/\/+$/, '');
  return trimmed.replace(/\/[^/]*$/, '') + '/img';
}

const env = import.meta.env;

const trim = (s: string) => s.replace(/\/+$/, '');

export const BANK_BASE: string = trim((env.VITE_BANK_BASE_URL as string | undefined) ?? '/bank');
export const IMG_BASE: string = trim(
  (env.VITE_IMG_BASE_URL as string | undefined) ?? deriveImgBase(BANK_BASE),
);

export function imageUrl(id: string, width: number, imgBase: string = IMG_BASE): string {
  return `${imgBase}/${id}.w${width}.webp`;
}
