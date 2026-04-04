// Authentication + Plan Management
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const USERS_DB = "./users.json";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
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

// --- User Storage ---
function loadUsers() {
  if (existsSync(USERS_DB)) return JSON.parse(readFileSync(USERS_DB, "utf-8"));
  return [];
}

function saveUsers(users) {
  writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

function findUser(email) {
  return loadUsers().find(u => u.email === email.toLowerCase().trim());
}

// --- Auth Functions ---

export async function registerUser(email, password, name) {
  email = email.toLowerCase().trim();

  if (!email || !password) throw new Error("E-Mail und Passwort erforderlich");
  if (password.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ungueltige E-Mail-Adresse");

  if (findUser(email)) throw new Error("E-Mail bereits registriert");

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

  const users = loadUsers();
  users.push(user);
  saveUsers(users);

  return { user: sanitizeUser(user), token: generateToken(user) };
}

export async function loginUser(email, password) {
  email = email.toLowerCase().trim();
  const user = findUser(email);
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
    const user = findUser(payload.email);
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

// Optional auth — sets req.user if token present, but doesn't block
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
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].postsThisMonth = (users[idx].postsThisMonth || 0) + 1;
    saveUsers(users);
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
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].plan = plan;
  if (lemonData.customerId) users[idx].lemonCustomerId = lemonData.customerId;
  if (lemonData.subscriptionId) users[idx].lemonSubscriptionId = lemonData.subscriptionId;
  if (lemonData.expiresAt) users[idx].planExpiresAt = lemonData.expiresAt;

  saveUsers(users);
  return sanitizeUser(users[idx]);
}

export function findUserByLemonCustomerId(customerId) {
  return loadUsers().find(u => u.lemonCustomerId === customerId);
}

export function findUserByEmail(email) {
  return findUser(email);
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
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].postsThisMonth = 0;
      users[idx].postsResetAt = getNextMonthReset();
      saveUsers(users);
      user.postsThisMonth = 0;
      user.postsResetAt = users[idx].postsResetAt;
    }
  }
}
