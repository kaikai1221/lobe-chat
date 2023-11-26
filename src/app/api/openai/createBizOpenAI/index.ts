import OpenAI from 'openai/index';

import { checkAuth } from '@/app/api/auth';
import { getServerConfig } from '@/config/server';
import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { ChatErrorType, ErrorType } from '@/types/fetch';

import { createErrorResponse } from '../errorResponse';
import { createAzureOpenai } from './createAzureOpenai';
import { createOpenai } from './createOpenai';

/**
 * createOpenAI Instance with Auth and azure openai support
 * if auth not pass ,just return error response
 */
export const runtime = 'nodejs';
export const createBizOpenAI = async (req: Request, model: string): Promise<Response | OpenAI> => {
  const { apiKey, accessCode, endpoint, useAzure, apiVersion } = getOpenAIAuthFromRequest(req);
  const reqData = await req.json();
  const allContents = reqData.messages
    .map((msg: { content: string; role: string }) => msg.content)
    .join('');
  const result = await checkAuth({
    accessCode,
    allContents,
    model,
    url: req.headers.get('origin') || '',
  });
  if (!result.auth) {
    return createErrorResponse(result.error as ErrorType);
  }

  let openai: OpenAI;

  const { USE_AZURE_OPENAI } = getServerConfig();
  const useAzureOpenAI = useAzure || USE_AZURE_OPENAI;

  try {
    if (useAzureOpenAI) {
      openai = createAzureOpenai({ apiVersion, endpoint, model, userApiKey: apiKey });
    } else {
      openai = createOpenai(apiKey, endpoint);
    }
  } catch (error) {
    if ((error as Error).cause === ChatErrorType.NoAPIKey) {
      return createErrorResponse(ChatErrorType.NoAPIKey);
    }

    console.error(error); // log error to trace it
    return createErrorResponse(ChatErrorType.InternalServerError);
  }

  return openai;
};
