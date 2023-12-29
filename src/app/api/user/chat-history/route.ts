import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const pageNo = Number(params.get('pageNo') || 1);
  const userId = Number(params.get('userId'));
  const pageSize = Number(params.get('pageSize') || 500);
  const { accessCode } = getOpenAIAuthFromRequest(req);
  let res: any = await UserDAL.getChatHistory(accessCode || '', userId, pageNo, pageSize);
  console.log(res.code);
  if ((res.code && res.code === serverStatus.fullToken) || res.code === serverStatus.invalidToken) {
    return NextResponse.json(
      {
        error: true,
        msg: res.msg,
      },
      {
        status: 401,
      },
    );
  }
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
