const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");

const CLIENT_URL = process.env.CLIENT_URL?.replace(/\/+$/, "");
const getOAuthCallbackUrl = (provider) =>
  CLIENT_URL
    ? `${CLIENT_URL}/api/auth/${provider}/callback`
    : `/api/auth/${provider}/callback`;

// ──────────────────────────────────────────────
// Serialize / Deserialize — store user id in session
// ──────────────────────────────────────────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ──────────────────────────────────────────────
// 1. LOCAL STRATEGY  (email + password)
// ──────────────────────────────────────────────
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        // Need to explicitly select the password field
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
          return done(null, false, { message: "No account with that email." });
        }

        // If the user registered via OAuth only, they won't have a password
        if (!user.password) {
          return done(null, false, {
            message: `This email is linked to a ${user.provider} account. Please sign in with ${user.provider}.`,
          });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);



module.exports = passport;
