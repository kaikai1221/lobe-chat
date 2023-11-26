import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL, parseUserId } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const userId = await parseUserId(accessCode || '');
  const params = new URL(req.url).searchParams;
  const integral = params.get('integral')!;
  let res = await UserDAL.subIntegral(userId, Number(integral));
  console.log(res);
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
