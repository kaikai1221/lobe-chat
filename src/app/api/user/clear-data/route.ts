import { NextResponse } from 'next/server';

import { UserDAL } from '@/prismaClient';

export const runtime = 'nodejs';

export async function GET() {
  let res = await UserDAL.clearData();
  return NextResponse.json(res);
}
