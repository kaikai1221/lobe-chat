import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { serverStatus } from '@/prismaClient/serverStatus';
import { ChatErrorType } from '@/types/fetch';

interface AuthConfig {
  accessCode?: string | null;
  apiKey?: string | null;
  model: string;
  token: number;
  url: string;
}
export const checkAuth = async ({ accessCode, token, url, model }: AuthConfig) => {
  const res = await fetch(url + '/api/user/verify', {
    cache: 'no-cache',
    headers: {
      [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
    },
    method: 'GET',
  });
  const data = await res.json();
  if (typeof data.body.code === 'number' && data.body.code !== serverStatus.success) {
    return { auth: false, error: ChatErrorType.InvalidAccessCode };
  }

  console.log(token, '----', model);
  let minIntegral = 10;
  if (model.includes('gpt-4')) minIntegral = 600;
  if (data.body.integral < token / 100 + minIntegral)
    return { auth: false, error: ChatErrorType.InsufficientBalance };
  await fetch(`${url}/api/user/subIntegral?token=${token}&modelName=${model}&desc=输入&type=in`, {
    cache: 'no-cache',
    headers: {
      [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
    },
    method: 'GET',
  });
  return { auth: true };
};
