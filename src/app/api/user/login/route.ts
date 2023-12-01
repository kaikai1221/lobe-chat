import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { UserDAL, providerType, resumeToken } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

export const GET = async (req: NextRequest) => {
  const params = new URL(req.url).searchParams;
  const token = params.get('token');
  if (token) {
    return NextResponse.json({
      signedToken: { ...(await resumeToken(token)) },
      status: serverStatus.success,
    });
  }
};

export const POST = async (req: NextRequest) => {
  const { providerId, providerContent } = await z
    .object({
      providerContent: z.object({
        content: z.string(),
        password: z.string(),
      }),
      providerId: z.string(),
    })
    .parseAsync(await req.json());

  return NextResponse.json({
    status: serverStatus.success,
    ...(await UserDAL.login({
      providerContent,
      providerId: providerId as providerType,
    })),
  });
};
