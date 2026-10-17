import {
  store, users, json, normalize, validUrl, randomCode, validCustom, getUser,
} from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send JSON like {\"url\": \"https://...\"}." }, 400);
  }

  const url = normalize(body.url);
  const custom = (body.custom_code || "").trim();
  if (!validUrl(url)) {
    return json({ error: "Please provide a valid http/https URL." }, 400);
  }

  // Optional expiry: expires_at (date string) or expires_in_days (number)
  let expires_at = null;
  if (body.expires_at) {
    const t = Date.parse(body.expires_at);
    if (isNaN(t) || t <= Date.now()) {
      return json({ error: "Expiry must be a valid future date." }, 400);
    }
    expires_at = new Date(t).toISOString();
  } else if (
    body.expires_in_days !== undefined &&
    body.expires_in_days !== null &&
    body.expires_in_days !== ""
  ) {
    const d = Number(body.expires_in_days);
    if (!(d > 0 && d <= 3650)) {
      return json({ error: "expires_in_days must be between 0 and 3650." }, 400);
    }
    expires_at = new Date(Date.now() + d * 86400000).toISOString();
  }

  // Optional login: anonymous is allowed, but a bad token is an error.
  let owner = null;
  if (req.headers.get("authorization")) {
    owner = await getUser(req);
    if (!owner) return json({ error: "Session expired. Please log in again." }, 401);
  }

  const urls = store();
  let code;

  if (custom) {
    if (!validCustom(custom)) {
      return json(
        { error: "Custom code must be 3-32 chars: letters, numbers, - or _." },
        400
      );
    }
    if (await urls.get(custom)) {
      return json({ error: "That custom code is already taken." }, 409);
    }
    code = custom;
  } else {
    for (let i = 0; i < 10; i++) {
      const c = randomCode();
      if (!(await urls.get(c))) { code = c; break; }
    }
    if (!code) return json({ error: "Try again." }, 500);
  }

  await urls.setJSON(code, {
    url,
    clicks: 0,
    created_at: new Date().toISOString(),
    expires_at,
    owner,
  });

  if (owner) {
    const u = await users().get(owner, { type: "json" });
    if (u) {
      u.links = [...(u.links || []), code];
      await users().setJSON(owner, u);
    }
  }

  const origin = new URL(req.url).origin;
  return json(
    { code, short_url: `${origin}/${code}`, original_url: url, expires_at },
    201
  );
};
