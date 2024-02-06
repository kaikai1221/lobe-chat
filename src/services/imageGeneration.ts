import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { createHeaderWithOpenAI } from '@/services/_header';
import { OPENAI_URLS } from '@/services/_url';
import { useGlobalStore } from '@/store/global';
import { OpenAIImagePayload } from '@/types/openai/image';

interface FetchOptions {
  signal?: AbortSignal | undefined;
}

class ImageGenerationService {
  async generateImage(params: Omit<OpenAIImagePayload, 'model' | 'n'>, options?: FetchOptions) {
    const payload: OpenAIImagePayload = { ...params, model: 'dall-e-3', n: 1 };
    const res = await fetch(OPENAI_URLS.images, {
      body: JSON.stringify(payload),
      headers: createHeaderWithOpenAI({ 'Content-Type': 'application/json' }),
      method: 'POST',
      signal: options?.signal,
    });

    const urls = await res.json();
    fetch(`/api/user/subIntegral?token=1&modelName=dall-e-3&desc=生成&type=order`, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings?.token || '',
      },
      method: 'GET',
    });
    return urls[0] as string;
  }
}

export const imageGenerationService = new ImageGenerationService();
