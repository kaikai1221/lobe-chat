import { NextRequest, NextResponse } from 'next/server';

// import { ChatRequest, ChatResponse, serverStatus } from "@caw/types";
import { sendEmail } from '@/app/utils/email';
import { sendPhone } from '@/app/utils/phone';
import { CodeDAL, RegisterType } from '@/prismaClient';
// import { getRuntime } from '@/app/utils/get-runtime';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';

/**
 * Request verification code.
 * @param req
 * @constructor
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  const { type, value } = await req.json();

  // Logic will automatically check the speed.
  const result = await CodeDAL.newCode({
    register: value,
    type: type,
  });
  switch (result.type) {
    case RegisterType.Email: {
      // TODO 完善类型说明 @ Dc Amy
      await sendEmail(result.register, result.code);
      break;
    }
    case RegisterType.Phone: {
      // TODO
      await sendPhone(result.register, result.code);
      break;
    }
  }

  return NextResponse.json({
    expiredAt: result.expiredAt,
    status: serverStatus.success,
  });
};
