import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';
import { accessTokenUtils } from '@/prismaClient/utils/jwt';

export async function POST(req: NextRequest) {
  const reqData = await req.clone().json();
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const verifyRef = await accessTokenUtils.verifySign(accessCode || '');
  if (verifyRef.code === serverStatus.success) {
    await UserDAL.delChat(accessCode || '', reqData.id);
  } else {
    return NextResponse.json(
      {
        code: 1,
        msg: verifyRef.msg,
      },
      {
        status: 401,
      },
    );
  }
  return NextResponse.json({
    body: 'success',
    status: serverStatus.success,
  });
}
