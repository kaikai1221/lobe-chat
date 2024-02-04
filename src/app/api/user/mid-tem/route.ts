import { NextResponse } from 'next/server';

import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET() {
  const res = await UserDAL.midTem();

  return NextResponse.json({
    body: JSON.parse(res?.content || '[]'),
    status: serverStatus.success,
  });
}
