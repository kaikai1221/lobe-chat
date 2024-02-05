import { ModelProviderCard } from '@/types/llm';

// TODO: 等待 ZhiPu 修复 API 问题后开启 functionCall
// refs: https://github.com/lobehub/lobe-chat/discussions/737#discussioncomment-8315815
// 暂时不透出 GLM 系列的 function_call 功能
const Qwen: ModelProviderCard = {
  chatModels: [
    {
      description: '通义千问，阿里云开发的预训练语言模型。',
      displayName: 'qwen-72b',
      // functionCall: true,
      id: 'qwen-72b',
      tokens: 32_000,
    },
  ],
  id: 'qwen',
};

export default Qwen;
