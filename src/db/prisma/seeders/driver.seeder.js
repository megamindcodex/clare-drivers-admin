import { pathToFileURL } from "node:url";

import argon2 from "argon2";
import { faker } from "@faker-js/faker";

import { prisma } from "#db/prisma/prisma.connection.js";
import { VehicleType, DriverVerificationStatus } from "#db/generated/prisma/client.js";
import { logger } from "#configs/logger.js";

/**
 * Origin coordinate ([latitude, longitude]) that generated active-driver
 * locations are scattered around — central Lagos, Nigeria.
 * @type {[number, number]}
 */
const LAGOS_ORIGIN = [6.45407, 3.39467];

/**
 * Maximum distance, in kilometers, an active driver's generated coordinate
 * may fall from {@link LAGOS_ORIGIN}.
 * @type {number}
 */
const LAGOS_RADIUS_KM = 30;

/** @type {number} */
const DRIVER_COUNT = 40;

/** @type {number} */
const ACTIVE_DRIVER_COUNT = 18;

/**
 * Base URL for pravatar.cc, which serves real, working stock face photos by
 * numeric ID (1-70) — used for {@link Driver.profilePicUrl}.
 * @type {string}
 */
const AVATAR_IMAGE_BASE_URL = "https://i.pravatar.cc";

/**
 * Highest valid pravatar.cc `img` id — pravatar only has 70 stock photos.
 * @type {number}
 */
const AVATAR_IMAGE_MAX_ID = 70;

/**
 * Base URL for placehold.co, which serves real, working placeholder images
 * with custom text baked in — used for {@link DriverDocuments} image fields
 * so each generated document loads as a real, labeled image.
 * @type {string}
 */
const DOCUMENT_IMAGE_BASE_URL = "https://placehold.co";

/**
 * Vehicle brand/model options grouped by vehicle type, so generated vehicle
 * data stays internally consistent (e.g. a Bike never gets a Toyota model).
 * @type {Record<string, { brands: string[], models: string[] }>}
 */
const VEHICLE_CATALOG = {
  [VehicleType.Car]: { brands: ["Toyota", "Honda", "Kia", "Hyundai", "Lexus"], models: ["Corolla", "Camry", "Civic", "Rio", "Elantra"] },
  [VehicleType.Bike]: { brands: ["Bajaj", "TVS", "Honda", "Yamaha"], models: ["Boxer", "Apache", "CB125", "Crux"] },
  [VehicleType.Keke]: { brands: ["Bajaj", "TVS", "Piaggio"], models: ["RE", "King", "Ape"] },
};

/**
 * Generates {@link DRIVER_COUNT} unique values per field via the given
 * generator, for every {@link Driver} column that carries a unique
 * constraint — avoids relying on random collisions never happening. Also
 * hands out a unique pravatar.cc avatar id per driver, since pravatar only
 * has {@link AVATAR_IMAGE_MAX_ID} stock photos to draw from.
 * @returns {{ phoneNumbers: string[], emails: string[], plateNumbers: string[], drivingLicenses: string[], nins: string[], avatarIds: number[] }} Per-driver unique value pools, each of length {@link DRIVER_COUNT}.
 */
const buildUniqueFieldPools = () => ({
  phoneNumbers: faker.helpers.uniqueArray(() => faker.helpers.replaceSymbols("+234##########"), DRIVER_COUNT),
  emails: faker.helpers.uniqueArray(() => faker.internet.email().toLowerCase(), DRIVER_COUNT),
  plateNumbers: faker.helpers.uniqueArray(() => faker.helpers.replaceSymbols("???-###??"), DRIVER_COUNT),
  drivingLicenses: faker.helpers.uniqueArray(() => faker.helpers.replaceSymbols("DL-########"), DRIVER_COUNT),
  nins: faker.helpers.uniqueArray(() => faker.string.numeric(11), DRIVER_COUNT),
  avatarIds: faker.helpers.arrayElements(
    Array.from({ length: AVATAR_IMAGE_MAX_ID }, (_, id) => id + 1),
    DRIVER_COUNT
  ),
});

/**
 * Builds one fake, self-consistent {@link Driver} record ready for
 * `prisma.driver.create`.
 * @param {Object} options - Build options.
 * @param {string} options.hashedPassword - Pre-hashed password shared across seeded drivers.
 * @param {string} options.phoneNumber - Pre-generated unique phone number for this driver.
 * @param {string} options.email - Pre-generated unique email for this driver.
 * @param {string} options.plateNumber - Pre-generated unique plate number for this driver.
 * @param {string} options.drivingLicense - Pre-generated unique driving license for this driver.
 * @param {string} options.nin - Pre-generated unique NIN for this driver.
 * @param {number} options.avatarId - Pre-generated unique pravatar.cc photo id (1-{@link AVATAR_IMAGE_MAX_ID}) for this driver.
 * @returns {import("#db/generated/prisma/client.js").Prisma.DriverCreateInput} Driver create input.
 */
