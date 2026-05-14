UPDATE "User"
SET "isSuperAdmin" = true,
    "role" = 'ADMIN'
WHERE "email" = 'admin@example.com';
