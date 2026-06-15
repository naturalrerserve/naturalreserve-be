import { randomBytes } from 'crypto';

export function generateOtp(): string {
  // Generate 6-digit numeric OTP
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * digits.length);
    otp += digits[idx];
  }
  return otp;
}

export function generateAccessCode(): string {
  // Generate random 8-character uppercase alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    code += chars[idx];
  }
  return code;
}

export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}
