import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL, parseUserId } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const userId = await parseUserId(accessCode || '');
  const params = new URL(req.url).searchParams;
  const token = params.get('token')!;
  const modelName = params.get('modelName')!;
  const type = params.get('type')! as 'in' | 'out';
  const desc = params.get('desc')!;
  let res = await UserDAL.subIntegral(userId, Number(token), modelName, desc, type);
  console.log('剩余积分：' + res?.integral);
  console.log('模型：' + modelName);
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
