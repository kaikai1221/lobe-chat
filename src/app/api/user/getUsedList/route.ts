import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL, parseUserId } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const userId = await parseUserId(accessCode || '');
  const params = new URL(req.url).searchParams;
  const pageNo = params.get('pageNo')!;
  const pageSize = params.get('pageSize') || 10;
  let res = await UserDAL.getUsed(userId, Number(pageNo), Number(pageSize));
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
