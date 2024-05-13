import { CloseCircleOutlined } from '@ant-design/icons';
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
import { imageUrl } from '@/const/url';
import { useGlobalStore } from '@/store/global';
import { useSessionStore } from '@/store/session';

import SessionSearchBar from '../../features/SessionSearchBar';

export const useStyles = createStyles(({ css, token }) => ({
  close: css`
    cursor: pointer;

    position: absolute;
    top: 3px;
    right: 3px;

    font-size: 14px;
    color: #aaa;

    transition: all 0.2s;

    &:hover {
      scale: 1.2;
      color: #fff;
    }
  `,
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
  const [isShowAd, setisShowAd] = useState(false);
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
    setSettings({ integral: data.body?.integral || 0 });
  }
  useEffect(() => {
    setIntegral(data?.body?.integral || 0);
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
      {isShowAd && (
        <a
          href="https://www.biguo.cn/details/652f4d7962a5e12b4c06cf50"
          rel="noopener noreferrer"
          style={{
            background: 'linear-gradient(to right, #8145db 0%, #6829c6 100%)',
            borderRadius: '5px',
            position: 'relative',
            textAlign: 'center',
            width: '100%',
          }}
          target="_blank"
        >
          <CloseCircleOutlined
            className={styles.close}
            onClick={(e) => {
              e.preventDefault();
              setisShowAd(false);
            }}
          />
          <img
            alt="大头ai课"
            src={imageUrl('ad_small.jpg')}
            style={{ borderRadius: '5px', height: '36px' }}
          />
        </a>
      )}
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
