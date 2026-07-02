const router = require("express").Router();
const passport = require("passport");
const User = require("../models/User");
const ensureAuth = require("../middleware/ensureAuth");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../schemas");

const isProduction = process.env.NODE_ENV === "production";
const CLIENT_URL =
  process.env.CLIENT_URL || (isProduction ? "" : "http://localhost:5173");

if (isProduction && !CLIENT_URL) {
  throw new Error("CLIENT_URL must be set in production for OAuth redirects.");
}

// ══════════════════════════════════════════════
//  LOCAL AUTH — Register & Login
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [patient, caregiver, doctor, admin]
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already in use
 */
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "patient",
      provider: "local",
    });

    // Automatically log in after registration
    req.login(user, (err) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Login after register failed." });
      return res.status(201).json({
        message: "Account created successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res
        .status(401)
        .json({ message: info?.message || "Invalid credentials." });

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({
        message: "Logged in successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});





// ══════════════════════════════════════════════
//  SESSION MANAGEMENT
// ══════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully." });
    });
  });
});

/**
 * @swagger
 * /api/auth/current-user:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Returns the current user object
 *       401:
 *         description: Not authenticated
 */
router.get("/current-user", ensureAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      provider: req.user.provider,
    },
  });
});

module.exports = router;
