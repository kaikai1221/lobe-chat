import client, { type InvitationCode, Prisma, type RegisterCode, RegisterType } from '../client';
import { generateRandomSixDigitNumber, generateRandomString } from '../utils';

/**
 * 一些码的管理，包括注册码、邀请码
 */
// @dalErrorCatcher
export const CodeDAL = {
  /**
   * Get verification code
   * @param register Verification Information
   */
  async getCode(register: string): Promise<RegisterCode | null> {
    return client.registerCode.findUnique({
      where: {
        register: register,
      },
    });
  },

  /**
   * 获取用户邀请码
   * @param userId 用户主键
   * @param createIfNull 当用户无邀请码时是否自动生成并返回
   */
  async getInvitationCode(userId: number, createIfNull: boolean = true): Promise<InvitationCode[]> {
    const invitationCodes = await client.invitationCode.findMany({
      where: {
        ownerId: userId,
      },
    });
    if (invitationCodes.length === 0 && createIfNull) {
      return [
        await client.invitationCode.create({
          data: {
            code: generateRandomString(6),
            ownerId: userId,
          },
          include: {},
        }),
      ];
    }
    return invitationCodes;
  },

  /**
   * 生成注册的有
   * @param type 注册类型
   * @param register 注册信息 手机号或邮箱地址
   * @return 返回过期的时间戳
   */
  async newCode({
    type,
    register,
  }: {
    register: string;
    type: 'email' | 'phone';
  }): Promise<RegisterCode> {
    const expiredTimeStamp = Date.now() + 600 * 1000 * 5;
    const codeInput: Prisma.RegisterCodeCreateInput = {
      code: generateRandomSixDigitNumber(),
      expiredAt: new Date(expiredTimeStamp),
      register: register,
      type: type === 'phone' ? RegisterType.Phone : RegisterType.Email, // 默认五分钟
    };
    return await client.registerCode.upsert({
      create: codeInput,
      update: {
        code: generateRandomSixDigitNumber(),
        expiredAt: new Date(expiredTimeStamp),
      },
      where: {
        register: register,
      },
    });
  },

  /**
   * 检查验证码是否一致
   * @param register 注册信息
   * @param codeProvided 需要被验证的验证码
   * @return 验证码是否一致
   */
  async validationCode({
    register,
    codeProvided,
  }: {
    codeProvided: number;
    register: string;
  }): Promise<boolean> {
    return this.getCode(register).then((code) => {
      return code ? code?.code === codeProvided : false;
    });
  },
};
