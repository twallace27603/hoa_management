-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('MEMBER', 'BOARD_ONLY');

-- CreateEnum
CREATE TYPE "ArcRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ViolationEventType" AS ENUM ('REPORTED', 'NOTICE_SENT', 'STATUS_CHANGED', 'COMMENT_ADDED', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EmailRecipientScope" AS ENUM ('ALL_MEMBERS', 'SPECIFIC_MEMBERS', 'ARC_REQUEST', 'VIOLATION');

-- CreateTable
CREATE TABLE "Hoa" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "entraObjectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "hoaId" TEXT,
    "roleId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "invitedEmail" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'MEMBER',
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcRequest" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ArcRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcRequestAttachment" (
    "id" TEXT NOT NULL,
    "arcRequestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcRequestReview" (
    "id" TEXT NOT NULL,
    "arcRequestId" TEXT NOT NULL,
    "reviewedByUserId" TEXT NOT NULL,
    "decision" "ArcRequestStatus" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcRequestReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViolationHistoryEntry" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "eventType" "ViolationEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViolationHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViolationPhoto" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViolationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "sentByUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipientScope" "EmailRecipientScope" NOT NULL,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hoa_slug_key" ON "Hoa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_entraObjectId_key" ON "User"("entraObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_hoaId_invitedEmail_key" ON "Membership"("hoaId", "invitedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_hoaId_slug_key" ON "CmsPage"("hoaId", "slug");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcRequest" ADD CONSTRAINT "ArcRequest_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcRequestAttachment" ADD CONSTRAINT "ArcRequestAttachment_arcRequestId_fkey" FOREIGN KEY ("arcRequestId") REFERENCES "ArcRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcRequestReview" ADD CONSTRAINT "ArcRequestReview_arcRequestId_fkey" FOREIGN KEY ("arcRequestId") REFERENCES "ArcRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViolationHistoryEntry" ADD CONSTRAINT "ViolationHistoryEntry_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViolationPhoto" ADD CONSTRAINT "ViolationPhoto_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "Hoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
