import { store, json, isExpired } from "../lib/util.mjs";

// Accept the code from ?code= or from the end of the URL path.
function getCode(req) {
  const u = new URL(req.url);
  const q = u.searchParams.get("code");
  if (q) return q;
  const last = u.pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(last);
}

export default async (req) => {
  const code = getCode(req);
  const rec = code ? await store().get(code, { type: "json" }) : null;
  if (!rec) return json({ error: "Short link not found." }, 404);

  const origin = new URL(req.url).origin;
  return json({
    code,
    short_url: `${origin}/${code}`,
    original_url: rec.url,
    clicks: rec.clicks,
    created_at: rec.created_at,
    expires_at: rec.expires_at || null,
    expired: isExpired(rec),
  });
};
