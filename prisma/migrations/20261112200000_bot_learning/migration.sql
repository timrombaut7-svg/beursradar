-- De bot onthoudt bij elke trade wat er speelde, om ervan te leren
ALTER TABLE "BotPosition" ADD COLUMN "features" JSONB;
ALTER TABLE "BotTrade" ADD COLUMN "features" JSONB;
