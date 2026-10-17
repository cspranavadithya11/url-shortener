import { store, isExpired } from "../lib/util.mjs";

const text = (msg, status) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain" } });

// Netlify may hand us the original URL (/abc123) or the rewritten one
// (?code=abc123), so accept both.
function getCode(req) {
  const u = new URL(req.url);
  const q = u.searchParams.get("code");
  if (q) return q;
  const last = u.pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(last);
}

export default async (req) => {
  const code = getCode(req);
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
