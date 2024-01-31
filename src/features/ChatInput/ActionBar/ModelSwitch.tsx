import { ActionIcon } from '@lobehub/ui';
import { Dropdown } from 'antd';
import isEqual from 'fast-deep-equal';
import { BrainCog } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useGlobalStore } from '@/store/global';
import { modelProviderSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';
import { LanguageModel } from '@/types/llm';

const ModelSwitch = memo(() => {
  const { t } = useTranslation('setting');

  const [model, updateAgentConfig] = useSessionStore((s) => {
    return [agentSelectors.currentAgentModel(s), s.updateAgentConfig];
  });

  const modelList = useGlobalStore(modelProviderSelectors.modelList, isEqual);

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
