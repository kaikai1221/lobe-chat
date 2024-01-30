import { ActionIcon } from '@lobehub/ui';
import { Dropdown } from 'antd';
import isEqual from 'fast-deep-equal';
import { BrainCog } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';
import { settingsSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';
import { LanguageModel } from '@/types/llm';

const ModelSwitch = memo(() => {
  const { t } = useTranslation('setting');
  const { data } = useSWR(useGlobalStore.getState().settings.token ? 'getPlanId' : '', async () => {
    const res = await fetch('/api/user/getPlanId', {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings.token || '',
      },
      method: 'GET',
    });
    const data = await res.json();
    return data.body;
  });
  const [model, updateAgentConfig] = useSessionStore((s) => {
    return [agentSelectors.currentAgentModel(s), s.updateAgentConfig];
  });

  let modelList = useGlobalStore(settingsSelectors.modelList, isEqual);
  if (data && data.status === false) {
    modelList = modelList.filter((item) => !item.name.includes('gpt'));
    modelList.push({
      displayName: 'openai-chatGPT',
      name: 'gpt-3.5-turbo-16k',
    });
    console.log(modelList, 999);
  }
  return (
    <Dropdown
      menu={{
        activeKey: model,
        items: [
          { key: 'label', label: '带vision字样的模型可以识别图片', type: 'group' },
          ...modelList.map(({ name, displayName }) => ({ key: name, label: displayName })),
        ],
        onClick: (e) => {
          updateAgentConfig({ model: e.key as LanguageModel });
        },
        style: {
          maxHeight: 400,
          overflow: 'scroll',
        },
      }}
      trigger={['click']}
    >
      <ActionIcon icon={BrainCog} placement={'bottom'} title={t('settingModel.model.title')} />
    </Dropdown>
  );
});

export default ModelSwitch;
