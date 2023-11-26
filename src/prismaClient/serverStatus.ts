export enum serverStatus {
  success,

  failed,
  unknownError,

  /* Authentication */
  authFailed,
  invalidCode,
  wrongPassword,
  invalidToken,
  invalidTicket,
  unScannedTicket,

  /* Rate Limit*/
  tooFast,
  tooMany,
  notEnoughChances,

  /* Content Safe */
  contentBlock,
  contentNotSafe,

  /* General */
  notExist,
  userNotExist,

  alreadyExisted,
  userAlreadyExisted,
  quotaEmpty,
  redeemUsed,
  expireCode,
  fullToken,
}
export class ServerError extends Error {
  readonly errorCode: serverStatus;

  constructor(code: number, message: string) {
    /* Call the constructor method of the parent class and pass the message parameter */
    super(message);
    /* Ensure that this points to the correct */
    Object.setPrototypeOf(this, ServerError.prototype);
    /* Save the class name in the stack trace */
    this.name = this.constructor.name;
    /* Add custom properties*/
    this.errorCode = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
// 将原来的命名空间重构为模块
// 修改前
// namespace DALType {
//   // 类型和接口定义
// }

// 修改后
export type Price = {
  amount: number;
  duration: number;
  id: number;
  name: string;
};

export type Model = {
  available: boolean;
  limits?: Limit[];
  modelId: number;
  modelName: string;
  unitPrice: number;
};

export type Limit = {
  duration: number;
  modelName: string;
  times: number;
};

export interface UserLogin {
  signedToken: {
    expiredAt: number;
    token: string;
  };
}

export interface UserRegister extends UserLogin {
  invitation?: {
    inviter?: string;
    status: serverStatus;
  };
}

export interface Plan {
  features: string[];
  limits: Limit[];
  name: string;
  planId: number;
  prices: Price[];
}

export interface newPlan {
  limits: Limit[];
  name: string;
  prices: Price[];
}
