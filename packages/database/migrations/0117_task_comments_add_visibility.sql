ALTER TABLE "task_comments" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_comments_workspace_visibility_idx" ON "task_comments" USING btree ("workspace_id","visibility","user_id");
