import { NextRequest } from 'next/server';

import { handleCallback } from '@/app/api/user/pay/lantu';
import { OrderDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

/**
 * This is the callback interface for processing payment platforms.
 * @constructor
 * @param req
 */
export async function POST(req: NextRequest) {
  const orderId = await handleCallback(req);
  if (!orderId) return new Response('FAIL');
  const res = await OrderDAL.payOrder(orderId);
  if (res.code === serverStatus.success) {
    return new Response('SUCCESS'); // 规定返回值 不可修改
  } else {
    return new Response('FAIL');
  }
}
