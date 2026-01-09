import { randomBytes } from "crypto";

const LOST_CASE_PREFIX = "LOST-";
const LOST_CASE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOST_CASE_LENGTH = 6;

export const generateLostCaseId = (length = LOST_CASE_LENGTH): string => {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += LOST_CASE_ALPHABET[bytes[i] & 31];
  }
  return `${LOST_CASE_PREFIX}${code}`;
};

export const normalizeLostCaseId = (value: string): string => value.trim().toUpperCase();

export const isLostCaseIdFormat = (value: string): boolean =>
  /^LOST-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(value);
