import { getStore } from "@netlify/blobs";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const store = () => getStore({ name: "urls", consistency: "strong" });
export const users = () => getStore({ name: "users", consistency: "strong" });
export const sessions = () =>
  getStore({ name: "sessions", consistency: "strong" });

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CUSTOM_RE = /^[A-Za-z0-9_-]{3,32}$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const HOST_RE =
  /^(localhost|[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+|\d{1,3}(\.\d{1,3}){3})$/;
export const RESERVED = new Set(["api", "index.html", "favicon.ico"]);
const SESSION_DAYS = 7;

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ---------- URLs ----------
export function normalize(url) {
  url = (url || "").trim();
  if (url && !url.includes("://")) url = "https://" + url;
  return url;
}

export function validUrl(url) {
  if (url.length > 2048) return false;
  try {
    const u = new URL(url);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      HOST_RE.test(u.hostname)
    );
  } catch {
    return false;
  }
}

export function randomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const validCustom = (c) =>
  CUSTOM_RE.test(c) && !RESERVED.has(c.toLowerCase());

export const isExpired = (rec) =>
  !!rec.expires_at && Date.parse(rec.expires_at) <= Date.now();

// ---------- Accounts ----------
export const cleanUsername = (u) => (u || "").trim().toLowerCase();
export const validUsername = (u) => USERNAME_RE.test(u);

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pw, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

export async function verifyPassword(pw, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(pw, Buffer.from(salt, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

export async function createSession(username) {
  const token = randomBytes(32).toString("hex");
  await sessions().setJSON(sha(token), {
    username,
    expires_at: Date.now() + SESSION_DAYS * 86400000,
  });
  return token;
}

// Returns the username for a valid Bearer token, otherwise null.
export async function getUser(req) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer ([a-f0-9]+)$/);
  if (!m) return null;
  const key = sha(m[1]);
  const s = await sessions().get(key, { type: "json" });
  if (!s) return null;
  if (s.expires_at < Date.now()) {
    await sessions().delete(key);
    return null;
  }
  return s.username;
}
