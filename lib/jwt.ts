import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "yr-manager-secret-key-123456";

export function signToken(payload: { userId: string; role: string; businessId?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; businessId?: string };
  } catch (error) {
    return null;
  }
}