const buildDriver = ({ hashedPassword, phoneNumber, email, plateNumber, drivingLicense, nin, avatarId }) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const vehicleType = faker.helpers.arrayElement(Object.values(VehicleType));
  const { brands, models } = VEHICLE_CATALOG[vehicleType];

  return {
    profilePicUrl: `${AVATAR_IMAGE_BASE_URL}/300?img=${avatarId}`,
    firstName,
    lastName,
    country: "Nigeria",
    phoneNumber,
    email,
    password: hashedPassword,
    vehicleType,
    category: vehicleType === VehicleType.Car ? faker.helpers.arrayElement(["Economy", "Comfort", "Premium"]) : null,
    brand: faker.helpers.arrayElement(brands),
    model: faker.helpers.arrayElement(models),
    modelYear: faker.date.past({ years: 10 }).getFullYear().toString(),
    vehicleColor: faker.vehicle.color(),
    registrationDate: faker.date.past({ years: 3 }).toISOString().slice(0, 10),
    plateNumber,
    drivingLicense,
    ninIdentification: nin,
    rate: faker.number.int({ min: 300, max: 2000 }).toString(),
    rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
    isVerified: faker.datatype.boolean(),
    isApproved: faker.helpers.arrayElement(Object.values(DriverVerificationStatus)),
  };
};

/**
 * Builds a real, working placeholder image URL (via placehold.co) labeled
 * with the given document name, so seeded document rows load an actual
 * image in the client instead of a dead link.
 * @param {string} label - Text baked into the placeholder image (e.g. "Front View").
 * @returns {string} A loadable image URL.
 */
const buildDocumentImageUrl = (label) => `${DOCUMENT_IMAGE_BASE_URL}/800x500.jpg?text=${encodeURIComponent(label)}`;

/**
 * Builds one fake {@link DriverDocuments} record for the given driver.
 * @param {string} driverId - The `driverId` of the {@link Driver} this document set belongs to.
 * @returns {import("#db/generated/prisma/client.js").Prisma.DriverDocumentsCreateInput} DriverDocuments create input.
 */
const buildDriverDocuments = (driverId) => ({
  driver: { connect: { driverId } },
  ninUrl: buildDocumentImageUrl("NIN"),
  frontViewUrl: buildDocumentImageUrl("Front View"),
  backViewUrl: buildDocumentImageUrl("Back View"),
  insideViewUrl: buildDocumentImageUrl("Inside View"),
  sideViewUrl: buildDocumentImageUrl("Side View"),
  plateNumberUrl: buildDocumentImageUrl("Plate Number"),
  insuranceUrl: buildDocumentImageUrl("Insurance"),
});

/**
 * Builds one fake {@link ActiveDrivers} record from an already-seeded driver,
 * placing it at a realistic coordinate within {@link LAGOS_RADIUS_KM} km of
 * {@link LAGOS_ORIGIN}.
 * @param {import("#db/generated/prisma/client.js").Driver} driver - The driver to project into the active-drivers table.
 * @returns {import("#db/generated/prisma/client.js").Prisma.ActiveDriversCreateInput} ActiveDrivers create input.
 */
const buildActiveDriver = (driver) => {
  const [latitude, longitude] = faker.location.nearbyGPSCoordinate({
    origin: LAGOS_ORIGIN,
    radius: LAGOS_RADIUS_KM,
    isMetric: true,
  });

  return {
    driverId: driver.driverId,
    name: `${driver.firstName} ${driver.lastName}`,
    image: driver.profilePicUrl,
    vehicleType: driver.vehicleType,
    category: driver.category,
    phone: driver.phoneNumber,
    driverStats: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
    ratings: driver.rating,
    rate: driver.rate,
    plateNumber: driver.plateNumber,
    latitude,
    longitude,
  };
};

/**
 * Seeds {@link DRIVER_COUNT} drivers with a matching driver-document row
 * each, then marks a random subset of {@link ACTIVE_DRIVER_COUNT} of them as
 * active with a generated Lagos-area coordinate.
 * @returns {Promise<void>}
 */
export const seedDrivers = async () => {
  const hashedPassword = await argon2.hash("Password123!");
  const { phoneNumbers, emails, plateNumbers, drivingLicenses, nins, avatarIds } = buildUniqueFieldPools();

  const drivers = await Promise.all(
    Array.from({ length: DRIVER_COUNT }, (_, index) =>
      prisma.driver.create({
        data: buildDriver({
          hashedPassword,
          phoneNumber: phoneNumbers[index],
          email: emails[index],
          plateNumber: plateNumbers[index],
          drivingLicense: drivingLicenses[index],
          nin: nins[index],
          avatarId: avatarIds[index],
        }),
      })
    )
  );

  logger.info(`Seeded ${drivers.length} drivers.`);

  await Promise.all(
    drivers.map((driver) => prisma.driverDocuments.create({ data: buildDriverDocuments(driver.driverId) }))
  );

  logger.info(`Seeded ${drivers.length} driver documents.`);

  const activeDrivers = faker.helpers.arrayElements(drivers, ACTIVE_DRIVER_COUNT);

  await Promise.all(
    activeDrivers.map((driver) => prisma.activeDrivers.create({ data: buildActiveDriver(driver) }))
  );

  logger.info(`Seeded ${activeDrivers.length} active drivers.`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDrivers()
    .catch((error) => {
      logger.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
