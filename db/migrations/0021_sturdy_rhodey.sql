CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'percent' NOT NULL,
	"value" numeric(18, 2) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_redeemed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "coupons_active_order_idx" ON "coupons" USING btree ("active","sort_order");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
GRANT SELECT ON TABLE "coupons" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "coupons" TO musikpro_service;