import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const params = new URL(req.url).searchParams;
  const redeemCode = params.get('redeemCode')!;
  let res = await UserDAL.useRedeem(accessCode || '', redeemCode);
  return NextResponse.json({
    status: res.code || serverStatus.success,
    ...res,
  });
}
