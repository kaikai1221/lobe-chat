import OpenAI from 'openai';

import { checkAuth } from '@/app/api/auth';
import { LOBE_CHAT_ACCESS_CODE, getOpenAIAuthFromRequest } from '@/const/fetch';
// import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { ChatErrorType, ErrorType } from '@/types/fetch';
import { encodeAsync } from '@/utils/tokenizer';

import { createErrorResponse } from '../../errorResponse';
import { createOpenai } from './createOpenai';

/**
 * createOpenAI Instance with Auth and azure openai support
 * if auth not pass ,just return error response
 */
export const runtime = 'nodejs';
export const createBizOpenAI = async (req: Request, model: string): Promise<Response | OpenAI> => {
  const { apiKey, accessCode, endpoint } = getOpenAIAuthFromRequest(req);
  const reqData = await req.json();
  const allContents = reqData.messages
    ? reqData.messages
        .map((msg: { content: string | [{ text?: string; type: string }]; role: string }) =>
          Array.isArray(msg.content)
            ? msg.content
                .map((content) =>
                  content.text ? content.text : Array.from({ length: 500 }, () => 1),
                )
                .join('')
            : msg.content,
        )
        .join('')
    : reqData.input || '';
  const isTools = !!reqData.tools;
  let token = 0;
  await encodeAsync(allContents)
    .then((e) => (token = e))
    .catch(() => {
      // 兜底采用字符数
      token = allContents.length || 1000;
    });
  const result = await checkAuth({
    accessCode,
    model,
    token,
    url: req.headers.get('origin') || '',
  });
  if (!result.auth) {
    return createErrorResponse(result.error as ErrorType);
  }

  let openai: OpenAI;

  try {
    openai = createOpenai(apiKey, endpoint, isTools);
  } catch (error) {
    if ((error as Error).cause === ChatErrorType.NoOpenAIAPIKey) {
      return createErrorResponse(ChatErrorType.NoOpenAIAPIKey);
    }

    console.error(error); // log error to trace it
    return createErrorResponse(ChatErrorType.InternalServerError);
  }
  if (result.type) {
    if (result.type === 'integral') {
      fetch(
        `${req.headers.get('origin') || ''}/api/user/subIntegral?token=${token}&modelName=${model}&desc=输入&type=in`,
        {
          cache: 'no-cache',
          headers: {
            [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
          },
          method: 'GET',
        },
      );
    } else if (result.type === 'quota') {
      let modelName = model;
      if (model.includes('gpt-3.5')) {
        modelName = 'gpt-3.5-turbo';
      }
      fetch(`${req.headers.get('origin') || ''}/api/user/subQuota?model=${modelName}`, {
        cache: 'no-cache',
        headers: {
          [LOBE_CHAT_ACCESS_CODE]: accessCode || '',
        },
        method: 'GET',
      });
    }
  }

  return openai;
};
