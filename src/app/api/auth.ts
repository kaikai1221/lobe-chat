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

  console.log(token, '----');
  let minIntegral = 10;
  if (model.includes('gpt-4')) minIntegral = 600;
  if (data.body.integral < token / 100 + minIntegral)
    return { auth: false, error: ChatErrorType.InsufficientBalance };
  await fetch(url + '/api/user/subIntegral?integral=' + roundUp(token / 100), {
    cache: 'no-cache',
    headers: {
      [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
    },
    method: 'GET',
  });
  return { auth: true };
};
