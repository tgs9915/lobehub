ALTER TABLE "task_dependencies" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_documents" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_topics" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_deps_workspace_visibility_idx" ON "task_dependencies" USING btree ("workspace_id","visibility","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_docs_workspace_visibility_idx" ON "task_documents" USING btree ("workspace_id","visibility","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_topics_workspace_visibility_idx" ON "task_topics" USING btree ("workspace_id","visibility","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_visibility_idx" ON "tasks" USING btree ("workspace_id","visibility","created_by_user_id");
