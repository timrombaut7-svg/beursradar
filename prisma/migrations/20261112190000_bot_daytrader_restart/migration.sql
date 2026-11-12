-- Opnieuw beginnen: de vorige reset liep vlak voor de nieuwe versie live stond,
-- waardoor de oude bot nog één ronde handelde. Nu start de daytrader echt schoon met € 100.000.
DELETE FROM "BotPosition";
DELETE FROM "BotTrade";
DELETE FROM "BotEquity";
