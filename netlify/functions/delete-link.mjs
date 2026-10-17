import { store, users, json, getUser } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const username = await getUser(req);
  if (!username) return json({ error: "Please log in." }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send JSON like {\"code\": \"abc123\"}." }, 400);
  }

  const code = typeof body.code === "string" ? body.code : "";
  const urls = store();
  const rec = code ? await urls.get(code, { type: "json" }) : null;

  if (!rec) return json({ error: "Short link not found." }, 404);
  if (rec.owner !== username) {
    return json({ error: "You can only delete your own links." }, 403);
  }

  await urls.delete(code);

  const user = await users().get(username, { type: "json" });
  if (user) {
    user.links = (user.links || []).filter((c) => c !== code);
    await users().setJSON(username, user);
  }

  return json({ deleted: code });
};
