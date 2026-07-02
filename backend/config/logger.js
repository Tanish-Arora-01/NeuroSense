// ──────────────────────────────────────────────
// NeuroSense Backend — Structured Logger (Pino)
// JSON-formatted logs with request correlation IDs,
// level-based filtering, and sensitive field redaction.
// ──────────────────────────────────────────────

const pino = require("pino");

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

const logger = pino({
  level: logLevel,

  // Redact sensitive fields from log output
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "sessionSecret",
      "*.password",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },

  // Use pino-pretty in development for human-readable output
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
});

module.exports = logger;
