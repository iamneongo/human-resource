CREATE TYPE "public"."manual_attendance_source" AS ENUM('manual');--> statement-breakpoint
ALTER TYPE "public"."payroll_run_status" ADD VALUE 'previewed' BEFORE 'calculating';--> statement-breakpoint
CREATE TABLE "attendance_week_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_attendance_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"shift_id" uuid,
	"morning" boolean DEFAULT false NOT NULL,
	"afternoon" boolean DEFAULT false NOT NULL,
	"note" text,
	"action" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_employee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_attendance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"shift_id" uuid,
	"morning" boolean DEFAULT false NOT NULL,
	"afternoon" boolean DEFAULT false NOT NULL,
	"source" "manual_attendance_source" DEFAULT 'manual' NOT NULL,
	"note" text,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_mime_type" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_uploaded_by" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "file_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "is_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "manual_attendance_audits" ADD CONSTRAINT "manual_attendance_audits_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_audits" ADD CONSTRAINT "manual_attendance_audits_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_audits" ADD CONSTRAINT "manual_attendance_audits_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_entries" ADD CONSTRAINT "manual_attendance_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_entries" ADD CONSTRAINT "manual_attendance_entries_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;