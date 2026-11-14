CREATE TABLE "prices" (
	"region" text NOT NULL,
	"item_id" text NOT NULL,
	"market_id" text NOT NULL,
	"quality" integer NOT NULL,
	"sell_price_min" bigint NOT NULL,
	"sell_price_min_date" text NOT NULL,
	"sell_price_max" bigint NOT NULL,
	"sell_price_max_date" text NOT NULL,
	"buy_price_min" bigint NOT NULL,
	"buy_price_min_date" text NOT NULL,
	"buy_price_max" bigint NOT NULL,
	"buy_price_max_date" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "prices_region_item_id_market_id_quality_pk" PRIMARY KEY("region","item_id","market_id","quality")
);
