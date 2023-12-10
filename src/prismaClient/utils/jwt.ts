import { type JWTPayload, SignJWT, jwtVerify } from 'jose';

import client from '../client';
import { serverStatus } from '../serverStatus';

export const accessTokenUtils = {
  /**
   * 签发令牌
   * @param duration 持续时间
   * @param payload 负载
   */
  sign: async function sign<T extends JWTPayload>(
    duration: number,
    payload: T,
  ): Promise<{ expiredAt: number; token: string }> {
    const iat = Math.floor(Date.now() / 1000); // Not before: Now
    const exp = iat + duration; // Expires: Now + 1 week
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime(exp)
      .setIssuedAt(iat)
      .setNotBefore(iat)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    const user = await client.user.findUnique({
      select: {
        tokens: true,
      },
      where: { userId: payload.uid as number },
    });

    const userTokens = user?.tokens || [];
    userTokens.unshift(token);
    await client.user.update({
      data: {
        ip: payload.ip as string,
        tokens: {
          set: userTokens.slice(0, 2),
        },
        updatedAt: new Date(),
      },
      where: {
        userId: payload.uid as number,
      },
    });
    return {
      expiredAt: exp,
      token,
    };
  },

  /**
   * 效验令牌，返回负载
   * @param token
   */
  verify: async function verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
      const user = await client.user.findUnique({
        select: {
          integral: true,
          tokens: true,
        },
        where: { userId: payload.uid as number },
      });

      const userTokens = user?.tokens || [];
      if (userTokens.every((item) => item !== token)) {
        return { code: serverStatus.fullToken, msg: '登陆设备到达上限' };
      }
      return { ...payload, code: serverStatus.success, integral: user?.integral || 0 };
    } catch (error) {
      console.log(error);
      return { code: serverStatus.invalidToken, msg: '登陆过期或失效' };
      // throw new ServerError(serverStatus.invalidToken, "Invalid token");
    }
  },
  verifyLimit: async function verifyLimit(token: string) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
      if (payload.roleName === 'system') return { code: serverStatus.success, data: 'system' };
      const user = await client.user.findUnique({
        select: {
          integral: true,
          tokens: true,
          userLimits: {
            select: {
              modelName: true,
              subscription: {
                select: {
                  plan: {
                    select: {
                      limits: {
                        select: {
                          times: true,
                        },
                      },
                    },
                  },
                },
              },
              times: true,
            },
            where: {
              expiredAt: {
                gte: new Date(),
              },
              startAt: {
                lte: new Date(),
              },
            },
          },
        },
        where: { userId: payload.uid as number },
      });

      const userTokens = user?.tokens || [];
      if (userTokens.every((item) => item !== token)) {
        return { code: serverStatus.fullToken, msg: '登陆设备到达上限' };
      }
      return {
        ...payload,
        code: serverStatus.success,
        integral: user?.integral || 0,
        userLimits: user?.userLimits || [],
      };
    } catch (error) {
      console.log(error);
      return { code: serverStatus.invalidToken, msg: '登陆过期或失效' };
      // throw new ServerError(serverStatus.invalidToken, "Invalid token");
    }
  },
};

export async function parseUserId(token: string) {
  const { uid: userId } = (await accessTokenUtils.verify(token)) as unknown as {
    uid: number;
  };
  return userId;
}

export async function resumeToken(token: string): Promise<{ expiredAt: number; token: string }> {
  return await accessTokenUtils.sign(7 * 24 * (60 * 60), {
    uid: parseUserId(token),
  });
}
