import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { serverStatus } from '@/prismaClient/serverStatus';
import { ChatErrorType } from '@/types/fetch';

interface AuthConfig {
  accessCode?: string | null;
  apiKey?: string | null;
  model: string;
  token?: number;
  url: string;
}
export const checkAuth = async ({ accessCode, token, url, model }: AuthConfig) => {
  try {
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
    if (data.body.code === serverStatus.success && data.body.data === 'system') {
      return { auth: true, type: 'integral' };
    }
    const targetUserLimits = (data.body.userLimits || []).filter((item: any) => {
      if (model.includes('gpt-3.5')) {
        return item.modelName.includes('gpt-3.5');
      }
      return item.modelName === model;
    });
    if ((!targetUserLimits || targetUserLimits.length === 0) && data.body.integral === 0)
      return { auth: false, error: ChatErrorType.InsufficientBalance };
    if (
      token &&
      targetUserLimits &&
      targetUserLimits.every(
        (item: { subscription: { plan: { limits: [{ times: number }] } }; times: number }) => {
          return item.times >= item.subscription.plan.limits[0].times;
        },
      )
    ) {
      if (data.body.integral === 0) {
        return { auth: false, error: ChatErrorType.InsufficientBalance };
      } else {
        let minIntegral = 20;
        let denominator = 100;
        if (model.includes('gpt-4')) {
          minIntegral = 2000;
          denominator = 5;
        }
        if (model.includes('midjourney')) {
          minIntegral = 100;
          denominator = 1000;
        }
        if (data.body.integral < token / denominator + minIntegral)
          return { auth: false, error: ChatErrorType.InsufficientBalance };
        // await fetch(
        //   `${url}/api/user/subIntegral?token=${token}&modelName=${model}&desc=输入&type=in`,
        //   {
        //     cache: 'no-cache',
        //     headers: {
        //       [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
        //     },
        //     method: 'GET',
        //   },
        // );
        return { auth: true, type: 'integral' };
      }
    } else {
      // await fetch(`${url}/api/user/subQuota?model=${model}`, {
      //   cache: 'no-cache',
      //   headers: {
      //     [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
      //   },
      //   method: 'GET',
      // });
      return { auth: true, type: 'quota' };
    }
  } catch {
    return { auth: false, error: ChatErrorType.InternalServerError };
  }
};
