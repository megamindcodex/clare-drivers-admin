-- CreateTable
CREATE TABLE `drivers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driverId` VARCHAR(191) NOT NULL,
    `profile_pic_url` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `vehicle_type` ENUM('Car', 'Bike', 'Keke') NOT NULL,
    `category` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `model_year` VARCHAR(191) NULL,
    `vehicle_color` VARCHAR(191) NULL,
    `registration_date` VARCHAR(191) NULL,
    `plate_number` VARCHAR(191) NOT NULL,
    `driving_license` VARCHAR(191) NULL,
    `nin_identification` VARCHAR(191) NULL,
    `rate` VARCHAR(191) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'inactive',
    `is_verified` BOOLEAN NOT NULL,
    `is_approved` ENUM('False', 'Pending', 'Rejected', 'Approved') NOT NULL DEFAULT 'False',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `reset_password_token` VARCHAR(191) NULL,
    `reset_password_expires_at` DATETIME(3) NULL,
    `verification_token` VARCHAR(191) NULL,
    `verification_token_expires_at` DATETIME(3) NULL,

    UNIQUE INDEX `drivers_driverId_key`(`driverId`),
    UNIQUE INDEX `drivers_phone_number_key`(`phone_number`),
    UNIQUE INDEX `drivers_email_key`(`email`),
    UNIQUE INDEX `drivers_plate_number_key`(`plate_number`),
    UNIQUE INDEX `drivers_driving_license_key`(`driving_license`),
    UNIQUE INDEX `drivers_nin_identification_key`(`nin_identification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driver_id` VARCHAR(191) NOT NULL,
    `nin_url` VARCHAR(191) NULL,
    `front_view_url` VARCHAR(191) NULL,
    `back_view_url` VARCHAR(191) NULL,
    `inside_view_url` VARCHAR(191) NULL,
    `side_view_url` VARCHAR(191) NULL,
    `plate_number_url` VARCHAR(191) NULL,
    `insurance_url` VARCHAR(191) NULL,
    `reject_comment` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `driver_documents_driver_id_key`(`driver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `active_drivers` (
    `driver_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NULL,
    `vehicle_type` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `driver_stats` DOUBLE NOT NULL,
    `ratings` DOUBLE NOT NULL,
    `rate` VARCHAR(191) NOT NULL,
    `plate_number` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`driver_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('User', 'Admin', 'SuperAdmin') NOT NULL DEFAULT 'User',
    `status` ENUM('Active', 'Suspended', 'Banned') NOT NULL DEFAULT 'Active',
    `last_login` DATETIME(3) NULL,
    `reset_code` VARCHAR(191) NULL,
    `reset_code_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_user_id_key`(`user_id`),
    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driver_documents` ADD CONSTRAINT `driver_documents_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`driverId`) ON DELETE RESTRICT ON UPDATE CASCADE;
