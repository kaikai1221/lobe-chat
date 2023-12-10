import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const params = new URL(req.url).searchParams;
  const model = params.get('model')!;
  const token = accessCode;
  let res = await UserDAL.subQuota(token || '', model);
  if (res.code === serverStatus.quotaEmpty) {
    return NextResponse.json(
      {
        error: true,
        msg: res.msg,
      },
      {
        status: 200,
      },
    );
  }
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
