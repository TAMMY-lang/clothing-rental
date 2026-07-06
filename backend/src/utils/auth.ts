import crypto from "node:crypto";
import type { Request } from "express";
import bcrypt from "bcrypt";
import { AppError } from "./app-error.js";

const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";

type TokenPayload = {
  sub: string;
  phone: string;
  role: string;
  sessionId?: string;
  exp: number;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string) {
  const padded = input + "=".repeat((4 - input.length % 4) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith("$2")) {
    return bcrypt.compareSync(password, passwordHash);
  }
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;
  const calculated = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calculated, "hex"));
}

export function isBcryptHash(passwordHash: string) {
  return passwordHash.startsWith("$2");
}

export function signToken(payload: Omit<TokenPayload, "exp">) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  }));
  const signature = base64Url(
    crypto.createHmac("sha256", jwtSecret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new AppError("登录状态无效，请重新登录", 401, "INVALID_TOKEN");
  }

  const expected = base64Url(
    crypto.createHmac("sha256", jwtSecret).update(`${header}.${body}`).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AppError("登录状态无效，请重新登录", 401, "INVALID_TOKEN");
  }

  const payload = JSON.parse(fromBase64Url(body)) as TokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError("登录已过期，请重新登录", 401, "TOKEN_EXPIRED");
  }
  return payload;
}

export function getTokenFromRequest(req: Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}
