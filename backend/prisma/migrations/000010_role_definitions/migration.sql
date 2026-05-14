CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleDefinition_name_key" ON "RoleDefinition"("name");

ALTER TABLE "User" ADD COLUMN "roleDefinitionId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_roleDefinitionId_fkey" FOREIGN KEY ("roleDefinitionId") REFERENCES "RoleDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
