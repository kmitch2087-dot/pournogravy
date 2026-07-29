// Thank-You page "shout-out" model + helpers. Stored as a JSON array in the
// site_content row (page='thanks', section='crew', key='shoutouts').

export interface Shoutout {
  name: string;
  blurb: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
}

export function parseShoutouts(json: string | null | undefined): Shoutout[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        name: String(x.name ?? ""),
        blurb: String(x.blurb ?? ""),
        website: x.website ? String(x.website) : "",
        instagram: x.instagram ? String(x.instagram) : "",
        facebook: x.facebook ? String(x.facebook) : "",
        email: x.email ? String(x.email) : "",
      }));
  } catch {
    return [];
  }
}

export function normalizeUrl(url: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function domainOf(url: string): string {
  const clean = (url ?? "").trim();
  try {
    return new URL(normalizeUrl(clean)).hostname.replace(/^www\./i, "");
  } catch {
    return clean
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/.*$/, "");
  }
}

// Google's favicon service — reliable, no server fetch, returns a globe for
// sites without a favicon.
export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOf(url))}&sz=64`;
}

export function stripAt(handle: string): string {
  return (handle ?? "").trim().replace(/^@+/, "");
}

export function instagramUrl(handle: string): string {
  const h = stripAt(handle);
  return /^https?:\/\//i.test(handle) ? handle : `https://instagram.com/${h}`;
}

export function facebookUrl(handle: string): string {
  const h = stripAt(handle);
  return /^https?:\/\//i.test(handle) ? handle : `https://facebook.com/${h}`;
}
