import bcrypt from "bcrypt";
import crypto from "crypto";

// Admin passwords are stored twice:
//  - `password`    bcrypt hash, the only value used to verify a login
//  - `passwordEnc` AES-256-GCM ciphertext, only so a Super Admin can reveal it
// The encryption key lives in PASSWORD_ENCRYPTION_KEY (64 hex chars = 32 bytes)
// and must never be stored in the database or committed.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getKey = () => {
  const hex = process.env.PASSWORD_ENCRYPTION_KEY;

  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("PASSWORD_ENCRYPTION_KEY must be set to 64 hex characters (32 bytes) in .env");
  }

  return Buffer.from(hex, "hex");
};

// Output format: iv:authTag:ciphertext (all base64).
export const encryptPassword = (plain) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(":");
};

export const decryptPassword = (payload) => {
  const [iv, authTag, encrypted] = payload.split(":").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

// The two Admin columns to write whenever a password is set or changed.
export const buildPasswordFields = async (plain) => ({
  password: await bcrypt.hash(plain, 10),
  passwordEnc: encryptPassword(plain),
});
