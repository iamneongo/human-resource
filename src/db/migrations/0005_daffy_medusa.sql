ALTER TYPE "public"."employee_document_type" ADD VALUE IF NOT EXISTS 'social_insurance';
--> statement-breakpoint
ALTER TYPE "public"."employee_document_type" ADD VALUE IF NOT EXISTS 'certificate';
--> statement-breakpoint
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "expiry_date" date;
