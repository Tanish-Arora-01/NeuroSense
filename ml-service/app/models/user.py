"""User table and role definitions for the screening system."""

from __future__ import annotations

import enum

class UserRole(str, enum.Enum):
    """Supported platform roles."""

    patient = "patient"
    caregiver = "caregiver"
    doctor = "doctor"
    admin = "admin"
