-- CreateTable
CREATE TABLE "ChatUsage" (
    "key" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("key","day")
);
