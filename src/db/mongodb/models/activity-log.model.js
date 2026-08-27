import mongoose from "mongoose";

import { ActivityActorType, ActivityTargetType, ActivityStatus } from "#constants/activity-log.constant.js";

const { Schema, model } = mongoose;

/**
 * Mongoose schema for an immutable activity/audit log entry recording an
 * action taken by an admin, driver, or the system against a resource.
 * @type {import("mongoose").Schema}
 */
const activityLogSchema = new Schema(
  {
    actorId: {
      type: String,
      required: true,
    },
    actorType: {
      type: String,
      enum: Object.values(ActivityActorType),
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      enum: Object.values(AuditTargetType),
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: Object.values(AuditStatus),
      default: AuditStatus.SUCCESS,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

activityLogSchema.index({ actorId: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

/**
 * Mongoose model for the `activitylogs` collection, storing immutable
 * admin/driver/system activity and audit trail entries.
 * @type {import("mongoose").Model}
 */
export const ActivityLog = model("ActivityLog", activityLogSchema);
