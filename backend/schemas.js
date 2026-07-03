const { z } = require("zod");

// Auth schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["patient", "doctor"]).optional(),
    phone: z.string().min(7, "Mobile number is required for doctors").max(20).optional(),
    doctorProfile: z
      .object({
        licenseNumber: z.string().min(3).max(80).optional(),
        specialization: z.string().min(2).max(120).optional(),
        clinicName: z.string().min(2).max(160).optional(),
        city: z.string().min(2).max(120).optional(),
        yearsOfExperience: z.coerce.number().min(0).max(70).optional(),
      })
      .optional(),
  }).superRefine((body, ctx) => {
    if (body.role !== "doctor") return;

    const profile = body.doctorProfile || {};
    const requiredFields = [
      ["phone", body.phone],
      ["doctorProfile.licenseNumber", profile.licenseNumber],
      ["doctorProfile.specialization", profile.specialization],
      ["doctorProfile.clinicName", profile.clinicName],
      ["doctorProfile.city", profile.city],
    ];

    for (const [path, value] of requiredFields) {
      if (!value || !String(value).trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: path.split("."),
          message: "Required for doctor registration",
        });
      }
    }
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
    doctorRef: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  screeningSchema,
};
