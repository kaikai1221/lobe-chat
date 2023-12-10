import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { accessTokenUtils } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export async function GET(req: NextRequest) {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  return NextResponse.json({
    body: await accessTokenUtils.verifyLimit(accessCode || ''),
    status: serverStatus.success,
  });
}
