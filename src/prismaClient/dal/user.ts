import md5 from 'spark-md5';

import client, { Prisma, type User } from '../client';
import { ServerError, UserLogin, UserRegister, serverStatus } from '../serverStatus';
import { accessTokenUtils } from '../utils';

export type providerType = 'email' | 'phone' | 'wechat';
// interface Action {
//   /**
//    * 可继续执行的动作ID
//    */
//   customId: string;
//   /**
//    * 可执行动作的按钮emoji
//    */
//   emoji: string;
//   /**
//    * 可执行动作的按钮标签
//    */
//   label: string;
// }
// 响应接口
interface Data {
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
function getRandom(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

function getCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    let type = getRandom(1, 2);
    switch (type) {
      case 1: {
        code += String.fromCharCode(getRandom(48, 57)); //数字
        break;
      }
      case 2: {
        code += String.fromCharCode(getRandom(65, 90)); //大写字母
        break;
      }
    }
  }
  return code;
}
// @dalErrorCatcher
export class UserDAL {
  /**
   * 根据主键获取用户
   * @param id 主键，自增主键
   */
  static async getUser(id: number): Promise<User | null> {
    return client.user.findUnique({ where: { userId: id } });
  }

  /**
   * 根据唯一信息搜索用户
   */
  static async findUser({
    providerId,
    providerContent,
  }: {
    providerContent: string;
    providerId: providerType;
  }) {
    switch (providerId) {
      case 'email': {
        return client.user.findUnique({
          include: {
            role: true,
          },
          where: { email: providerContent },
        });
      }
      case 'phone': {
        return client.user.findUnique({
          include: {
            role: true,
          },
          where: { phone: providerContent },
        });
      }
      // case 'wechat':
      //   const wechatInfo = await client.wechatInfo.findUnique({
      //     where: { unionId: providerContent },
      //     include: {
      //       user: true,
      //     },
      //   });
      //   if (!wechatInfo) return null;
      //   return wechatInfo.user;
      default: {
        throw new Error('Please provide the correct way to find');
      }
    }
  }
  static async setLimits(planId: number, user: { subscriptions?: any; userId: number }) {
    const newUserPlan = await client.plan.findUnique({
      select: {
        level: true,
        limits: true,
        prices: true,
      },
      where: {
        planId: planId,
      },
    });
    const modelList = newUserPlan?.limits;
    const targetPrices = newUserPlan?.prices[0];
    if (targetPrices && modelList) {
      let currentDate = new Date();
      let userLimitsInput = {
        data: [] as Prisma.UserLimitsUncheckedCreateInput[],
      };
      if (user.subscriptions && user.subscriptions.length) {
        const levelSubscriptions = user.subscriptions.filter(
          (item: any) => item.plan.level === newUserPlan.level,
        );
        if (levelSubscriptions.length) {
          currentDate = new Date(levelSubscriptions[0].expiredAt);
        }
      }
      const subscriptionInput: Prisma.SubscriptionCreateInput = {
        createdAt: new Date(),
        expiredAt: new Date(currentDate.getTime() + targetPrices.duration * 1000),
        plan: {
          connect: {
            planId: planId,
          },
        },
        startAt: currentDate,
        user: {
          connect: {
            userId: user.userId,
          },
        },
      };
      const res = await client.subscription.create({
        data: subscriptionInput,
      });
      for (const item of modelList) {
        for (let i = 1; item.duration * i <= targetPrices.duration; i++) {
          userLimitsInput.data.push({
            createdAt: new Date(),
            expiredAt: new Date(currentDate.getTime() + item.duration * i * 1000),
            modelName: item.modelName,
            startAt: currentDate,
            subscriptionId: res.subscriptionId,
            userId: user.userId,
          });
        }
      }
      await client.userLimits.createMany(userLimitsInput);
    }
  }
  /**
   * 注册
   * @param email
   * @param phone
   * @param wechatInfo
   * @param password
   * @param registerCode
   * @param invitationCode
   */
  static async register({
    email,
    phone,
    password,
    registerCode,
    invitationCode,
    ip,
  }: {
    email?: string;
    invitationCode?: string;
    ip?: string;
    password?: string;
    phone?: string;
    registerCode?: string;
  }): Promise<UserRegister> {
    /* 当使用邮箱注册时，必须输入密码
     * When using Email to register, you must enter your password
     * */
    if (email || phone) {
      if (email && phone) throw new Error('Cannot pass both email and phone at one time');
      // if (email && !password)
      //   throw Error(
      //     "The password must be registered at the time of using cell phone number or email"
      //   );
      if (!registerCode)
        throw new Error(
          'The code must be registered at the time of using cell phone number or email',
        );

      /* 效验验证码
       * Validation code
       * */
      const validationCode = await client.registerCode.findUnique({
        where: {
          register: phone ? phone : email,
        },
      });
      if (validationCode?.code.toString() !== registerCode)
        throw new ServerError(serverStatus.invalidCode, 'Password error');
      if (new Date(validationCode.expiredAt.valueOf() + 1000 * 60 * 5) < new Date())
        throw new ServerError(serverStatus.wrongPassword, '验证码已过期');
    }
    const existUser = await client.user.findFirst({
      select: {
        role: true,
        userId: true,
      },
      where: {
        OR: [
          {
            email: {
              equals: email || undefined,
            },
          },
          {
            phone: {
              equals: phone || undefined,
            },
          },
        ],
      },
    });
    if (existUser) {
      return {
        signedToken: await accessTokenUtils.sign(7 * 24 * (60 * 60), {
          ip,
          roleName: existUser.role.name,
          uid: existUser.userId,
        }),
      };
    }

    // const userInput: Prisma.UserCreateInput = {
    //   email: email || undefined,
    //   phone: phone || undefined,
    //   passwordHash: password ? md5.hash(password) : undefined,
    //   role: {
    //     connectOrCreate: {
    //       where: {
    //         name: 'user',
    //       },
    //       create: {
    //         name: 'user', // TODO
    //       },
    //     },
    //   },
    //   invitation:{
    //     create:{

    //     }
    //   },
    //   invitationCodes: {
    //     connect: {
    //       code: getCode(),
    //     },
    //   },
    // };
    const user = await client.user.create({
      data: {
        email: email || undefined,
        invitationCodes: {
          create: {
            code: getCode(),
          },
        },
        passwordHash: password ? md5.hash(password) : undefined,
        phone: phone || undefined,
        role: {
          connectOrCreate: {
            create: {
              name: 'user', // TODO
            },
            where: {
              name: 'user',
            },
          },
        },
      },
    });
    await this.setLimits(1, user);
    /* Accept Invitation */
    if (invitationCode) {
      const code = await client.invitationCode.findUnique({
        include: {
          owner: {
            select: {
              name: true,
              subscriptions: {
                include: {
                  plan: {
                    select: {
                      level: true,
                    },
                  },
                },
                orderBy: [
                  {
                    expiredAt: 'desc',
                  },
                ],
                where: {
                  expiredAt: {
                    gte: new Date() /* Includes time offset for UTC */,
                  },
                },
              },
              userId: true,
            },
          },
        },
        where: {
          code: invitationCode,
        },
      });

      if (code /* If invitee id is exists, then make a record*/ && code.ownerId && code.owner) {
        const invitationRecordInput: Prisma.InvitationRecordCreateInput = {
          codeRaw: {
            connect: {
              code: code.code,
            },
          },
          invitee: {
            connect: {
              userId: user.userId,
            },
          },
          inviteeId: code.ownerId,
        };
        await client.invitationRecord.create({
          data: invitationRecordInput,
        });
        await this.setLimits(5, code.owner);
      }
      /*
       * TODO Some invitation may have some benefit
       * */
      return {
        invitation: {
          inviter: code?.owner?.name ? code.owner.name : undefined,
          status: serverStatus.success,
        },
        signedToken: await accessTokenUtils.sign(7 * 24 * (60 * 60), {
          ip,
          roleName: 'user',
          uid: user.userId,
        }),
      };
    }

    return {
      signedToken: await accessTokenUtils.sign(7 * 24 * (60 * 60), {
        ip,
        roleName: 'user',
        uid: user.userId,
      }),
    };
  }
  static async setPassword(token: string, password: string, oldPassword: string) {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    if (userId) {
      if (oldPassword) {
        const res = await client.user.findFirst({
          where: { passwordHash: oldPassword, userId: userId },
        });
        if (!res) return { code: serverStatus.wrongPassword, massage: '原密码错误' };
      }
      await client.user.update({
        data: {
          passwordHash: password,
        },
        where: { userId: userId },
      });
      return { code: 0, massage: 'success' };
    } else {
      return { code: serverStatus.invalidToken, massage: 'token无效' };
    }
  }
  /**
   * 登录
   * @param loginType
   */
  static async login({
    providerId,
    providerContent,
  }: {
    providerContent: { content: string; password?: string };
    providerId: providerType;
  }): Promise<UserLogin> {
    if (providerId !== 'wechat' && !providerContent.password) {
      throw new Error('请输入密码');
    }
    const user = await this.findUser({
      providerContent: providerContent.content,
      providerId,
    });
    if (!user) throw new ServerError(serverStatus.userNotExist, '用户不存在');
    if (providerId !== 'wechat' && (providerContent.password || '') !== user.passwordHash)
      throw new ServerError(serverStatus.wrongPassword, '用户名或密码不正确');
    /* default session duration is a week */
    return {
      signedToken: await accessTokenUtils.sign(7 * 24 * (60 * 60), {
        roleName: user.role.name,
        uid: user.userId,
      }),
    };
  }

