import { NextRequest, NextResponse } from 'next/server';

import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { OrderDAL, parseUserId } from '@/prismaClient';

import { startPay } from './lantu';

export const runtime = 'nodejs';

export const POST = async (req: NextRequest) => {
  const { accessCode } = getOpenAIAuthFromRequest(req);
  const userId = await parseUserId(accessCode || '');
  const { planId, priceId, price } = await req.json();
  const userAgent = req.headers.get('user-agent')!;

  // 使用正则表达式匹配常见的移动设备用户代理字符串
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  let isMobile = mobileRegex.test(userAgent || 'PC');
  if (isMobile) {
    // 微信也当作pc处理
    const isWeChatBrowser = /micromessenger/.test(userAgent.toLowerCase());
    isMobile = !isWeChatBrowser;
  }
  const order = await OrderDAL.newOrder({
    amount: price,
    count: 1,
    planId,
    priceId,
    userId,
  });
  //
  return NextResponse.json(
    await startPay({
      attach: '',
      isMobile,
      orderId: order.orderId.toString(),
      price: 1 || order.amount,
      title: 'AI聊天室付费购买',
    }),
  );
};
