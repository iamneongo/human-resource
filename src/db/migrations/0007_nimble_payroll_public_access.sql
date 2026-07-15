ALTER TABLE "payslips" ADD COLUMN "public_access_code" text;
--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_public_access_code_unique" UNIQUE("public_access_code");
