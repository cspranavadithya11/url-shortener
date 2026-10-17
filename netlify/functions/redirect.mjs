import { store, isExpired } from "../lib/util.mjs";

const text = (msg, status) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain" } });

export default async (req) => {
  const code = new URL(req.url).searchParams.get("code") || "";
  const urls = store();
  const rec = code ? await urls.get(code, { type: "json" }) : null;

  if (!rec) return text("Short link not found.", 404);
  if (isExpired(rec)) return text("This short link has expired.", 410);

  // Click count (not atomic; fine for a club project's traffic).
  rec.clicks = (rec.clicks || 0) + 1;
  await urls.setJSON(code, rec);

  return new Response(null, {
    status: 302,
    headers: { Location: rec.url, "Cache-Control": "no-store" },
  });
};
