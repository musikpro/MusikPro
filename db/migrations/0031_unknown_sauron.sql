ALTER TABLE "country_languages" ADD COLUMN "currency_code" text DEFAULT 'XOF' NOT NULL;
--> statement-breakpoint
UPDATE "country_languages" SET "currency_code" = CASE "country_code"
	WHEN 'BJ' THEN 'XOF' WHEN 'BF' THEN 'XOF' WHEN 'CM' THEN 'XAF' WHEN 'TD' THEN 'XAF'
	WHEN 'CG' THEN 'XAF' WHEN 'CD' THEN 'CDF' WHEN 'CI' THEN 'XOF' WHEN 'GA' THEN 'XAF'
	WHEN 'GH' THEN 'GHS' WHEN 'GN' THEN 'GNF' WHEN 'KE' THEN 'KES' WHEN 'ML' THEN 'XOF'
	WHEN 'MZ' THEN 'MZN' WHEN 'NE' THEN 'XOF' WHEN 'NG' THEN 'NGN' WHEN 'RW' THEN 'RWF'
	WHEN 'SN' THEN 'XOF' WHEN 'TZ' THEN 'TZS' WHEN 'UG' THEN 'UGX' WHEN 'ZM' THEN 'ZMW'
	ELSE "currency_code" END;