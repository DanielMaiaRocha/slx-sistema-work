const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ [PREPARE-PRISMA] Prisma schema not found at: ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

// Determine if we should use PostgreSQL
const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

let newDatasourceBlock = '';

if (isPostgres) {
  console.log('🔌 [PREPARE-PRISMA] PostgreSQL database detected. Updating schema datasource...');
  newDatasourceBlock = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;
} else {
  console.log('🔌 [PREPARE-PRISMA] SQLite/local database detected. Updating schema datasource...');
  newDatasourceBlock = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;
}

// Regex to replace the datasource db block
const updatedSchema = schema.replace(/datasource db \{[\s\S]*?\}/, newDatasourceBlock);

fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
console.log('✅ [PREPARE-PRISMA] schema.prisma updated successfully.');
