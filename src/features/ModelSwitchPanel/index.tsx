import { Icon } from '@lobehub/ui';
import { Dropdown } from 'antd';
import { createStyles } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { LucideArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import useSWR from 'swr';

import { ModelItemRender, ProviderItemRender } from '@/components/ModelSelect';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';
import { modelProviderSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';
import { ModelProviderCard } from '@/types/llm';
import { withBasePath } from '@/utils/basePath';

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
  tag: css`
    cursor: pointer;
  `,
}));

const ModelSwitchPanel = memo<PropsWithChildren>(({ children }) => {
  const { t } = useTranslation('components');
  const { styles, theme } = useStyles();
  const model = useSessionStore(agentSelectors.currentAgentModel);
  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);

  const router = useRouter();
  const enabledList = useGlobalStore(
    modelProviderSelectors.modelProviderListForModelSelect,
    isEqual,
  );
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
  const items = useMemo(() => {
    const getModelItems = (provider: ModelProviderCard) => {
      const items = provider.chatModels.map((model) => ({
        key: model.id,
        label: <ModelItemRender {...model} />,
        onClick: () => {
          updateAgentConfig({ model: model.id, provider: provider.id });
        },
      }));

      // if there is empty items, add a placeholder guide
      if (items.length === 0)
        return [
          {
            key: 'empty',
            label: (
              <Flexbox gap={8} horizontal style={{ color: theme.colorTextTertiary }}>
                {t('ModelSwitchPanel.emptyModel')}
                <Icon icon={LucideArrowRight} />
              </Flexbox>
            ),
            onClick: () => {
              router.push(withBasePath('/settings/llm'));
            },
          },
        ];

      return items;
    };

    // If there is only one provider, just remove the group, show model directly
    if (enabledList.length === 1) {
      const provider = enabledList[0];
      return getModelItems(provider);
    }

    if (!useGlobalStore.getState().settings?.token || data?.code !== 0 || data?.status === false) {
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
  }, [modelList]);

  return (
    <Dropdown
      menu={{
        activeKey: model,
        className: styles.menu,
        items,
        style: {
          maxHeight: 500,
          overflowY: 'scroll',
        },
      }}
      placement={'topLeft'}
      trigger={['click']}
    >
      <div className={styles.tag}>{children}</div>
    </Dropdown>
  );
});

export default ModelSwitchPanel;
