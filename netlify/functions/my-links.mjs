import { store, users, json, getUser, isExpired } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Use GET." }, 405);

  const username = await getUser(req);
  if (!username) return json({ error: "Please log in." }, 401);

  const user = await users().get(username, { type: "json" });
  const codes = (user?.links || []).slice(-200).reverse(); // newest first
  const urls = store();
  const origin = new URL(req.url).origin;

  const recs = await Promise.all(
    codes.map(async (code) => ({
      code,
      rec: await urls.get(code, { type: "json" }),
    }))
  );

  const links = recs
    .filter((r) => r.rec)
    .map(({ code, rec }) => ({
      code,
      short_url: `${origin}/${code}`,
      original_url: rec.url,
      clicks: rec.clicks,
      created_at: rec.created_at,
      expires_at: rec.expires_at || null,
      expired: isExpired(rec),
    }));

  return json({ username, links });
};
