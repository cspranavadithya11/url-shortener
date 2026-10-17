import {
  users, json, cleanUsername, verifyPassword, createSession,
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

  const user = username ? await users().get(username, { type: "json" }) : null;
  // Same message for unknown user and wrong password.
  if (!user || !(await verifyPassword(password, user.password))) {
    return json({ error: "Invalid username or password." }, 401);
  }

  const token = await createSession(username);
  return json({ token, username });
};
