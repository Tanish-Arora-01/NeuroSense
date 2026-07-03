const router = require("express").Router();
const mongoose = require("mongoose");

const ensureAuth = require("../middleware/ensureAuth");
const ensureRole = require("../middleware/ensureRole");
const User = require("../models/User");
const PredictionResult = require("../models/PredictionResult");
const logger = require("../config/logger");

router.use(ensureAuth, ensureRole("admin"));

const toDoctorPayload = (doctor) => ({
  id: String(doctor._id),
  name: doctor.name,
  email: doctor.email,
  phone: doctor.phone,
  status: doctor.doctorApprovalStatus,
  registeredAt: doctor.createdAt,
  approvedAt: doctor.doctorApprovedAt,
  doctorProfile: doctor.doctorProfile || {},
});

router.get("/doctors", async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status)
      ? req.query.status
      : null;

    const filter = { role: "doctor" };
    if (status) filter.doctorApprovalStatus = status;

    const doctors = await User.find(filter)
      .select("name email phone doctorProfile doctorApprovalStatus doctorApprovedAt createdAt")
      .sort({ doctorApprovalStatus: 1, createdAt: -1 })
      .lean();

    return res.json({
      total: doctors.length,
      doctors: doctors.map(toDoctorPayload),
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Admin doctor list error");
    return res.status(500).json({ message: "Failed to load doctors." });
  }
});

router.patch("/doctors/:id/approval", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid doctor id." });
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid approval status." });
    }

    const update = {
      doctorApprovalStatus: status,
      doctorApprovedAt: status === "approved" ? new Date() : null,
      doctorApprovedBy: status === "approved" ? req.user._id : null,
    };

    const doctor = await User.findOneAndUpdate(
      { _id: id, role: "doctor" },
      update,
      { new: true },
    )
      .select("name email phone doctorProfile doctorApprovalStatus doctorApprovedAt createdAt")
      .lean();

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    return res.json({
      message: `Doctor ${status}.`,
      doctor: toDoctorPayload(doctor),
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Admin doctor approval error");
    return res.status(500).json({ message: "Failed to update doctor approval." });
  }
});

router.get("/overview", async (req, res) => {
  try {
    const [
      pendingDoctors,
      approvedDoctors,
      patients,
      totalScreenings,
      assignedScreenings,
    ] = await Promise.all([
      User.countDocuments({ role: "doctor", doctorApprovalStatus: "pending" }),
      User.countDocuments({ role: "doctor", doctorApprovalStatus: "approved" }),
      User.countDocuments({ role: "patient" }),
      PredictionResult.countDocuments(),
      PredictionResult.countDocuments({ doctorRef: { $ne: null } }),
    ]);

    return res.json({
      pendingDoctors,
      approvedDoctors,
      patients,
      totalScreenings,
      assignedScreenings,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Admin overview error");
    return res.status(500).json({ message: "Failed to load admin overview." });
  }
});

module.exports = router;
