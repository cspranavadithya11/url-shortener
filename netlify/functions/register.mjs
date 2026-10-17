import {
  users, json, cleanUsername, validUsername, hashPassword, createSession,
} from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send JSON with username and password." }, 400);
  }

  const username = cleanUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";

  if (!validUsername(username)) {
    return json(
      { error: "Username must be 3-20 chars: letters, numbers or _." },
      400
    );
  }
  if (password.length < 8 || password.length > 200) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }

  const db = users();
  if (await db.get(username)) {
    return json({ error: "That username is taken." }, 409);
  }

  await db.setJSON(username, {
    password: await hashPassword(password),
    created_at: new Date().toISOString(),
    links: [],
  });

  const token = await createSession(username);
  return json({ token, username }, 201);
};
