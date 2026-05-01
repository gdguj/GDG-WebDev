const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db/mysql");

const JWT_SECRET = process.env.JWT_SECRET || "gdg-dev-jwt-secret-change-me";
const JWT_EXPIRES_IN = "7d";
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function createAppError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .scryptSync(String(plainPassword), salt, 64)
    .toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(plainPassword, storedHash) {
  const [salt, originalKey] = String(storedHash).split(":");
  if (!salt || !originalKey) return false;

  const keyToCheck = crypto
    .scryptSync(String(plainPassword), salt, 64)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(originalKey, "hex"),
    Buffer.from(keyToCheck, "hex")
  );
}

function toPublicUser(row) {
  return {
    id: row.ID,
    name: row.Name,
    email: row.Email,
  };
}

function signAccessToken(row) {
  return jwt.sign(
    {
      sub: String(row.ID),
      name: row.Name,
      email: row.Email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(payload) {
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  if (name.length < 3) {
    throw createAppError("الاسم يجب أن يكون 3 أحرف على الأقل.", 400);
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createAppError("يرجى إدخال بريد إلكتروني صحيح.", 400);
  }
  if (password.length < 8) {
    throw createAppError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.", 400);
  }

  const [existing] = await pool.query("SELECT ID FROM users WHERE Email = ?", [email]);
  if (existing.length > 0) {
    throw createAppError("هذا البريد الإلكتروني مسجل بالفعل.", 409);
  }

  const [result] = await pool.query(
    "INSERT INTO users (Email, Password, Name) VALUES (?, ?, ?)",
    [email, hashPassword(password), name]
  );

  const account = { ID: result.insertId, Name: name, Email: email };

  return {
    user: toPublicUser(account),
    token: signAccessToken(account),
  };
}

async function login(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  if (!email || !password) {
    throw createAppError("البريد الإلكتروني وكلمة المرور مطلوبان.", 400);
  }

  const [rows] = await pool.query("SELECT * FROM users WHERE Email = ?", [email]);
  if (rows.length === 0) {
    throw createAppError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401);
  }

  const account = rows[0];

  if (!account.Password) {
    throw createAppError("هذا الحساب مرتبط بتسجيل الدخول عبر Google.", 401);
  }

  const validPassword = verifyPassword(password, account.Password);
  if (!validPassword) {
    throw createAppError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401);
  }

  return {
    user: toPublicUser(account),
    token: signAccessToken(account),
  };
}

async function loginWithGoogle(payload) {
  const idToken = String(payload.idToken || payload.credential || "").trim();
  if (!idToken) {
    throw createAppError("Google token مطلوب.", 400);
  }
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw createAppError("تسجيل الدخول عبر Google غير مفعّل حالياً.", 500);
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw createAppError("Google token غير صالح.", 401);
  }

  const payloadData = ticket.getPayload();
  const email = normalizeEmail(payloadData.email);
  const name = String(payloadData.name || email.split("@")[0] || "Google User").trim();

  if (!email) {
    throw createAppError("تعذر قراءة بيانات حساب Google.", 400);
  }

  const [rows] = await pool.query("SELECT * FROM users WHERE Email = ?", [email]);

  let account;
  if (rows.length === 0) {
    const [result] = await pool.query(
      "INSERT INTO users (Email, Password, Name) VALUES (?, NULL, ?)",
      [email, name]
    );
    account = { ID: result.insertId, Name: name, Email: email };
  } else {
    account = rows[0];
  }

  return {
    user: toPublicUser(account),
    token: signAccessToken(account),
  };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getGoogleConfig() {
  return {
    enabled: Boolean(GOOGLE_CLIENT_ID),
    clientId: GOOGLE_CLIENT_ID || null,
  };
}

async function getUserById(userId) {
  const [rows] = await pool.query("SELECT * FROM users WHERE ID = ?", [userId]);
  if (rows.length === 0) {
    throw createAppError("المستخدم غير موجود.", 404);
  }
  return toPublicUser(rows[0]);
}

module.exports = {
  register,
  login,
  loginWithGoogle,
  verifyToken,
  getGoogleConfig,
  getUserById,
};
