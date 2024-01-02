// import fetcher from "@/app/utils/fetcher";
import { NextRequest, NextResponse } from 'next/server';

import { checkAuth } from '@/app/api/auth';
import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

const BASE_URL = process.env.MJ_BASE_URL || '';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = process.env.PROTOCOL || DEFAULT_PROTOCOL;
async function handle(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return NextResponse.json({ body: 'OK' }, { status: 200 });
  }
  let baseUrl = BASE_URL;
  if (!baseUrl.startsWith('http')) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const openaiPath = `${req.nextUrl.pathname}`.replaceAll(
    '/api/user/mj/ai/draw/mj/',
    '/mj/submit/',
  );

  const reqData = await req.clone().json();
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const result = await checkAuth({
    accessCode,
    model: 'midjourney',
    token: 1000,
    url: req.headers.get('origin') || '',
  });
  if (!result.auth) {
    if (result.error === 'InsufficientBalance') {
      return NextResponse.json(
        {
          code: 1,
          msg: `套餐不含midjourney或套餐或积分剩余额度不足`,
        },
        {
          status: 500,
        },
      );
    }
    if (result.error === 'InvalidAccessCode') {
      return NextResponse.json(
        {
          code: 1,
          msg: `请先登录`,
        },
        {
          status: 404,
        },
      );
    }
    return NextResponse.json(
      {
        code: 1,
        msg: `服务器错误请稍后再试`,
      },
      {
        status: 500,
      },
    );
  }
  try {
    const fetchUrl = `${baseUrl}${openaiPath}`;
    const queueRes = await fetch(`${baseUrl}/mj/task/queue`, {
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        'mj-api-secret': process.env.JWT_SECRET!,
      },
      method: 'GET',
    });
    let mjResData = {
      code: 1,
      description: '服务器错误请刷新后重试',
      result: '',
    };
    const queueData = await queueRes.clone().json();
    const chatInfo = await UserDAL.addChat(
      accessCode || '',
      reqData.model,
      mjResData.result,
      reqData.prompt || '',
      JSON.stringify({
        ...reqData,
        notifyHook: process.env.MJ_CALLBACK_DOMAIN,
        openaiPath,
      }),
    );
    if (queueData && queueData.length <= 9) {
      // eslint-disable-next-line no-undef
      const fetchOptions: RequestInit = {
        body: JSON.stringify({
          ...reqData,
          notifyHook: process.env.MJ_CALLBACK_DOMAIN,
          state: chatInfo.id,
        }),
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'mj-api-secret': process.env.JWT_SECRET!,
        },
        method: 'POST',
      };
      const mjRes = await fetch(fetchUrl, fetchOptions);
      mjResData = await mjRes.clone().json();
    }
    if (mjResData.code === 1) {
      return NextResponse.json(
        {
          code: serverStatus.success,
          msg: 'success',
        },
        {
          status: 200,
        },
      );
    } else {
      await UserDAL.delChat(accessCode || '', chatInfo.id as string, reqData.model);
      return NextResponse.json(
        {
          msg: mjResData?.description || '服务器错误请刷新后重试',
        },
        {
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error('[MJ]', error);
    return NextResponse.json(
      {
        msg: error,
      },
      {
        status: 500,
      },
    );
  }
}
export const POST = handle;
// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '10mb',
//     },
//   },
// }
// export const runtime = "edge";
