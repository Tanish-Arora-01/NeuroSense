// ──────────────────────────────────────────────
// NeuroSense Backend — Entry Point
// ──────────────────────────────────────────────
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { MongoStore } = require("connect-mongo");
const connectDB = require("./config/db");
const {
  authLimiter,
  apiLimiter,
  screeningLimiter,
} = require("./middleware/rateLimiter");
const logger = require("./config/logger");
const pinoHttp = require("pino-http");
const requestId = require("./middleware/requestId");

// Load passport strategies
require("./config/passport");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const CLIENT_URL =
  process.env.CLIENT_URL || (isProduction ? null : "http://localhost:5173");
const SESSION_SECRET =
  process.env.SESSION_SECRET || (isProduction ? null : "dev-secret-change-me");

if (isProduction && !CLIENT_URL) {
  throw new Error("CLIENT_URL must be set in production.");
}

if (isProduction && !SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production.");
}

// ─── Connect to MongoDB ─────────────────────
connectDB();

// ─── Security Headers & Request ID ───────────
app.use(helmet());
app.use(requestId);

// ─── Logging Middleware ──────────────────────
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ reqId: req.id }),
    autoLogging: {
      ignore: (req) => req.url === "/api/health",
    },
  })
);

// ─── Global Rate Limit ───────────────────────
app.use("/api/", apiLimiter);

// ─── Global Middleware ───────────────────────
app.set("trust proxy", 1); // Trust reverse proxy for secure cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Swagger Documentation ───────────────────
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NeuroSense API",
      version: "1.0.0",
      description: "API Documentation for NeuroSense backend",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true, // allow cookies / session id
  }),
);

// ─── Session ─────────────────────────────────
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 1 day (seconds)
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day (ms)
      httpOnly: true,
      secure: CLIENT_URL && CLIENT_URL.startsWith("https") ? true : false,
      sameSite: CLIENT_URL && CLIENT_URL.startsWith("https") ? "none" : "lax",
    },
  }),
);

// ─── Passport ────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ──────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/screening", screeningLimiter, require("./routes/screening"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/recommendations", require("./routes/recommendations"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/model", require("./routes/model"));
app.use("/api/doctors", require("./routes/doctors"));
app.use("/api/admin", require("./routes/admin"));

// Health-check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── 404 catch-all ───────────────────────────
app.use((_req, res) => res.status(404).json({ message: "Route not found." }));

// ─── Global error handler ────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ err, reqId: _req.id }, "Unhandled error");
  res.status(err.status || 500).json({
    message: isProduction ? "Internal server error." : err.message,
  });
});

// ─── Start ───────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});
