import { ActionIcon } from '@lobehub/ui';
import { Dropdown } from 'antd';
import { createStyles } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { BrainCog } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { ModelItemRender, ProviderItemRender } from '@/components/ModelSelect';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';
import { modelProviderSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';
import { LanguageModel, ModelProviderCard } from '@/types/llm';

const useStyles = createStyles(({ css, prefixCls }) => ({
  menu: css`
    .${prefixCls}-dropdown-menu-item {
      display: flex;
      gap: 8px;
    }
    .${prefixCls}-dropdown-menu {
      &-item-group-title {
        padding-inline: 8px;
      }

      &-item-group-list {
        margin: 0 !important;
      }
    }
  `,
}));

const ModelSwitch = memo(() => {
  const { data } = useSWR(
    useGlobalStore.getState().settings?.token ? 'getPlanId' : '',
    async () => {
      const res = await fetch('/api/user/getPlanId', {
        cache: 'no-cache',
        headers: {
          [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings?.token || '',
        },
        method: 'GET',
      });
      const data = await res.json();
      return data.body;
    },
  );
  const model = useSessionStore(agentSelectors.currentAgentModel);
  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);
  // let modelList = useGlobalStore(modelProviderSelectors.modelList, isEqual);
  // if (data && data.status === false) {
  //   modelList = modelList.filter((item) => !item.name.includes('gpt'));
  //   modelList.push({
  //     displayName: 'openai-chatGPT',
  //     name: 'gpt-3.5-turbo-16k',
  //   });
  //   console.log(modelList, 999);
  // }
  const { t } = useTranslation('chat');
  const { styles } = useStyles();

  const select = useGlobalStore(modelProviderSelectors.modelSelectList, isEqual);
  const enabledList = select.filter((s) => s.enabled);

  const items = useMemo(() => {
    const getModelItems = (provider: ModelProviderCard) =>
      provider.chatModels
        .filter((c) => !c.hidden)
        .map((model) => ({
          key: model.id,
          label: <ModelItemRender {...model} />,
          onClick: () => {
            updateAgentConfig({ model: model.id, provider: 'openai' });
          },
        }));

    if (enabledList.length === 1) {
      const provider = enabledList[0];
      return getModelItems(provider);
    }
    let modelList: ModelProviderCard[] = [
      {
        chatModels: [
          {
            displayName: 'openai-chatGPT',
            functionCall: true,
            id: 'gpt-3.5-turbo-16k',
            tokens: 16_385,
          },
        ],
        enabled: true,
        id: 'openai',
      },
    ];
    if (!useGlobalStore.getState().settings?.token || (data && data.status === false)) {
      // modelList = modelList.filter((item) => !item.id.includes('openai'));
      // enabledList = enabledList.filter((item) => !item.model.id.includes('gpt'));
      modelList = [
        {
          chatModels: [
            {
              displayName: 'openai-chatGPT',
              functionCall: true,
              id: 'gpt-3.5-turbo-16k',
              tokens: 16_385,
            },
          ],
          enabled: true,
          id: 'openai',
        },
      ];
    } else {
      modelList = enabledList;
    }
    return modelList.map((provider) => ({
      children: getModelItems(provider),
      key: provider.id,
      label: <ProviderItemRender provider={provider.id} />,
      type: 'group',
    }));
  }, [enabledList]);
  return (
    <Dropdown
      menu={{
        activeKey: model,
        className: styles.menu,
        items,
        onClick: (e) => {
          updateAgentConfig({ model: e.key as LanguageModel, provider: 'openai' });
        },
        style: {
          maxHeight: 500,
          overflowY: 'scroll',
        },
      }}
      trigger={['click']}
    >
      <ActionIcon icon={BrainCog} placement={'bottom'} title={t('ModelSwitch.title')} />
    </Dropdown>
  );
});

export default ModelSwitch;
