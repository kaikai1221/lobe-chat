import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { serverStatus } from '@/prismaClient/serverStatus';
import { ChatErrorType } from '@/types/fetch';
import { encodeAsync } from '@/utils/tokenizer';

interface AuthConfig {
  accessCode?: string | null;
  allContents: string;
  apiKey?: string | null;
  model: string;
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
export const checkAuth = async ({ accessCode, allContents, url, model }: AuthConfig) => {
  const res = await fetch(url + '/api/user/verify', {
    cache: 'no-cache',
    headers: {
      [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
    },
    method: 'GET',
  });
  const data = await res.json();
  if (typeof data.code === 'number' && data.code !== serverStatus.success) {
    return { auth: false, error: ChatErrorType.InvalidAccessCode };
  }
  let token = 0;
  await encodeAsync(allContents)
    .then((e) => (token = e))
    .catch(() => {
      // 兜底采用字符数
      token = allContents.length;
    });
  console.log(token, '----');
  let minIntegral = 10;
  if (model.includes('gpt-4')) minIntegral = 600;
  if (data.body.integral < token / 100 + minIntegral)
    return { auth: false, error: ChatErrorType.InsufficientBalance };
  const integralRes = await fetch(url + '/api/user/subIntegral?integral=' + roundUp(token / 100), {
    cache: 'no-cache',
    headers: {
      [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
    },
    method: 'GET',
  });
  console.log(await integralRes.json());
  return { auth: true };
};
