const ensureRole = require("../middleware/ensureRole");

const mockReq = (role) => ({
  user: { _id: "user-001", role },
  originalUrl: "/api/test",
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

describe("ensureRole middleware", () => {
  it("calls next() when user has an allowed role", () => {
    const req = mockReq("doctor");
    const res = mockRes();
    const next = mockNext();

    ensureRole("doctor", "admin")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not in allowed list", () => {
    const req = mockReq("patient");
    const res = mockRes();
    const next = mockNext();

    ensureRole("doctor", "admin")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Insufficient permissions.",
      }),
    );
  });

  it("returns 401 when req.user is missing", () => {
    const req = { originalUrl: "/api/test" }; // no user
    const res = mockRes();
    const next = mockNext();

    ensureRole("doctor")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Not authenticated.",
      }),
    );
  });

  it("allows access when user's exact role matches", () => {
    const req = mockReq("admin");
    const res = mockRes();
    const next = mockNext();

    ensureRole("admin")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("denies caregiver access to admin-only routes", () => {
    const req = mockReq("caregiver");
    const res = mockRes();
    const next = mockNext();

    ensureRole("admin")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows when any of multiple roles match", () => {
    for (const role of ["patient", "caregiver", "doctor", "admin"]) {
      const req = mockReq(role);
      const res = mockRes();
      const next = mockNext();

      ensureRole("patient", "caregiver", "doctor", "admin")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    }
  });
});
