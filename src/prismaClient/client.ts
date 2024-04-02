import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export * from '@prisma/client';
// import { Pool, neonConfig } from '@neondatabase/serverless'
// import { PrismaNeon } from '@prisma/adapter-neon'
// import { PrismaClient } from '@prisma/client'
// // import dotenv from 'dotenv'
// import ws from 'ws'

// // dotenv.config()
// neonConfig.webSocketConstructor = ws
// const connectionString = `${process.env.DATABASE_URL}`

// const pool = new Pool({ connectionString })
// const adapter = new PrismaNeon(pool)
// export * from '@prisma/client';
// export default new PrismaClient({ adapter })