  async resetChances(userId: number, value: number) {
    const user = await client.user.findUniqueOrThrow({
      select: {
        resetChances: true,
      },
      where: {
        userId: userId,
      },
    });
    if (user.resetChances + value < 0)
      throw new ServerError(serverStatus.notEnoughChances, 'not enough chances');
    return await client.user.update({
      data: {
        resetChances: value,
      },
      where: {
        userId: userId,
      },
    });
  }
  static async getUserInfo(token: string): Promise<
    {
      email?: string | null;
      hasPassword?: boolean;
      passwordHash?: undefined;
      phone?: string | null;
      userId?: number;
      userLimits?: any[];
    } & { code?: serverStatus; msg?: string | undefined }
  > {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    const res = await client.user.findUnique({
      select: {
        email: true,
        invitation: {
          where: {
            inviterId: userId,
          },
        },
        invitationCodes: {
          select: {
            code: true,
          },
        },
        passwordHash: true,
        phone: true,
        resetChances: true,
        subscriptions: {
          orderBy: [
            {
              expiredAt: 'desc',
            },
          ],
          select: {
            expiredAt: true,
            planId: true,
            startAt: true,
          },
          where: {
            expiredAt: {
              gte: new Date(),
            },
          },
        },
        userId: true,
        userLimits: {
          select: {
            expiredAt: true,
            modelName: true,
            startAt: true,
            subscription: {
              select: {
                plan: {
                  select: {
                    limits: true,
                    name: true,
                  },
                },
              },
            },
            times: true,
          },
          where: {
            expiredAt: {
              gte: new Date() /* Includes time offset for UTC */,
            },
            startAt: {
              lte: new Date(),
            },
          },
        },
      },
      where: { userId: userId },
    });
    return {
      ...res,
      hasPassword: !!res?.passwordHash,
      passwordHash: undefined,
    };
  }
  static async subQuota(token: string, model: string, num?: number) {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    const userLimits = await client.userLimits.findMany({
      orderBy: {
        subscription: {
          plan: {
            level: 'asc',
          },
        },
      },
      select: {
        id: true,
        subscription: {
          select: {
            plan: {
              select: {
                limits: {
                  select: {
                    times: true,
                  },
                  where: {
                    modelName: model,
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
          gte: new Date() /* Includes time offset for UTC */,
        },
        modelName: model,
        startAt: {
          lte: new Date(),
        },
        userId: userId,
      },
    });
    if (userLimits.length) {
      const targetRes = userLimits.find((item) => {
        return item.times <= item.subscription.plan.limits[0].times;
      });
      if (!targetRes) {
        return { code: serverStatus.quotaEmpty, msg: '额度不足请充值' };
      } else {
        await client.userLimits.update({
          data: {
            times: targetRes.times + (num || 1),
            updatedAt: new Date(),
          },
          where: {
            id: targetRes.id,
          },
        });
        return { code: 0, msg: 'success' };
      }
    } else {
      return { code: serverStatus.quotaEmpty, msg: '请先购买套餐' };
    }
  }
  static async addChat(
    token: string,
    model: string,
    mjTaskId: string,
    prompt: string,
    mjParams: string,
  ) {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    return await client.chatHistory.upsert({
      create: {
        mjParams,
        mjTaskId: mjTaskId,
        modelName: model,
        prompt,
        userId,
      },
      update: {
        modelName: model,
        prompt,
        userId,
      },
      where: {
        mjTaskId: mjTaskId,
      },
    });
  }
  static async delChat(token: string, model: string, id: string) {
    const verifyRes = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    // const userId = verifyRes.uid as number;
    this.subQuota(token, model, -1);
    return await client.chatHistory.delete({
      where: {
        id: id,
      },
    });
  }
  static async editMjChat(data: Data) {
    if (data.imageUrl) data.imageUrl = data.imageUrl.replace(/([#?])[^"']*/, '');
    if (data.state) {
      return await client.chatHistory.upsert({
        create: {
          content: JSON.stringify(data),
          mjTaskId: data.id,
        },
        update: {
          content: JSON.stringify(data),
          mjParams: null,
          mjTaskId: data.id,
        },
        where: {
          id: data.state,
        },
      });
    } else {
      return await client.chatHistory.upsert({
        create: {
          content: JSON.stringify(data),
          mjTaskId: data.id,
        },
        update: {
          content: JSON.stringify(data),
          mjParams: null,
          mjTaskId: data.id,
        },
        where: {
          mjTaskId: data.id,
        },
      });
    }
  }
  static async getChatHistory(
    token: string,
    userId?: number,
    pageNo: number = 1,
    pageSize: number = 100,
  ) {
    // const data: Prisma.RedeemCreateManyInput[] = [];
    // function generateRandomString(length: number) {
    //   var result = '';
    //   var characters =
    //     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    //   var charactersLength = characters.length;
    //   for (var i = 0; i < length; i++) {
    //     result += characters.charAt(
    //       Math.floor(Math.random() * charactersLength)
    //     );
    //   }
    //   return result;
    // }
    // for (let index = 0; index < 100; index++) {
    //   data.push({
    //     redeemCode: generateRandomString(20),
    //     planId: 7,
    //   });
    // }
    // console.log(
    //   await client.redeem.createMany({
    //     data,
    //   })
    // );
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const id = userId || (verifyRes.uid as number);
    return client.chatHistory.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        content: true,
        createdAt: true,
        modelName: true,
        prompt: true,
      },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
      where: {
        userId: {
          equals: id,
        },
      },
    });
  }
  static async getMjPending() {
    const res = await client.chatHistory.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mjParams: true,
        modelName: true,
        prompt: true,
      },
      where: {
        content: null,
        modelName: 'midjourney',
      },
    });
    client.chatHistory.update({
      data: {
        content: '{}',
      },
      where: {
        id: res?.id,
      },
    });
    return res;
  }
  static async getUserLimits(token: string, modelName: string): Promise<any> {
    //获取用户改模板用量
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.roleName === 'system') return { code: serverStatus.success, data: 'system' };
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    return {
      userLimits: await client.userLimits.findMany({
        select: {
          subscription: {
            select: {
              plan: {
                select: {
                  limits: {
                    select: {
                      times: true,
                    },
                    where: {
                      modelName: modelName,
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
            gte: new Date() /* Includes time offset for UTC */,
          },
          modelName: modelName,
          startAt: {
            lte: new Date(),
          },
          userId: userId,
        },
      }),
    };
  }
  static async useRedeem(token: string, redeemCode: string) {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    if (userId) {
      const redeemRes = await client.redeem.findUnique({
        select: {
          activatedBy: true,
          isActivated: true,
          plan: {
            select: {
              level: true,
              limits: true,
              prices: true,
            },
          },
          planId: true,
        },
        where: { redeemCode: redeemCode },
      });
      if (!redeemRes) return { code: serverStatus.redeemUsed, msg: '兑换码不存在' };
      if (redeemRes?.activatedBy || redeemRes?.isActivated) {
        return { code: serverStatus.redeemUsed, msg: '兑换码已被使用' };
      } else {
        await client.redeem.update({
          data: {
            activatedAt: new Date(),
            activatedBy: userId,
            isActivated: true,
          },
          where: {
            redeemCode: redeemCode,
          },
        });
        if (!redeemRes?.plan) {
          return { code: serverStatus.failed, msg: '兑换码不存在' };
        }
        const userRes = await client.user.findUnique({
          select: {
            subscriptions: {
              orderBy: {
                expiredAt: 'desc',
              },
              where: {
                expiredAt: {
                  gte: new Date(),
                },
                plan: {
                  level: redeemRes.plan.level,
                },
              },
            },
          },
          where: { userId: userId },
        });
        const modelList = redeemRes?.plan.limits;
        const targetPrices = redeemRes?.plan.prices[0];
        let currentDate = new Date();
        if (userRes?.subscriptions.length) {
          currentDate = new Date(userRes.subscriptions[0].expiredAt);
        }
        const subscriptionInput: Prisma.SubscriptionCreateInput = {
          createdAt: new Date(),
          expiredAt: new Date(currentDate.getTime() + targetPrices.duration * 1000),
          plan: {
            connect: {
              planId: targetPrices.planId,
            },
          },
          redeem: {
            connect: {
              redeemCode: redeemCode,
            },
          },
          startAt: currentDate,
          user: {
            connect: {
              userId: userId,
            },
          },
        };
        const res = await client.subscription.create({
          data: subscriptionInput,
        });

        let userLimitsInput = {
          data: [] as Prisma.UserLimitsUncheckedCreateInput[],
        };
        for (const item of modelList) {
          for (let i = 1; item.duration * i <= targetPrices.duration; i++) {
            userLimitsInput.data.push({
              createdAt: new Date(),
              expiredAt: new Date(currentDate.getTime() + item.duration * i * 1000),
              modelName: item.modelName,
              startAt: new Date(currentDate.getTime() + item.duration * (i - 1) * 1000),
              subscriptionId: res.subscriptionId,
              userId: userId,
            });
          }
        }
        await client.userLimits.createMany(userLimitsInput);
        return {
          msg: '使用成功',
        };
      }
    } else {
      return { code: serverStatus.invalidToken, msg: 'token不正确或已失效' };
    }
  }
  static async subIntegral(userId: number, integral: number) {
    return await client.user.update({
      data: {
        integral: {
          decrement: integral,
        },
      },
      where: {
        userId,
      },
    });
  }
}
