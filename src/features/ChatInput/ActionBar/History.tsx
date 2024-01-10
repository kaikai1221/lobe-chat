import { ActionIcon, SliderWithInput } from '@lobehub/ui';
import { Popover, Switch, Tour } from 'antd';
import type { TourProps } from 'antd';
import { Timer, TimerOff } from 'lucide-react';
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';

const History = memo(() => {
  const { t } = useTranslation('setting');
  const ref = useRef(null);
  const [historyCount, unlimited, updateAgentConfig] = useSessionStore((s) => {
    const config = agentSelectors.currentAgentConfig(s);
    return [config.historyCount, !config.enableHistoryCount, s.updateAgentConfig];
  });
  const [open, setOpen] = useState<boolean>(false);
  useLayoutEffect(() => {
    if (localStorage.getItem('tour')) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  });
  const steps: TourProps['steps'] = [
    {
      description:
        '如果使用积分模式使用gpt，携带历史消息数越多消耗的积分越多，具体看模板价格说明，如果不携带历史消息gpt将无法记住之前的对话内容，请谨慎选择',
      nextButtonProps: { children: '确定' },
      style: { maxWidth: '80%' },
      target: () => ref.current,
      title: '请注意！',
    },
  ];
  return (
    <Popover
      arrow={false}
      content={
        <Flexbox align={'center'} gap={16} horizontal>
          <SliderWithInput
            disabled={unlimited}
            max={30}
            min={1}
            onChange={(v) => {
              updateAgentConfig({ historyCount: v });
            }}
            step={1}
            style={{ width: 160 }}
            value={historyCount}
          />
          <Flexbox align={'center'} gap={4} horizontal>
            <Switch
              checked={unlimited}
              onChange={(checked) => {
                updateAgentConfig({ enableHistoryCount: !checked });
              }}
              size={'small'}
            />
            {t('settingChat.enableHistoryCount.alias')}
          </Flexbox>
        </Flexbox>
      }
      placement={'top'}
      trigger={'click'}
    >
      <ActionIcon
        icon={unlimited ? TimerOff : Timer}
        placement={'bottom'}
        ref={ref}
        title={t(
          unlimited
            ? 'settingChat.enableHistoryCount.unlimited'
            : 'settingChat.enableHistoryCount.limited',
          { number: historyCount || 0 },
        )}
      />
      <Tour
        onClose={() => {
          localStorage.setItem('tour', '1');
          setOpen(false);
        }}
        open={open}
        steps={steps}
      />
    </Popover>
  );
});

export default History;
