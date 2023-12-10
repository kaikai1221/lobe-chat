import { NextResponse } from 'next/server';

import { PlanDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const GET = async () => {
  return NextResponse.json({
    plans: await PlanDAL.getPlan(),
    status: serverStatus.success,
  });
  // case "startup":
  //   return await (await import("./startup")).default(req);
};
