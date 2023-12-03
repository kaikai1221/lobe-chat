import { NextRequest, NextResponse } from 'next/server';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let res = await UserDAL.getUserInfo(req.headers.get(LOBE_CHAT_ACCESS_CODE)!);
  if (typeof res.code === 'number' && res.code !== serverStatus.success) {
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
