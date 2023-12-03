import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { password, oldPassword } = await req.json();
  const { accessCode } = getOpenAIAuthFromRequest(req);

  let res = await UserDAL.setPassword(accessCode || '', password, oldPassword);
  if (res && res.code === serverStatus.success) {
    return NextResponse.json({
      body: res,
      massage: res.massage,
      status: serverStatus.success,
    });
  } else {
    if (res.code === serverStatus.invalidToken) {
      return NextResponse.json(
        {
          error: true,
          msg: 'token不正确或已失效',
        },
        {
          status: 401,
        },
      );
    }
    return NextResponse.json(
      {
        error: true,
        massage: res.massage || '服务器错误',
      },
      {
        status: 500,
      },
    );
  }
}
