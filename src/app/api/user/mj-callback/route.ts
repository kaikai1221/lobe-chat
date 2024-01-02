import { NextRequest, NextResponse } from 'next/server';

import { UserDAL } from '@/prismaClient';
// import qiniu from "qiniu";
import { serverStatus } from '@/prismaClient/serverStatus';

export interface ApifoxModel {
  data: Data;
  message: string;
  statusCode: number;
}
// var mac = new qiniu.auth.digest.Mac(
//   process.env.QINIU_AK || "",
//   process.env.QINIU_SK || "",
// );
// const config = new qiniu.conf.Config();
// var bucketManager = new qiniu.rs.BucketManager(mac, config);
// const bucket = "chat99-img-abroad";
export interface Data {
  action: string;
  description: string;
  failReason: string;
  finishTime: number;
  id: string;
  imageUrl: string;
  progress: string;
  prompt: string;
  promptEn: string;
  properties: Record<string, unknown>;
  startTime: number;
  state: string;
  status: string;
  submitTime: number;
}

export interface Action {
  /**
   * 可继续执行的动作ID
   */
  customId: string;
  /**
   * 可执行动作的按钮emoji
   */
  emoji: string;
  /**
   * 可执行动作的按钮标签
   */
  label: string;
}
export const runtime = 'nodejs';

/**
 * This is the callback interface for processing payment platforms.
 * @constructor
 * @param req
 */
export async function POST(req: NextRequest) {
  const reqData: Data = await req.clone().json();
  const res = await UserDAL.editMjChat(reqData);
  if (reqData.status === 'FAILURE' || reqData.status === 'SUCCESS') {
    const firstPending = await UserDAL.getMjPending();
    if (firstPending) {
      // eslint-disable-next-line no-undef
      const fetchOptions: RequestInit = {
        body: {
          ...JSON.parse(firstPending.mjParams || '{}'),
          state: firstPending.id,
        },
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'mj-api-secret': process.env.JWT_SECRET!,
        },
        method: 'POST',
      };
      const mjRes = await fetch(
        `${process.env.MJ_BASE_URL}${
          JSON.parse(firstPending?.mjParams || '{}')?.openaiPath || '/mj/submit/imagine'
        }`,
        fetchOptions,
      );
      return NextResponse.json({
        body: await mjRes.json(),
        status: serverStatus.success,
      });
    }
  }
  return NextResponse.json({
    body: res,
    status: serverStatus.success,
  });
}
// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '10mb',
//     },
//   },
// }
