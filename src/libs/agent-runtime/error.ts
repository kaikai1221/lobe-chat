/* eslint-disable sort-keys-fix/sort-keys-fix */
// ******* Runtime Biz Error ******* //
export const AgentRuntimeErrorType = {
  AgentRuntimeError: 'AgentRuntimeError', // Agent Runtime 模块运行时错误
  LocationNotSupportError: 'LocationNotSupportError',
  InsufficientBalance: 'InsufficientBalance', // 余额不足
  OpenAIBizError: 'OpenAIBizError',

  NoOpenAIAPIKey: 'NoOpenAIAPIKey',

  InvalidAzureAPIKey: 'InvalidAzureAPIKey',
  AzureBizError: 'AzureBizError',

  InvalidZhipuAPIKey: 'InvalidZhipuAPIKey',
  ZhipuBizError: 'ZhipuBizError',

  InvalidGoogleAPIKey: 'InvalidGoogleAPIKey',
  GoogleBizError: 'GoogleBizError',

  InvalidBedrockCredentials: 'InvalidBedrockCredentials',
  BedrockBizError: 'BedrockBizError',

  InvalidMoonshotAPIKey: 'InvalidMoonshotAPIKey',
  MoonshotBizError: 'MoonshotBizError',

  InvalidOllamaArgs: 'InvalidOllamaArgs',
  OllamaBizError: 'OllamaBizError',
} as const;

export type ILobeAgentRuntimeErrorType =
  (typeof AgentRuntimeErrorType)[keyof typeof AgentRuntimeErrorType];
