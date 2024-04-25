import { checkAuth } from '@/app/api/auth';
import { getPreferredRegion } from '@/app/api/config';
import { createErrorResponse } from '@/app/api/errorResponse';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import {
  AgentInitErrorPayload,
  AgentRuntimeError,
  ChatCompletionErrorPayload,
  ILobeAgentRuntimeErrorType,
} from '@/libs/agent-runtime';
import { ChatErrorType } from '@/types/fetch';
import { ChatStreamPayload } from '@/types/openai/chat';
import { encodeAsync } from '@/utils/tokenizer';
import { getTracePayload } from '@/utils/trace';

import AgentRuntime from '../agentRuntime';

export const runtime = 'edge';

export const preferredRegion = getPreferredRegion();
export const POST = async (req: Request, { params, jwtPayload }: any) => {
  const { provider } = params;
  let agentRuntime: AgentRuntime;

  try {
    // ============  1. init chat model   ============ //

    // get Authorization from header
    const accessCode = req.headers.get(LOBE_CHAT_ACCESS_CODE);
    const reqData = await req.clone().json();
    const model = reqData.model;
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
    console.log(model, token);
    const result = await checkAuth({
      accessCode,
      model,
      token,
      url: req.headers.get('origin') || '',
    });
    const { auth, error } = result;
    if (!auth) throw AgentRuntimeError.createError(error as string);
    const { provider } = params;
    agentRuntime = await AgentRuntime.initializeWithUserPayload(provider, jwtPayload, isTools);
    // agentRuntime = await AgentRuntime.initializeWithUserPayload(
    //   provider,
    //   payload,
    //   {
    //     apiVersion: azureApiVersion,
    //     model,
    //     useAzure,
    //   },
    //   isTools,
    // );
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
  } catch (e) {
    console.log('错误：' + e);
    // if catch the error, just return it
    const err = e as AgentInitErrorPayload;
    const { provider } = params;
    return createErrorResponse(err.errorType as ILobeAgentRuntimeErrorType, {
      error: err.error,
      provider,
    });
  }

  // ============  2. create chat completion   ============ //

  try {
    const payload = (await req.json()) as ChatStreamPayload;
    const tracePayload = getTracePayload(req);
    return await agentRuntime.chat(payload, {
      enableTrace: tracePayload?.enabled,
      provider,
      trace: tracePayload,
    });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;
    // track the error at server side
    console.error(`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
};
