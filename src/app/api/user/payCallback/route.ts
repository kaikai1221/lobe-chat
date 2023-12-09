import { NextRequest } from 'next/server';

import { handleCallback } from '@/app/api/user/pay/lantu';
import { OrderDAL } from '@/prismaClient';

export const runtime = 'nodejs';

/**
 * This is the callback interface for processing payment platforms.
 * @constructor
 * @param req
 */
export async function POST(req: NextRequest) {
  const orderId = await handleCallback(req);
  if (!orderId) return new Response('FAIL');
  await OrderDAL.payOrder(orderId);
  return new Response('SUCCESS'); // 规定返回值 不可修改
}
