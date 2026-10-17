import { store, json, isExpired } from "../lib/util.mjs";

export default async (req) => {
  const code = new URL(req.url).searchParams.get("code") || "";
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
