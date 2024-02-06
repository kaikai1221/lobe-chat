import { ActionIcon } from '@lobehub/ui';
import { Button, Modal, Statistic, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { MessageSquarePlus } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import useSWR from 'swr';

import ModelPrice from '@/components/ModelPrice';
import PayModal from '@/components/PayModal/index';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useGlobalStore } from '@/store/global';
import { useSessionStore } from '@/store/session';

import SessionSearchBar from '../../features/SessionSearchBar';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    font-size: 16px;
    font-weight: bolder;
    fill: ${token.colorText};
  `,
  top: css`
    position: sticky;
    top: 0;
  `,
}));
const Header = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const [createSession] = useSessionStore((s) => [s.createSession]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { settings } = useGlobalStore.getState();
  const [integral, setIntegral] = useState(0);
  const [startValue, setStartValue] = useState(0);
  // const formatter = (value: any) => (
  //   <CountUp start={startValue} end={value} separator="," onStart={() => setStartValue(integral)} />
  // );
  const [setSettings] = useGlobalStore((s) => [s.setSettings]);
  const { data, isLoading = true } = useSWR(settings?.token ? '/api/user/info' : '', async () => {
    setStartValue(integral);
    const res = await fetch('/api/user/info', {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings?.token || '',
      },
      method: 'GET',
    });
    return await res.json();
  });
  if (data?.body) {
    setSettings({ integral: data.body.integral || 0 });
  }
  useEffect(() => {
    setIntegral(data?.body.integral || 0);
  }, [data?.body]);
  return (
    <Flexbox className={styles.top} gap={16} padding={16}>
      <Flexbox distribution={'space-between'} horizontal>
        <div className={styles.logo}>AI 聊天室</div>
        <ActionIcon
          icon={MessageSquarePlus}
          onClick={() => createSession()}
          size={DESKTOP_HEADER_ICON_SIZE}
          style={{ flex: 'none' }}
          title={t('newAgent')}
        />
      </Flexbox>
      <SessionSearchBar />
      <div>
        <Button onClick={() => setIsModalOpen(true)} size="small" style={{ marginRight: '10px' }}>
          模型价格
        </Button>
        <Tooltip title="点击充值积分">
          <Button
            loading={isLoading}
            onClick={() => {
              setIsPayOpen(true);
            }}
            size="small"
          >
            {!isLoading && (
              <div style={{ alignContent: 'center', alignItems: 'center', display: 'flex' }}>
                剩余积分:
                <Statistic
                  formatter={(value: any) => (
                    <CountUp end={value} separator="," start={startValue} />
                  )}
                  value={integral}
                  valueStyle={{ fontSize: '14px' }}
                />
              </div>
            )}
          </Button>
        </Tooltip>
      </div>
      <Modal
        centered
        footer={false}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        style={{ maxHeight: '80vh' }}
        title="模型价格"
        width="70%"
      >
        <ModelPrice />
      </Modal>
      <PayModal
        onOpenChange={(e) => {
          setIsPayOpen(e);
        }}
        open={isPayOpen}
      />
    </Flexbox>
  );
});

export default Header;
