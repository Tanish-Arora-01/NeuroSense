const { z } = require("zod");

// Auth schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["patient", "caregiver", "doctor", "admin"]).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

// Screening schemas
const screeningSchema = z.object({
  body: z.object({
    age: z.coerce.number().min(18).max(120),
    mmse_score: z.coerce.number().min(0).max(30).optional(),
    cdr_score: z.coerce.number().min(0).max(3).optional(),
    moca_score: z.coerce.number().min(0).max(30).optional(),
    education_years: z.coerce.number().min(0).max(30).optional(),
    patientId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  screeningSchema,
};
