import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authRepo } from "../config/db.js";
import { requireAuth } from "../config/requireAuth.js";

const router = Router();

router.post("/signUp", handleRegister);
router.post("/login", handleLogin);

router.get("/users", requireAuth, async (req, res, next) => {
    try {
      const { page = "1", limit = "50" } = req.query;
      const data = await authRepo.listUsers({
        page: Number(page),
        limit: Number(limit),
      });
      return res.json(data);
    } catch (e) { next(e); }
});
async function handleRegister(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email & password required" });

    const exists = await authRepo.findByEmail(email.toLowerCase().trim());
    if (exists) return res.status(409).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authRepo.createUser({ email, passwordHash });

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    return res.status(201).json({ token, user });
  } catch (e) { next(e); }
}

async function handleLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email & password required" });

    const user = await authRepo.findByEmail(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    return res.json({ token, user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (e) { next(e); }
}

export default router;
