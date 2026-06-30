ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_groups" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_workspace_visibility_idx" ON "agents" USING btree ("workspace_id","visibility","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_groups_workspace_visibility_idx" ON "chat_groups" USING btree ("workspace_id","visibility","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_groups_workspace_visibility_idx" ON "session_groups" USING btree ("workspace_id","visibility","user_id");
