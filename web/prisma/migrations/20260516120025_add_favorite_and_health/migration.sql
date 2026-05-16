-- CreateTable
CREATE TABLE "ProviderHealth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "message" TEXT,
    "latencyMs" INTEGER,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "size" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "seed" INTEGER,
    "paramsJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "externalTaskId" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "costUsd" REAL,
    "lastRequestJson" TEXT,
    "lastResponseJson" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Generation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Generation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Generation" ("costUsd", "count", "createdAt", "durationMs", "errorMessage", "externalTaskId", "finishedAt", "id", "lastRequestJson", "lastResponseJson", "modelId", "negativePrompt", "paramsJson", "progress", "prompt", "providerId", "resultUrlsJson", "seed", "size", "startedAt", "status", "updatedAt", "userId") SELECT "costUsd", "count", "createdAt", "durationMs", "errorMessage", "externalTaskId", "finishedAt", "id", "lastRequestJson", "lastResponseJson", "modelId", "negativePrompt", "paramsJson", "progress", "prompt", "providerId", "resultUrlsJson", "seed", "size", "startedAt", "status", "updatedAt", "userId" FROM "Generation";
DROP TABLE "Generation";
ALTER TABLE "new_Generation" RENAME TO "Generation";
CREATE INDEX "Generation_status_idx" ON "Generation"("status");
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt");
CREATE INDEX "Generation_providerId_createdAt_idx" ON "Generation"("providerId", "createdAt");
CREATE INDEX "Generation_favorite_createdAt_idx" ON "Generation"("favorite", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProviderHealth_providerId_checkedAt_idx" ON "ProviderHealth"("providerId", "checkedAt");
