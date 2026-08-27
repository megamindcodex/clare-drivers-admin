import { prisma } from "#db/prisma/prisma.connection.js";
import { assertActiveUser } from "#handlers/user.handler.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

/** Fields safe to return from a driver record — never the password hash or reset/verification tokens. */
const SAFE_DRIVER_SELECT = {
  id: true,
  driverId: true,
  profilePicUrl: true,
  firstName: true,
  lastName: true,
  country: true,
  phoneNumber: true,
  email: true,
  vehicleType: true,
  category: true,
  brand: true,
  model: true,
  modelYear: true,
  vehicleColor: true,
  registrationDate: true,
  plateNumber: true,
  drivingLicense: true,
  ninIdentification: true,
  rate: true,
  rating: true,
  status: true,
  isVerified: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Fetches drivers, optionally narrowed by filter criteria. With no filters
 * provided, returns every driver.
 * @param {Object} [filters] - Optional filter criteria.
 * @param {string} [filters.status] - Exact match on driver status (e.g. "active").
 * @param {string} [filters.isApproved] - Exact match on approval status.
 * @param {boolean} [filters.isVerified] - Exact match on verification flag.
 * @param {string} [filters.vehicleType] - Exact match on vehicle type.
 * @param {string} [filters.country] - Exact match on country.
 * @param {string} [filters.search] - Partial match across name, email, phone, and plate number.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Array<Object>>} The matching driver records.
 */
export const getDrivers = async (filters = {}, callerUserId) => {
  await assertActiveUser(callerUserId);

  const { status, isApproved, isVerified, vehicleType, country, search } = filters;

  const where = {
    ...(status && { status }),
    ...(isApproved && { isApproved }),
    ...(isVerified !== undefined && { isVerified }),
    ...(vehicleType && { vehicleType }),
    ...(country && { country }),
    ...(search && {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phoneNumber: { contains: search } },
        { plateNumber: { contains: search } },
      ],
    }),
  };

  return prisma.driver.findMany({ where, select: SAFE_DRIVER_SELECT });
};

/**
 * Fetches a single driver by their driver ID.
 * @param {string} driverId - The driver's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The matching driver record.
 * @throws {AppError} NOT_FOUND - if no driver matches driverId.
 */
export const getDriverById = async (driverId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const driver = await prisma.driver.findUnique({ where: { driverId }, select: SAFE_DRIVER_SELECT });

  if (!driver) {
    throw new AppError("Driver not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return driver;
};

/**
 * Fetches a driver's uploaded documents by their driver ID.
 * @param {string} driverId - The driver's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The matching driver documents record.
 * @throws {AppError} NOT_FOUND - if no documents record exists for driverId.
 */
export const getDriverDocument = async (driverId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const driverDocument = await prisma.driverDocuments.findUnique({ where: { driverId } });

  if (!driverDocument) {
    throw new AppError("Driver documents not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return driverDocument;
};

/**
 * Updates a driver's approval status.
 * @param {Object} params
 * @param {string} params.driverId - The driver's UUID.
 * @param {string} params.isApproved - The new approval status (DriverVerificationStatus enum value).
 * @param {string} params.callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The updated driver record.
 * @throws {AppError} NOT_FOUND - if no driver matches driverId.
 */
export const updateApproveField = async ({ driverId, isApproved, callerUserId }) => {
  await assertActiveUser(callerUserId);

  const driver = await prisma.driver.findUnique({ where: { driverId } });

  if (!driver) {
    throw new AppError("Driver not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return prisma.driver.update({
    where: { driverId },
    data: { isApproved },
    select: SAFE_DRIVER_SELECT,
  });
};

/**
 * Fetches active (live-tracked) drivers, optionally narrowed by filter
 * criteria. With no filters provided, returns every active driver.
 * @param {Object} [filters] - Optional filter criteria.
 * @param {string} [filters.vehicleType] - Exact match on vehicle type.
 * @param {string} [filters.category] - Exact match on vehicle category.
 * @param {string} [filters.search] - Partial match across name, phone, and plate number.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Array<Object>>} The matching active driver records.
 */
export const getActiveDrivers = async (filters = {}, callerUserId) => {
  await assertActiveUser(callerUserId);

  const { vehicleType, category, search } = filters;

  const where = {
    ...(vehicleType && { vehicleType }),
    ...(category && { category }),
    ...(search && {
      OR: [{ name: { contains: search } }, { phone: { contains: search } }, { plateNumber: { contains: search } }],
    }),
  };

  return prisma.activeDrivers.findMany({ where });
};

/**
 * Fetches a single active driver by their driver ID.
 * @param {string} driverId - The driver's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The matching active driver record.
 * @throws {AppError} NOT_FOUND - if no active driver matches driverId.
 */
export const getActiveDriverById = async (driverId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const activeDriver = await prisma.activeDrivers.findUnique({ where: { driverId } });

  if (!activeDriver) {
    throw new AppError("Active driver not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return activeDriver;
};
