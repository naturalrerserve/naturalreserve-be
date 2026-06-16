-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginOtp" TEXT,
ADD COLUMN     "loginOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "password" TEXT NOT NULL DEFAULT '$2b$10$wVXZG.A6r4m5kP.NlOq.zueyZ3W/0LqjWl7S5E7H2.LzUv7Q2P2G6';
