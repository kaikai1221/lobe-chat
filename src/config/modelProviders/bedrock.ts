import { ModelProviderCard } from '@/types/llm';

const Bedrock: ModelProviderCard = {
  chatModels: [
    // {
    //   description:
    //     'Amazon Titan Text G1 - Express v1，上下文长度可达 8000 个 token，适合广泛的用途。',
    //   displayName: 'Titan Text G1 - Express',
    //   hidden: true,
    //   id: 'amazon.titan-text-express-v1:0:8k',
    //   tokens: 8000,
    // },
    {
      description:
        'claude-1-100k，上下文大小等于 100k，一个更快更便宜但仍然非常能干的模型，可以处理包括随意对话在内的多种任务。',
      displayName: 'claude-1-100k',
      id: 'claude-1-100k',
      tokens: 100_000,
    },
    {
      description: 'claude-1.3-100k，Claude 1 的更新版本，在可靠性方面有所提升提升。',
      displayName: 'claude-1.3-100k',
      id: 'claude-1.3-100k',
      tokens: 100_000,
    },
    {
      description: 'claude-2，Claude 1 的最新版本，具有最先进的语言处理技术。',
      displayName: 'claude-2',
      id: 'claude-2',
      tokens: 100_000,
    },
    // {
    //   description: 'Llama 2 Chat 13B v1，上下文大小为 4k，Llama 2 模型的对话用例优化变体。',
    //   displayName: 'Llama 2 Chat 13B',
    //   id: 'meta.llama2-13b-chat-v1',
    //   tokens: 4000,
    // },
    // {
    //   description: 'Llama 2 Chat 70B v1，上下文大小为 4k，Llama 2 模型的对话用例优化变体。',
    //   displayName: 'Llama 2 Chat 70B',
    //   id: 'meta.llama2-70b-chat-v1',
    //   tokens: 4000,
    // },
  ],
  id: 'bedrock',
};

export default Bedrock;
