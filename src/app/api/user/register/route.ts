import { NextRequest, NextResponse } from 'next/server';

import { UserDAL } from '@/prismaClient';
import { ServerError, serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

/**
 * Registered user
 * @param req
 * @constructor
 */
export async function POST(req: NextRequest): Promise<Response> {
  /* TODO Next.js currently does not support the return type description
   * The correct return type here maybe look like Promise<NextResponse<ChatResponse.UserRegister>>
   * */
  try {
    const {
      email,
      phone,
      password,
      register_code: registerCode,
      invitation_code: invitationCode,
    } = await req.json();
    let ip: string | undefined;
    if (req.headers.get('CloudFront-Viewer-Address')) {
      ip = req.headers.get('CloudFront-Viewer-Address') || '';
    } else if (req.ip) {
      ip = req.ip;
    } else if (req.headers.get('x-real-ip')) {
      ip = req.headers.get('x-real-ip') || undefined;
    } else if (req.headers.get('x-forwarded-for')) {
      const forwarded = req.headers.get('x-forwarded-for');
      ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : '';
      ip = req.headers.get('x-forwarded-for') || undefined;
    } else {
      ip = req.nextUrl.hostname;
    }
    console.log(req.headers);
    /* Activation verification code */
    const result = await UserDAL.register({
      email,
      invitationCode,
      ip,
      password,
      phone,
      registerCode,
    });

    return NextResponse.json({
      status: serverStatus.success,
      ...result,
    });
  } catch (error) {
    if (error instanceof ServerError)
      return NextResponse.json({ msg: error.message, status: error.errorCode });

    console.error('[REGISTER]', error);
    return new Response('[INTERNAL ERROR]', { status: 500 });
  }
}
