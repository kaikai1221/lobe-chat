// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { PrismaNeon } from '@prisma/adapter-neon';
// import { PrismaClient } from '@prisma/client';
// import { WebSocket } from 'undici'
// neonConfig.webSocketConstructor = WebSocket;
// // Initialize Prisma Client with the Neon serverless database driver
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaNeon(pool);
// const client = new PrismaClient({ adapter });
// export default client;
// export * from "@prisma/client";
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();
export default client;

export * from '@prisma/client';
