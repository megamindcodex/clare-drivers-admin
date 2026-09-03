import { DriverVerificationStatus } from "#db/generated/prisma/client.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

/**
 * Allowed target states for each current `isApproved` state. `False` is a
 * terminal lock — no outbound transition, and no other state may transition
 * into it either, since it is never a valid target. `Pending` is likewise
 * never a re-settable target. `Rejected`/`Approved` can only flip between
 * each other.
 * @type {Record<string, string[]>}
 */
const ALLOWED_APPROVAL_TRANSITIONS = {
  [DriverVerificationStatus.False]: [],
  [DriverVerificationStatus.Pending]: [DriverVerificationStatus.Rejected, DriverVerificationStatus.Approved],
  [DriverVerificationStatus.Rejected]: [DriverVerificationStatus.Approved],
  [DriverVerificationStatus.Approved]: [DriverVerificationStatus.Rejected],
};

/**
 * Checks whether a driver's `isApproved` field can move from its current
 * state to an intended state, and throws if the transition isn't allowed.
 * @param {Object} params
 * @param {string} params.currentState - The driver's current `isApproved` value (DriverVerificationStatus enum value).
 * @param {string} params.intendedState - The `isApproved` value the caller wants to set (DriverVerificationStatus enum value).
 * @returns {true} When the transition is allowed.
 * @throws {AppError} INVALID_APPROVAL_TRANSITION - if the transition from currentState to intendedState isn't allowed.
 */
export const canUpdateIsApprovedState = ({ currentState, intendedState }) => {
  const isAllowed = ALLOWED_APPROVAL_TRANSITIONS[currentState].includes(intendedState);

  if (!isAllowed) {
    throw new AppError(`Cannot update approval status to ${intendedState} from its current state (${currentState}).`, {
      code: ErrorCodes.INVALID_APPROVAL_TRANSITION,
    });
  }

  return true;
};
