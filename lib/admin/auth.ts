import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const getAdminSecret = () => {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_COOKIE_SECRET environment variable.");
  }
  return secret;
};

const signPayload = (payload: string) => {
  const secret = getAdminSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
};

const encodePayload = (data: { admin: true; ts: number }) =>
  Buffer.from(JSON.stringify(data), "utf8").toString("base64url");

const decodePayload = (payload: string) => {
  const raw = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(raw) as { admin: boolean; ts: number };
};

export const setAdminCookie = () => {
  const payload = encodePayload({ admin: true, ts: Date.now() });
  const signature = signPayload(payload);

  cookies().set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS
  });
};

export const clearAdminCookie = () => {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0
  });
};

export const isAdminRequest = () => {
  const cookie = cookies().get(COOKIE_NAME)?.value;
  if (!cookie) {
    return false;
  }

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = signPayload(payload);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const decoded = decodePayload(payload);
    if (!decoded.admin) {
      return false;
    }

    const ageSeconds = (Date.now() - decoded.ts) / 1000;
    return ageSeconds >= 0 && ageSeconds <= MAX_AGE_SECONDS;
  } catch (error) {
    return false;
  }
};
