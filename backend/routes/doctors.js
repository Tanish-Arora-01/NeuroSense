const router = require("express").Router();

const User = require("../models/User");

router.get("/", async (_req, res) => {
  try {
    const doctors = await User.find({
      role: "doctor",
      doctorApprovalStatus: "approved",
    })
      .select("name email phone doctorProfile doctorApprovalStatus")
      .sort({ name: 1 })
      .lean();

    return res.json({
      total: doctors.length,
      doctors: doctors.map((doctor) => ({
        id: String(doctor._id),
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.doctorProfile?.specialization || "",
        clinicName: doctor.doctorProfile?.clinicName || "",
        city: doctor.doctorProfile?.city || "",
        yearsOfExperience: doctor.doctorProfile?.yearsOfExperience ?? null,
      })),
    });
  } catch (_err) {
    return res.status(500).json({ message: "Failed to fetch doctors." });
  }
});

module.exports = router;
