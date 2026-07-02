// ──────────────────────────────────────────────
// Role-Based Access Control Middleware
// ──────────────────────────────────────────────

/**
 * Higher-order middleware that restricts access to users whose
 * `role` matches one of the provided allowed roles.
 *
 * Must be used AFTER `ensureAuth` so `req.user` is guaranteed.
 *
 * @param  {...string} allowedRoles  One or more roles (e.g. "doctor", "admin")
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get("/admin-only", ensureAuth, ensureRole("admin"), handler);
 *   router.get("/clinical",   ensureAuth, ensureRole("doctor", "admin"), handler);
 */
const ensureRole =
  (...allowedRoles) =>
  (req, res, next) => {
    // Belt-and-suspenders: reject if auth somehow didn't run
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authenticated." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(
        `RBAC denied: user=${req.user._id} role=${req.user.role} ` +
          `required=${allowedRoles.join(",")} path=${req.originalUrl}`,
      );
      return res
        .status(403)
        .json({ message: "Insufficient permissions." });
    }

    return next();
  };

module.exports = ensureRole;
