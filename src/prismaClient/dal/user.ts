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
function roundUp(num: number) {
  if (Number.isInteger(num)) {
    return num;
  }
  // 如果是负数，则直接向下取整
  if (num < 0) {
    return Math.floor(num);
  }
  // 向上取整并加 1
  return Math.ceil(num);
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
        signedToken: await accessTokenUtils.sign(30 * 24 * (60 * 60), {
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
    // await this.setLimits(1, user);
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
        await client.invitationRecord.create({
          data: {
            code: code.code,
            inviteeId: user.userId,
            inviterId: code.ownerId,
          },
        });
        await this.addIntegral(code.owner.userId, '邀请奖励', 1000);
      }
      /*
       * TODO Some invitation may have some benefit
       * */
      return {
        invitation: {
          inviter: code?.owner?.name ? code.owner.name : undefined,
          status: serverStatus.success,
        },
        signedToken: await accessTokenUtils.sign(30 * 24 * (60 * 60), {
          ip,
          roleName: 'user',
          uid: user.userId,
        }),
      };
    }

    return {
      signedToken: await accessTokenUtils.sign(30 * 24 * (60 * 60), {
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
      signedToken: await accessTokenUtils.sign(30 * 24 * (60 * 60), {
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
      invitation: any;
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
        integral: true,
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
          orderBy: {
            startAt: 'asc',
          },
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
              gte: new Date(),
            },
          },
        },
      },
      where: { userId: userId },
    });
    return {
      ...res,
      hasPassword: !!res?.passwordHash,
      invitation:
        (await client.user.findMany({
          select: {
            createdAt: true,
            email: true,
            phone: true,
          },
          where: {
            inviter: {
              some: { inviterId: userId },
            },
          },
        })) || [],
      passwordHash: undefined,
    };
  }
  static async subQuota(token: string, model: string, num?: number) {
    const verifyRes: any = await accessTokenUtils.verify(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    const userId = verifyRes.uid as number;
    let name = model;

    if (model.includes('gpt-3.5') && model !== 'gpt-3.5-turbo') {
      name = 'gpt-3.5-turbo';
    }
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
                    modelName: name,
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
        modelName: name,
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
            times: {
              increment: num || 1,
            },
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
  static async delChat(token: string, id: string, model?: string) {
    const verifyRes = await accessTokenUtils.verifySign(token);
    if (verifyRes.code !== serverStatus.success) return verifyRes;
    // const userId = verifyRes.uid as number;
    if (model) this.subQuota(token, model, -1);
    return await client.chatHistory.delete({
      where: {
        id: id,
      },
    });
  }
  static async editMjChat(data: Data) {
    // if (data.imageUrl) data.imageUrl = data.imageUrl.replace(/([#?])[^"']*/, '');
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
        id: true,
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
  static async subIntegral(
    userId: number,
    token: number,
    modelName: string,
    desc: string,
    type: 'in' | 'out' | 'order',
  ) {
    const changeSubIntegral = async () => {
      let integral = 0;
      const data = await client.model.findUnique({
        where: {
          modelName,
        },
      });
      const { inputPrice, outPrice, unitPrice } = data || {
        inputPrice: 10,
        outPrice: 20,
        unitPrice: 100,
      };
      switch (type) {
        case 'order': {
          integral = unitPrice;
          break;
        }
        case 'in': {
          integral = roundUp((token / 1000) * inputPrice);
          break;
        }
        case 'out': {
          integral = roundUp((token / 1000) * outPrice);
          break;
        }
        default: {
          break;
        }
      }
      await client.integralUsed.create({
        data: {
          desc,
          modelName,
          useValue: integral,
          userId,
        },
      });
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
    };
    let name = modelName;

    if (modelName.includes('gpt-3.5') && modelName !== 'gpt-3.5-turbo') {
      name = 'gpt-3.5-turbo';
    }
    const userLimits =
      (await client.userLimits.findMany({
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
                      modelName: name,
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
          modelName: name,
          startAt: {
            lte: new Date(),
          },
          userId: userId,
        },
      })) || [];
    if (userLimits.length) {
      const targetRes = userLimits.find((item) => {
        return item.times <= item.subscription.plan.limits[0].times;
      });
      if (!targetRes) {
        return await changeSubIntegral();
      }
    } else {
      return await changeSubIntegral();
    }
  }
  static async addIntegral(userId: number, desc: string, value: number) {
    await client.user.update({
      data: {
        integral: {
          increment: value,
        },
      },
      where: {
        userId,
      },
    });
    await client.integralUsed.create({
      data: {
        desc,
        modelName: undefined,
        useValue: value,
        userId,
      },
    });
  }
  static async getUsed(userId: number, pageNo: number, pageSize: number) {
    return {
      list: await client.integralUsed.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
          desc: true,
          id: true,
          modelName: true,
          useValue: true,
        },
        skip: (pageNo - 1) * pageSize,
        take: pageSize,
        where: {
          userId,
        },
      }),
      total: await client.integralUsed.count({ where: { userId } }),
    };
  }
  static async clearData() {
    const date30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await client.integralUsed.deleteMany({
      where: {
        createdAt: {
          lte: date30,
        },
      },
    });
    await client.chatHistory.deleteMany({
      where: {
        createdAt: {
          lte: date30,
        },
        user: {
          roleId: 1,
        },
      },
    });
    return true;
  }
  static async midTem() {
    // await client.midTemplate.update({
    //   where:{
    //     id:1
    //   },
    //   data:{
    //     content:JSON.stringify( [
    //       {
    //           "id": "79664564-b4a9-4fd9-b449-d8eed185243a",
    //           "parent_grid": 0,
    //           "parent_id": "b78017f5-c230-4e4e-a1e7-6bcb1557c002",
    //           "job_type": "v6_diffusion_anime",
    //           "event_type": "variation",
    //           "full_command": "Draw a beautiful 20-year-old Chinese girl dancing on the beach with an anime style of 4k --niji 6 --aspect 1:1",
    //           "enqueue_time": "2024-02-02 09:57:53.762944+00:00",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 4,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": false,
    //           "username": "99kai",
    //           "user_id": "ac0d5d03-d7a0-4c27-a272-065137dfca54",
    //           "service": "main",
    //           "parsed_version": "niji"
    //       },
    //       {
    //           "id": "8021acda-6da2-489c-85ed-418ede2a87a3",
    //           "parent_grid": 1,
    //           "parent_id": "eefead99-3139-4e06-9401-442a20848da7",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "A traditional Hanfu-clad woman with long hair standing in front of an exquisite classical building. The Hanfu is rich in details and adorned with elegant accessories. Background incorporates virtual reality interfaces and dynamic lines, adding a sci-fi touch. Artistic portrait style, high-definition detail --ar 9:16 --style raw --v 6.0 --s 750",
    //           "enqueue_time": "Sun, 28 Jan 2024 15:04:39 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "kaylee47_43255",
    //           "user_id": "0001e651-4a76-43ef-b873-41024ea1b30a",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "11b3e145-3f81-430d-a1aa-77736c470741",
    //           "parent_grid": 2,
    //           "parent_id": "45159bdc-0754-444c-be4f-68a88331f9cf",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "view from a drift car, Tokyo night city, drift car, neon lights, skyscrapers, hyper realism, drift smoke, --ar 9:16 --s 50 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 16:02:25 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "vrgo.rehab",
    //           "user_id": "5e125167-2834-4efa-ab6f-bebac0ce4760",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "8457dc75-65bc-45c0-8319-64422de627c1",
    //           "parent_grid": 1,
    //           "parent_id": "ce2b5889-0637-4526-9076-233cdbefaf03",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Chinese New Year, wearing Xiuhe dress Chinese goddess Hold the cat on the chair, red and golden,stunning body,romantic,noble temperament,4k @1751614291594711040@ --ar 9:20 --stylize 750 --v 6.0",
    //           "enqueue_time": "Mon, 29 Jan 2024 01:13:35 GMT",
    //           "width": 736,
    //           "height": 1632,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "buchrissyaugustus",
    //           "user_id": "7e52198d-abb8-43fc-991f-60c89cf73266",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "44ba3c45-8d53-4772-9826-a85f14f7993b",
    //           "parent_grid": 1,
    //           "parent_id": "257e8748-32a4-47b2-a89d-3db56847eeab",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/56UCrFDa_kA A few photos of apricot and water, with a light orange and transparent texture style, anime aesthetics, interesting complexity, berry punk, gorgeous colors, 32k uhd, karol bak --ar 3:4 --style raw --stylize 150 --v 6.0",
    //           "enqueue_time": "Sun, 28 Jan 2024 12:18:08 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "jiaxin999",
    //           "user_id": "14672e7d-63e8-4ce2-a503-3a480180728f",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "97704cbd-1503-43e3-a9a1-f86056456c47",
    //           "parent_grid": 3,
    //           "parent_id": "9c203bc0-3027-4651-9bc3-e5b33713a6cb",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/AiQ_UBGzx8o At night, on rainy days, the living room features an oversized skylight, Large-screen television,sofa, fireplace, and a cozy, ultra high definition glass that creates an atmospheric and ultra high definition feeling,High definition 16k, Real time shooting ultra-high definition --v 6.0 --ar 2:3 --style raw --s 750",
    //           "enqueue_time": "Wed, 31 Jan 2024 12:52:44 GMT",
    //           "width": 896,
    //           "height": 1344,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "qfs346.",
    //           "user_id": "ead47d17-b8e3-4b2b-a444-65e56d334b7e",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "4e5b3696-200d-4075-a97f-bdb13eb544de",
    //           "parent_grid": 3,
    //           "parent_id": "776c2a60-2330-489e-94ee-d65de848f7a2",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "A CG animation of an orange red Chinese dragon swimming on the lake surface. The dragon is very large, long, and has golden dragon horns. A Chinese ancient woman wearing a red Hanfu stands in the center of the lake with a sword in her hand. The dragon swims around the woman, forming a circle of ripples on the water surface. The drone perspective, wide-angle lens, blue-green lake water, Chinese martial arts world, Chinese mythological scenes, bright colors, sunshine, and transparent lake water, Megaphobia, --ar 9:16 --style raw --v 6.0 --s 750",
    //           "enqueue_time": "Sat, 27 Jan 2024 07:06:06 GMT",
    //           "width": 1632,
    //           "height": 2912,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "newbetter.",
    //           "user_id": "86460c2e-7c1c-45c3-826f-842adcc6d03b",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "c9e00870-c8d6-4bfe-a293-08744f5faf19",
    //           "parent_grid": 3,
    //           "parent_id": "554072a7-6fb9-4077-b154-7364446bc9c3",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "a female in crystals posing with glittery dragonfly wings in front of colorful flowers, in the style of tim walker, xu beihong, iridescent color, shiny glitter, fairycore, angela barrett, made of insects, pictorial --ar 4:5 --style raw --v 6.0",
    //           "enqueue_time": "Sun, 28 Jan 2024 06:39:48 GMT",
    //           "width": 960,
    //           "height": 1200,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "projekt_a.eye",
    //           "user_id": "cf2de578-bd1c-437a-ba84-63443eacc867",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "ab14b5ed-101f-4af4-8117-efd7d06e13c2",
    //           "parent_grid": 1,
    //           "parent_id": "1bce527c-6f6e-4941-bcd9-89ec26ebb02c",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/Rm83tBviJeo Hair style-themed visual blockbuster for two people, Korean girl with medium hair, stylish outfit with light hair, Korean girl looking frontally at the camera, without makeup to highlight the texture and pores of facial skin, full color picture, close-up - white solid background --ar 2:3 --v 6.0 --s 750 --style raw",
    //           "enqueue_time": "Sat, 27 Jan 2024 19:37:33 GMT",
    //           "width": 896,
    //           "height": 1344,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "jametoland5947",
    //           "user_id": "5d1ab38e-374b-4e3f-a78e-60c9207a40f8",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "62c391e5-3355-41be-8bb9-547010b20635",
    //           "parent_grid": 0,
    //           "parent_id": "4ec0b083-179b-4195-bd64-5dc7935ef627",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "90s retro Jean Jullien water color，whimsical Chinese scenery illustration，visible canvas weave texture，minimalist stylized cartoonish illustration，hand painted, brushstrokes, colorful washes, simple white background inspired book cover, lisa congdon style, surrealism，wide brush stroke,8k --ar 3:4 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 04:03:37 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "wsgc123456",
    //           "user_id": "ead0cc6f-f376-4841-9fc8-bdf4d0c07bb4",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "34164b7a-9ef4-47c2-803b-09be79328efc",
    //           "parent_grid": 0,
    //           "parent_id": "5c88cfb2-5de3-475c-9f32-fa2364862017",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/U28Z9hpeFEo make an indonesian real life Usagi Tsukino wearing sailor moon uniform fall a sleep in the meadow of the Indonesian hills, 14 years old, hyperrealistic, late afternoon, overcast lighting, shot on kodak portra 200, film grain, nostalgic mood --ar 9:16 --v 6.0",
    //           "enqueue_time": "Sun, 28 Jan 2024 04:50:07 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "beranalogi",
    //           "user_id": "0fe3168f-1460-411e-b786-d29397cde791",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "2a0fd5a5-53ce-4c1c-bf2a-d9df8aa297ce",
    //           "parent_grid": 1,
    //           "parent_id": "d8722b69-6144-4e11-bd25-22c96994801d",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "waves and horizon,Sandy beach,light reflecting,bright style,32k uhd,white-blue,is captured with astonishing clarity,painting,dramatic,light,white,blue-sky,accent-color,expression,shade,anime,reflections --ar 10:19 --s 950 --v 6.0",
    //           "enqueue_time": "Sun, 28 Jan 2024 01:23:50 GMT",
    //           "width": 800,
    //           "height": 1520,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "oceanstar9326",
    //           "user_id": "de4bca2f-03a6-4b22-866b-ec21dced30f0",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "c42bc884-ce02-43a8-86e2-62c6b22052ef",
    //           "parent_grid": 1,
    //           "parent_id": "cefa2c63-95cc-4108-83d5-06c48f6d578f",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "10 years old child’s surrealist painting of late-20th and early-21st century Japanese city life , Vanessa beecroft style , a mini size office lady dressed in white one piece dress curled up and relaxing her full body totally inside a huge bento on the rice by the food presenting a surreal scene,full body, anxieties, poker face, eyes open, detailed body, detailed feet --ar 2:3 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 14:13:05 GMT",
    //           "width": 896,
    //           "height": 1344,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "ernest9416",
    //           "user_id": "ebd4f0c5-5175-4217-9357-4d86e513e813",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "ecc04bef-3983-4559-be79-a96b08779f67",
    //           "parent_grid": 3,
    //           "parent_id": "1247729d-3715-429e-bb34-77ab465dbd08",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "in broad daylight is a futuristic metal face and gold detail pyramid with in its center a supergate blue energy going to the top of the pyramid, a giant planet is in the background, UnrealUngine5 --ar 9:16 --s 750 --v 6.0",
    //           "enqueue_time": "Sat, 27 Jan 2024 19:57:41 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "sony1978",
    //           "user_id": "a52aa512-af96-4de5-8da0-4af702e371c4",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "fabc7a4f-fae3-4739-83c7-14cecae620be",
    //           "parent_grid": 3,
    //           "parent_id": "993a0a09-67e5-4940-8e31-7a6199225d51",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "A couple hugging each other, surrounded by trees and buildings, paper cut style, pink festive atmosphere --ar 3:5 --s 250 --v 6.0",
    //           "enqueue_time": "Wed, 31 Jan 2024 06:37:43 GMT",
    //           "width": 848,
    //           "height": 1424,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "emazhizhang",
    //           "user_id": "70a095e6-63e8-4740-af03-43d56ddfd6e5",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "7db83134-bf74-4fe5-82f7-3c94a455bcff",
    //           "parent_grid": 1,
    //           "parent_id": "febf3b15-2eb6-4f51-b536-e596741cc1a1",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "sticker of a cute female pirate, digital illustration, disney, rule 63, full body, perfect anatomy, perfect face, abstract beauty, beautiful, centered, looking at the camera, approaching perfection, dynamic, moonlight, highly detailed, watercolor painting, artstation, concept art, smooth, sharp focus, illustration, art by Carne Griffiths and Wadim Kashin --ar 2:3 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 12:26:04 GMT",
    //           "width": 896,
    //           "height": 1344,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "zhenav",
    //           "user_id": "12f24465-c91d-43ea-9ab3-4eac045b74c9",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "cfc6944f-ad48-4d3b-aeed-54faafc6faf7",
    //           "parent_grid": 2,
    //           "parent_id": "e7d6e439-2a15-44f7-b1d3-0e855a8de4f5",
    //           "job_type": "v6_upscaler_2x_creative",
    //           "event_type": "diffusion_upsample_v6_2x_creative",
    //           "full_command": "A cute Chinese girl, a cute girl sticker,UI design, icon interface, multiple poss and emojis,rich expressions and movements,nine palace grid layout--niji5 --v 6.0",
    //           "enqueue_time": "Wed, 31 Jan 2024 06:58:29 GMT",
    //           "width": 2048,
    //           "height": 2048,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "yibingzi",
    //           "user_id": "fb553892-4134-4dd3-a547-cb1d8cfb3360",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "ef5e1fe8-bed7-4476-a7ac-4db7fb17566d",
    //           "parent_grid": 1,
    //           "parent_id": "62ef25e7-2eb2-427a-8750-aa561d463867",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Create an image of a cozy, whimsical interior of a house in Pixar and Disney animation style. The scene shows a small, anthropomorphic, chubby and cute cat named Kaka with bright, sparkling eyes, standing upright and wearing clothes, exploring around playfully. The environment should be detailed, with household objects scattered, showcasing a playful and warm atmosphere. Render in high quality using C4D OC renderer with cinematic lighting --ar 3:4 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 15:13:39 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "beengregory",
    //           "user_id": "151b10c5-5cd5-42af-885b-0a16d9e25af6",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "3ba8170e-bb6c-4946-9a58-f06e79d45749",
    //           "parent_grid": 3,
    //           "parent_id": "3be6aabc-b80b-4abe-bb27-e8dd65e001b0",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "a beautiful woman is showing her face while holding a red fan, in the style offan ho, modern jewelry, janice sung, close-up, miwa komatsu, gold leaf, 8kresolution --ar 9:16 --v 6.0",
    //           "enqueue_time": "Tue, 30 Jan 2024 04:08:01 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "mxl1998925",
    //           "user_id": "bc3278c8-2f5f-4e36-aeb7-2e00c55b8807",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "7a1a0b18-d24c-474f-b0f2-2d4b64b7952f",
    //           "parent_grid": 0,
    //           "parent_id": "7e7e326a-f0d7-4dfb-92dc-bc01a7932a06",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Mech girl, pretty girl, robot, cool Sa, full body, --ar 9:16 --s 750 --v 6.0",
    //           "enqueue_time": "Sun, 28 Jan 2024 13:12:43 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "ahujaartmanspringhall",
    //           "user_id": "96fd5ad4-4e87-4b65-903e-fd1a91323033",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "64470d2e-b99f-44c5-8956-d0404470ff73",
    //           "parent_grid": 2,
    //           "parent_id": "cc37e06d-72e4-4c41-ad59-666947620f45",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "chinese old street shot by chong wei, in the style of contrasting shadows, zeiss planar t* 80mm f/2.8, leica cl, silhouette lighting, art deco sensibilities, minolta hi-matic 7sii, villagecore --ar 99:128",
    //           "enqueue_time": "Sun, 06 Aug 2023 15:25:24 GMT",
    //           "width": 960,
    //           "height": 1248,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "船歌zyc",
    //           "user_id": "286a496f-3ee1-4ff7-bd56-abb950a9df6c",
    //           "service": "main"
    //       },
    //       {
    //           "id": "21318b55-8496-46fc-8f3f-a5b0f9c17d01",
    //           "parent_grid": 1,
    //           "parent_id": "9fb36f28-1aaf-420e-9ab7-285a2c34eecc",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "China's Chaozhou Chinese people enthusiastically participate in public welfare activities, sweeping panorama, sketch, 32K, hyper quality",
    //           "enqueue_time": "Fri, 18 Aug 2023 04:42:41 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "Barn",
    //           "user_id": "6fa16f53-3f23-4a3b-a518-77c4095ff4b3",
    //           "service": "main"
    //       },
    //       {
    //           "id": "2c815215-1681-4b32-b9e0-51a1b4706856",
    //           "parent_grid": 1,
    //           "parent_id": "d7ec63ce-5129-42d0-acd6-7a6833a03a7a",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "甄嬛chinese beautiful girl of qing style, queen of qing dynasty, illustrated in the style of hasui kawase, with red orange and teal color palette",
    //           "enqueue_time": "Tue, 08 Aug 2023 04:21:15 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "rieslingd",
    //           "user_id": "49a23fdf-f65a-4d2f-a414-2d1196c2d916",
    //           "service": "main"
    //       },
    //       {
    //           "id": "41b2fe1c-7688-49fa-99c9-f6676f107a57",
    //           "parent_grid": 3,
    //           "parent_id": "1ead7248-9648-4f58-bd89-6816233faa65",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "Beautiful watercolor style painting with an elegant Chinese woman wearing a cheongsam, Backlighting, tattoo art, 16k, hyper quality",
    //           "enqueue_time": "Sun, 27 Aug 2023 09:15:53 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "arajassho",
    //           "user_id": "463172e5-f810-41ed-93ef-85ab9f3c55a7",
    //           "service": "main"
    //       },
    //       {
    //           "id": "4ea3c844-e565-4a64-8f66-9a2b484f8981",
    //           "parent_grid": 3,
    //           "parent_id": "0ebc079b-fe03-4b44-998c-500f4328a651",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "China's jade Chinese girl smiles with an open mind, but frowns slightly between her eyebrows, beauty light, Art Nouveau, 16k, HDR",
    //           "enqueue_time": "Fri, 18 Aug 2023 10:15:28 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "HelenBrown",
    //           "user_id": "2dec966a-08ed-474f-a3df-9464d25f6983",
    //           "service": "main"
    //       },
    //       {
    //           "id": "15a79b7d-8010-4056-b57d-70c878944124",
    //           "parent_grid": 0,
    //           "parent_id": "110e5650-9a9e-4005-a944-f205fb01e405",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "An Asian girl, eye-catching accessories, simple wear, close up, --s 50 --v 5.2",
    //           "enqueue_time": "Mon, 21 Aug 2023 09:13:53 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "vttt_7262",
    //           "user_id": "50822308-1084-4618-b3ec-d7d00f98246e",
    //           "service": "main",
    //           "parsed_version": "5.2"
    //       },
    //       {
    //           "id": "e9c7efa4-1189-4326-aa3a-006e745927db",
    //           "parent_grid": 0,
    //           "parent_id": "1cecdbcc-720f-4e9d-9465-88264da19287",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "Black Qipao Girl",
    //           "enqueue_time": "Mon, 14 Aug 2023 08:30:02 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "LauraHernandez",
    //           "user_id": "489e1e28-dbb4-4dcb-a862-5f5154c53337",
    //           "service": "main"
    //       },
    //       {
    //           "id": "e3bb98b1-0e3d-4b0d-94c3-6fb3c5601e38",
    //           "parent_grid": 2,
    //           "parent_id": "c06f2be6-92e7-4002-819f-6c428207dad0",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "In a watercolor ink painting style, we see a person from the Miao ethnic group in China, dressed in traditional attire. The artwork showcases the vibrant and intricate clothing that is characteristic of the Miao culture. The person is dressed in a colorful ensemble, with richly embroidered fabrics adorned with intricate patterns and motifs. The clothing consists of a pleated skirt or trousers, paired with a beautifully embroidered jacket or blouse. The colors range from bold and vibrant hues, such as red, green, and blue, to more subtle shades like pastel pinks and purples. The person's accessories play an important role in completing the traditional Miao attire. They may wear ornate silver headdresses, necklaces, bracelets, and earrings, showcasing the exquisite craftsmanship of the Miao people. These accessories are often adorned with intricate filigree work, colorful gemstones, and delicate chains. The background of the artwork can reflect the natural landscapes that are significant to the Miao culture, such as lush mountains, flowing rivers, or terraced fields. The brushstrokes and color palette capture the beauty and harmony of the natural environment. This artwork captures the captivating beauty and cultural richness of the Miao ethnic group in China, showcasing their distinctive traditional clothing and accessories. The watercolor ink painting style adds a touch of elegance and fluidity to the composition, allowing viewers to appreciate the intricate details and vibrant colors of the Miao attire.",
    //           "enqueue_time": "Sun, 06 Aug 2023 15:53:49 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "bowenalexa",
    //           "user_id": "fa04268e-0e77-46ed-8910-211f50186c6a",
    //           "service": "main"
    //       },
    //       {
    //           "id": "6d947e57-77c8-478b-9952-cd11486bc03b",
    //           "parent_grid": 0,
    //           "parent_id": "b5b93189-c483-4e2a-b471-869be6a95050",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "A pretty Chinese girl, dressed in Dunhuang style",
    //           "enqueue_time": "Tue, 01 Aug 2023 14:35:16 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "vojtiktedeevn",
    //           "user_id": "0aede476-4d2b-427f-a1d5-1ae5476e7924",
    //           "service": "main"
    //       },
    //       {
    //           "id": "451f0a19-292e-4415-93be-7055fcb64fcf",
    //           "parent_grid": 2,
    //           "parent_id": "19e7da44-1014-4941-b37a-cbe6992c69c4",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Prompt Cloud Cottage, Cotton Candy Illustration Texture, Cloud Plants, Morning Mist, Stars, Colorful Glow Illumination, Phnom Penh, Japanese Marvel Illustration Style, Macaron Tone, Delayed Shift Axis, Fairy Tale Style, Cinematic, High Quality, Edge Illumination. --v 6.0 --ar 3:4 --c 2 --s 143",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:03:18 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "cthompson1646",
    //           "user_id": "a5d4d998-8720-4291-b373-f7c0189efb25",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "d8cc4b69-1ded-4aaf-8b0c-dba17a1c0d30",
    //           "parent_grid": 0,
    //           "parent_id": "d0177e1b-53de-4862-938b-0183d1155a01",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "8K, masterpiece, Concept art painting, flowers, blueblack background, ornate background, twisted branches of leaves and flowers, by Miho Hirano, takato yamamoto, centipedes extremely moody lighting --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 15:06:16 GMT",
    //           "width": 2048,
    //           "height": 2048,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "irisoun",
    //           "user_id": "10625909-bbef-4084-855c-aeef9b900dda",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "7acfa462-eab4-464c-b337-e38092c62eca",
    //           "parent_grid": 2,
    //           "parent_id": "1681ed10-2019-48c0-8a2a-d755d1cbea6e",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/F2acdg7jM2s https://s.mj.run/hejaA-lWmVg Pure profile, white cat happily sticking out tongue to lick food, white background --s 750 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 19:09:33 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "ceepaprika",
    //           "user_id": "e6ba1419-3fda-49c2-8057-66ff506db07e",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "40708c56-ab57-42ee-880b-60f49e389ae2",
    //           "parent_grid": 2,
    //           "parent_id": "f6ae6af0-32c6-4c34-b6d8-3473b806eceb",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "anime background with sky and clouds, in the style of gentle lyricism, makoto shinkai, animated film pioneer, mote kei, realistic depiction of light, full body, realistic depictions of everyday life, movie poster, rough-edged 2d animation, i can't believe how beautiful this is, dark cyan and sky-blue --ar 51:64 --s 250 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 17:44:57 GMT",
    //           "width": 1920,
    //           "height": 2400,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "manjai111",
    //           "user_id": "1719fc1f-6f6b-44e0-ba93-33eafb5235d2",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "490d211d-cbc2-4cd0-bb68-12896039a3f1",
    //           "parent_grid": 2,
    //           "parent_id": "008e12cd-4a23-4add-8062-90a779e08d94",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "a dark atmospheric dinner room with 6 chairs, golden lights https://s.mj.run/HQDFSZRU5CA https://s.mj.run/ByOgzIbz8Bs --style raw --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:35:02 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "hercules1476",
    //           "user_id": "216af669-aabd-41ca-84fe-b001b7be4e4f",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "c10c5c7b-7c05-4b28-b388-a0984b494719",
    //           "parent_grid": 0,
    //           "parent_id": "daf2c293-13b9-40d8-8a98-a3946edd4e07",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Convey the cool and crisp atmosphere of the summer, Francesca Buchko composition, --ar 7:12 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 17:29:16 GMT",
    //           "width": 832,
    //           "height": 1424,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "bjildirim",
    //           "user_id": "a5fb51db-acf9-4f6e-8358-d6d2dd55d4a5",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "41241255-3c54-4217-919b-705aac5e1414",
    //           "parent_grid": 3,
    //           "parent_id": "334aa9ae-0996-4f07-8deb-d199e3e498cb",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Dragon Year themed mobile wallpaper, Gundam robot style with Chinese elements. --ar 9:16 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 17:22:43 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "dachunhua",
    //           "user_id": "e3aecae2-5799-4943-ae1d-056381682d98",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "a724eb18-01a1-4f54-8713-7ec1cd333b06",
    //           "parent_grid": 0,
    //           "parent_id": "b5590a98-9c68-4e46-b2dd-2048b1751474",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "natural wood log tree trunk kitchen island table --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 13:56:55 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "shahzaib_shabby",
    //           "user_id": "4c948651-fde9-4467-940c-85728db767ef",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "5375c5ac-97c1-4f98-bcc9-f8b4829e6c11",
    //           "parent_grid": 0,
    //           "parent_id": "3e2830df-e0df-4c13-8e6a-fc2365f55478",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "fat cute fluffy WHITE cat with a belly, funny facial expressions, Exaggerated action，standing on 2 hind legs,Two forelimbs in front， 3D character, white background, a little hairy, elongated shape, cartoon style, minimalism --chaos 12 --ar 3:4 --style raw --stylize 200 --iw 0.3 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 13:16:08 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "airwalk4444",
    //           "user_id": "fcd2357a-b90b-4a2b-972c-e1a17a6c8e5f",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "b09ed9f2-dc78-4ae9-a3de-b84b9ef56a86",
    //           "parent_grid": 2,
    //           "parent_id": "eecf4644-55d8-47be-81b7-583cb2c2d5cc",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "fairy looking to a light giving flower in her hand --sref https://s.mj.run/3CRJiPk7VsM --ar 2:3 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 17:47:28 GMT",
    //           "width": 1792,
    //           "height": 2688,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "rob_olivier",
    //           "user_id": "9ffce0c2-100f-4093-9e2f-11dc46490dcb",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "dacece12-02e4-47f7-823a-5ce29b04cba3",
    //           "parent_grid": 3,
    //           "parent_id": "5fc08d32-eb28-439d-bb01-41f2a18c0d56",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/dgxulCHjT40 https://s.mj.run/oMvxpiM8plY ,::1 , An ethereal building carved into the cliffs of The Faroe Islands, bold, geometric shapes. sculptural angular base details, by caravansa , Antıent Roman mosaic floors , postmodernist appropriation, orientalist influences, american studio craft movement, , The structure should feature large, triangular facades and curvelinear parts with warm light coming from inside , shimmering with translucent beauty echoing the style of Alvaro Siza. surfaces should be finished in a material that captures the glow of the lights within, creating a warm, inviting beacon in the environment , Etheral, Pensive, Volumetric, reflection, in the style of Contrasting geometries, in the style of minimalist surrealism, vray tracing, geometric minimalistic, in the style of conceptual installation, in the style of organic material, in the style of gauzy atmospheric landscapes, warmcore, maximalist, atmospheric lightning, algeapunk , Architecture photography of Modern concrete Museum of fine arts in mountains of Amalfi Ravello. Pointy sculptural angular base, flat roof, Arthur Casas and John Pawson style, Bamileke Modernist , layered, sculptural facade, bold, geometric shapes. T The structure should feature large, triangular facades and curvelinear parts with warm light coming from inside , shimmering with translucent beauty echoing, cantilevered ruffled spaces echo Ishigami’s artistry, surfaces should be finished in a material that captures the glow of the lights within, The aesthetic architecture. Beautiful sunlight. Futuristic design with chilling people in stylish fashion clothes. Japanese minimalist aesthetic landscape. Japandi style top design materials. Sand materials, stone, glass, Soft floor sofas. Architecture minimalist HQ photo, Photorealistic, Nikon D750, 4k --chaos 20 --ar 9:16 --s 250 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:06:42 GMT",
    //           "width": 816,
    //           "height": 1456,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "_eb.rar",
    //           "user_id": "5b9b232b-a913-404d-8c9d-2e67c8567631",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "cd1075aa-45fb-4c5a-8eaf-b5e97ba4aa4a",
    //           "parent_grid": 2,
    //           "parent_id": "de736935-f117-4ab8-896e-118243cc1891",
    //           "job_type": "v5_virtual_upsample",
    //           "event_type": "diffusion_upsample_v5_virtual",
    //           "full_command": "beige Scandinavian style artwork --ar 3:4",
    //           "enqueue_time": "Fri, 02 Feb 2024 15:06:31 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "geekfactsdaily",
    //           "user_id": "8bee3779-bf30-48ce-80d7-cf5df902143a",
    //           "service": "main",
    //           "parsed_version": "5.2"
    //       },
    //       {
    //           "id": "8965205a-1a06-4bda-b49a-e0554272070c",
    //           "parent_grid": 3,
    //           "parent_id": "b6d7ac41-eeda-4752-a78e-c825183ac58f",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "An animated service interface for \"Waikiki Money Recipe\", showing real-time alerts flying towards the user in a dynamic, engaging manner. Bright, welcoming colors, user-friendly icons. Created Using: user interface design, animation style, clear typography, intuitive layout, interactive elements, 1:1 ratio --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 19:54:31 GMT",
    //           "width": 1024,
    //           "height": 1024,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "5tontruck",
    //           "user_id": "8255b644-c56b-4f6a-8d9b-77fe295991b0",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "3aa552d3-8eec-4f2c-8a1c-91860a072263",
    //           "parent_grid": 3,
    //           "parent_id": "c4cd16a1-aa9d-4f9f-a106-f6edebd18d93",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Space Exploration - Astronauts on Mars: Scene: Futuristic Martian landscape with astronauts in space suits. Technique: Sci-fi shots portraying the exploration of Mars. Camera and Lens: DJI Inspire 2 drone for aerial views and Canon EOS-1D X Mark III, 24-70mm f/2.8 lens for astronaut details. Description: Astronauts conducting experiments, exploring Mars, and living in a simulated Martian habitat. Image Ratio: --ar 16:9 --v 6.0 --style raw --s 250",
    //           "enqueue_time": "Fri, 02 Feb 2024 20:10:05 GMT",
    //           "width": 1456,
    //           "height": 816,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "st_ks",
    //           "user_id": "5423543a-c484-4628-a52f-79b4f85585be",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "1b74cc23-74b7-4dc4-8119-be640bd99723",
    //           "parent_grid": 1,
    //           "parent_id": "a551685f-bdb7-4300-a604-fffce0c6d490",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "a musician with suitcases at a train station with locomotive by andrew wyeth --weird 2400 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:15:37 GMT",
    //           "width": 2048,
    //           "height": 2048,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "Armadillo",
    //           "user_id": "0c58b33b-4c83-40e9-bb56-6e86e5aedb33",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "6d10c97e-f63d-4f79-9c3e-353336468a77",
    //           "parent_grid": 1,
    //           "parent_id": "93f8c0ce-fcc0-44e4-ba5f-c97f6665463e",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "Real photo style. A cute anthropomorphic silver-white kitten with round pupils, wearing a bright yellow turtleneck sweater, a white jacket and jeans outside, sitting on an airplane seat. The seat is near the window, with a passenger sitting next to it. The kitten looks out the window. The plane was already flying in the sky, and there were clouds and sunlight outside the window. There are airplane meals in front of the airplane seats. The colors are soft and warm, focusing on light and shadow. No distortion or distortion. --ar 3:4 --v 6.0 --s 750",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:24:05 GMT",
    //           "width": 928,
    //           "height": 1232,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "qgqgqg1111",
    //           "user_id": "9ae3ed94-2920-4c8b-8a7b-98684529bd85",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "6f8e8ef4-9151-49a0-b982-fc732c3288be",
    //           "parent_grid": 3,
    //           "parent_id": "e471071c-fef9-4c25-ad45-fc4d31fe458a",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "blue sofa Blake by Roberto Cavalli in dark modern open space living room. High ceiling. Luxury colours. Macrame ceiling. Crystal stairs --c 15 --ar 9:16 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 16:08:32 GMT",
    //           "width": 1632,
    //           "height": 2912,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "complete2",
    //           "user_id": "5e6bcb21-9b4f-419e-84c8-4a497f3b6151",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "2dfa17a7-a16e-4301-9fad-a862a43b759a",
    //           "parent_grid": 1,
    //           "parent_id": "f4af41d6-52f8-4e74-8f22-5251f49e0756",
    //           "job_type": "v6_upscaler_2x_subtle",
    //           "event_type": "diffusion_upsample_v6_2x_subtle",
    //           "full_command": "8K Ultra HD, highly detailed,behold a captivating and ethereal spirit of a 20-year-old beautiful cute Hermione Granger full body, gracefully adorned with the essence of blooming flowers, Her long flowing hair, like silken threads of sunlight, cascades gracefully down her back, interwoven with delicate floral accents that mirror the surrounding blooms. Her eyes, the color of the deepest forest emeralds, sparkle with a hint of magic and mystery, Her attire is a delicate masterpiece, crafted from petals and leaves, each piece carefully chosen to complement her ethereal beauty, In her hand, she holds a delicate bouquet of the most exquisite flowers, their vibrant colors mirroring her own radiant aura, by yukisakura, Highest quality, harry potter --ar 09:16 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 18:10:38 GMT",
    //           "width": 1632,
    //           "height": 2912,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "umidgupta",
    //           "user_id": "cf94a075-d77d-4398-8884-9c48ec1353b9",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       },
    //       {
    //           "id": "cba47f5d-ff5b-4ac7-ab02-cf5d2f0773ff",
    //           "parent_grid": 3,
    //           "parent_id": "67ab0655-87f1-4930-b730-8c1403528cdb",
    //           "job_type": "v6_virtual_upsample",
    //           "event_type": "diffusion_upsample_v6_virtual",
    //           "full_command": "https://s.mj.run/xzzQcyiVGh4 A bottle of eau de toilette lies on a table with a small brass ornament in the style of female figure, bugcore, light gray and white, love and romance, luxury, high key color palette, iconic --ar 39:64 --v 6.0",
    //           "enqueue_time": "Fri, 02 Feb 2024 02:38:15 GMT",
    //           "width": 848,
    //           "height": 1392,
    //           "batch_size": 1,
    //           "published": true,
    //           "shown": true,
    //           "liked_by_user": true,
    //           "username": "facai88880_0",
    //           "user_id": "270597f0-2750-4101-854e-bcce6e4d16db",
    //           "service": "main",
    //           "parsed_version": "6.0"
    //       }
    //   ])
    //   }
    // })
    return await client.midTemplate.findUnique({
      where: {
        id: 1,
      },
    });
  }
}
