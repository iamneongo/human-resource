CREATE TYPE "public"."org_unit_type" AS ENUM('block', 'department', 'section', 'workshop');--> statement-breakpoint
CREATE TYPE "public"."ppe_issue_type" AS ENUM('new', 'periodic');--> statement-breakpoint
CREATE TYPE "public"."ppe_item" AS ENUM('protective', 'boot', 'shoe', 'other');--> statement-breakpoint
ALTER TYPE "public"."contract_type" ADD VALUE 'term_1y' BEFORE 'indefinite';--> statement-breakpoint
ALTER TYPE "public"."contract_type" ADD VALUE 'term_3y' BEFORE 'indefinite';--> statement-breakpoint
ALTER TYPE "public"."contract_type" ADD VALUE 'until_retirement' BEFORE 'seasonal';--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"birth_place" text,
	"cccd_issue_date" date,
	"cccd_issue_place" text,
	"nationality" text,
	"permanent_address" text,
	"temporary_address" text,
	"education_level" text,
	"major" text,
	"job_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_profiles_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "ppe_issuances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"item" "ppe_item" NOT NULL,
	"issue_type" "ppe_issue_type" DEFAULT 'new' NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer,
	"issued_at" date,
	"expires_at" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "type" "org_unit_type" DEFAULT 'department' NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "sign_number" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "sign_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "seniority_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "probation_end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "resign_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "resign_reason" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppe_issuances" ADD CONSTRAINT "ppe_issuances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;