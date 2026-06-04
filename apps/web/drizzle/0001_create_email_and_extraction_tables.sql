CREATE TABLE "email" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"gmail_message_id" text NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"from" text NOT NULL,
	"subject" text NOT NULL,
	"snippet" text NOT NULL,
	"body" text NOT NULL,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_account_id_gmail_message_id_unique" UNIQUE("account_id","gmail_message_id")
);
--> statement-breakpoint
CREATE TABLE "extraction" (
	"id" text PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction" ADD CONSTRAINT "extraction_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extraction_email_id_index" ON "extraction" USING btree ("email_id");