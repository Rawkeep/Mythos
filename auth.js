// Authentication + Plan Management (SQLite-backed)
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  dbFindUserByEmail, dbFindUserById, dbFindUserByLemonCustomerId,
  dbInsertUser, dbUpdateUser,
} from "./db.js";

// --- JWT Secret ---
const isProduction = process.env.NODE_ENV === "production";

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (isProduction) {
    console.error("[FATAL] JWT_SECRET environment variable is required in production mode.");
    console.error("  Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    process.exit(1);
  }
  console.warn("[WARN] JWT_SECRET not set — using fixed development secret. Do NOT use in production!");
  return "mythos-dev-secret-do-not-use-in-production";
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES = "30d";

// --- Plans ---
export const PLANS = {
  free: {
    name: "Free",
    postsPerMonth: 5,
    platforms: 1,
    aiGeneration: false,
    scheduling: false,
    engagement: false,
    uploadMB: 50,
    price: 0,
  },
  starter: {
    name: "Starter",
    postsPerMonth: 50,
    platforms: 2,
    aiGeneration: true,
    scheduling: true,
    engagement: false,
    uploadMB: 500,
    price: 19,
  },
  pro: {
    name: "Pro",
    postsPerMonth: -1, // unlimited
    platforms: 5,
    aiGeneration: true,
    scheduling: true,
    engagement: true,
    uploadMB: 2000,
    price: 49,
  },
  business: {
    name: "Business",
    postsPerMonth: -1,
    platforms: 5,
    aiGeneration: true,
    scheduling: true,
    engagement: true,
    uploadMB: 10000,
    price: 99,
  },
};

// --- Auth Functions ---

export async function registerUser(email, password, name) {
  email = email.toLowerCase().trim();

  if (!email || !password) throw new Error("E-Mail und Passwort erforderlich");
  if (password.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ungueltige E-Mail-Adresse");

  if (dbFindUserByEmail(email)) throw new Error("E-Mail bereits registriert");

  const hash = await bcrypt.hash(password, 12);
  const user = {
    id: crypto.randomUUID(),
    email,
    name: name || email.split("@")[0],
    passwordHash: hash,
    plan: "free",
    planExpiresAt: null,
    lemonCustomerId: null,
    lemonSubscriptionId: null,
    postsThisMonth: 0,
    postsResetAt: getNextMonthReset(),
    createdAt: new Date().toISOString(),
  };

  dbInsertUser(user);
  return { user: sanitizeUser(user), token: generateToken(user) };
}

export async function loginUser(email, password) {
  email = email.toLowerCase().trim();
  const user = dbFindUserByEmail(email);
  if (!user) throw new Error("E-Mail oder Passwort falsch");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("E-Mail oder Passwort falsch");

  // Reset monthly counter if needed
  resetMonthlyCounterIfNeeded(user);

  return { user: sanitizeUser(user), token: generateToken(user) };
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = dbFindUserByEmail(payload.email);
    if (!user) return null;
    resetMonthlyCounterIfNeeded(user);
    return user;
  } catch {
    return null;
  }
}

// --- JWT ---
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// --- Express Middleware ---
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nicht angemeldet" });
  }

  const user = verifyToken(header.slice(7));
  if (!user) return res.status(401).json({ error: "Token ungueltig oder abgelaufen" });

  req.user = user;
  next();
}

// Optional auth -- sets req.user if token present, but doesn't block
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    req.user = verifyToken(header.slice(7));
  }
  next();
}

// --- Plan Checks ---
export function requirePlan(minPlan) {
  const planOrder = ["free", "starter", "pro", "business"];
  const minIndex = planOrder.indexOf(minPlan);

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Nicht angemeldet" });

    const userPlanIndex = planOrder.indexOf(req.user.plan || "free");
    if (userPlanIndex < minIndex) {
      const plan = PLANS[minPlan];
      return res.status(403).json({
        error: `${plan.name}-Plan oder hoeher erforderlich`,
        requiredPlan: minPlan,
        currentPlan: req.user.plan,
      });
    }
    next();
  };
}

export function checkPostLimit(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Nicht angemeldet" });

  const plan = PLANS[req.user.plan || "free"];
  if (plan.postsPerMonth === -1) return next(); // unlimited

  if (req.user.postsThisMonth >= plan.postsPerMonth) {
    return res.status(403).json({
      error: `Post-Limit erreicht (${plan.postsPerMonth}/Monat). Upgrade deinen Plan.`,
      limit: plan.postsPerMonth,
      used: req.user.postsThisMonth,
      currentPlan: req.user.plan,
    });
  }
  next();
}

export function incrementPostCount(userId) {
  const user = dbFindUserById(userId);
  if (user) {
    dbUpdateUser(userId, { postsThisMonth: (user.postsThisMonth || 0) + 1 });
  }
}

export function checkPlatformLimit(req, res, next) {
  if (!req.user) return next();

  const plan = PLANS[req.user.plan || "free"];
  const platforms = req.body.platforms || [];

  if (platforms.length > plan.platforms) {
    return res.status(403).json({
      error: `Max. ${plan.platforms} Plattform(en) mit deinem Plan. Upgrade fuer mehr.`,
      limit: plan.platforms,
      requested: platforms.length,
      currentPlan: req.user.plan,
    });
  }
  next();
}

// --- Plan Upgrades (Lemonsqueezy) ---

export function upgradePlan(userId, plan, lemonData = {}) {
  const user = dbFindUserById(userId);
  if (!user) return null;

  const updates = { plan };
  if (lemonData.customerId) updates.lemonCustomerId = lemonData.customerId;
  if (lemonData.subscriptionId) updates.lemonSubscriptionId = lemonData.subscriptionId;
  if (lemonData.expiresAt) updates.planExpiresAt = lemonData.expiresAt;

  dbUpdateUser(userId, updates);
  return sanitizeUser({ ...user, ...updates });
}

export function findUserByLemonCustomerId(customerId) {
  return dbFindUserByLemonCustomerId(customerId);
}

export function findUserByEmail(email) {
  return dbFindUserByEmail(email);
}

// --- Helpers ---

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  const plan = PLANS[user.plan || "free"];
  return {
    ...safe,
    planDetails: plan,
  };
}

function getNextMonthReset() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

function resetMonthlyCounterIfNeeded(user) {
  if (!user.postsResetAt || new Date() >= new Date(user.postsResetAt)) {
    const newReset = getNextMonthReset();
    dbUpdateUser(user.id, { postsThisMonth: 0, postsResetAt: newReset });
    user.postsThisMonth = 0;
    user.postsResetAt = newReset;
  }
}
