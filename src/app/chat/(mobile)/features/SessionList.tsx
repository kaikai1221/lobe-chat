import { Button, Modal, Statistic, Tooltip } from 'antd';
import { memo, useState } from 'react';
import CountUp from 'react-countup';
import useSWR from 'swr';

import ModelPrice from '@/components/ModelPrice';
import PayModal from '@/components/PayModal/index';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';

import SessionListContent from '../../features/SessionListContent';
import SessionSearchBar from '../../features/SessionSearchBar';

const formatter = (value: any) => <CountUp end={value} separator="," />;
const Sessions = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { settings } = useGlobalStore.getState();
  const [setSettings] = useGlobalStore((s) => [s.setSettings]);
  const { data, isLoading = true } = useSWR(settings?.token ? '/api/user/info' : '', async () => {
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
  return (
    <>
      <div style={{ padding: '8px 16px' }}>
        <SessionSearchBar />
        <div style={{ marginTop: '10px' }}>
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
                    formatter={formatter}
                    value={settings.integral || 0}
                    valueStyle={{ fontSize: '14px' }}
                  />
                </div>
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
      <Modal
        centered
        footer={false}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="模型价格"
      >
        <ModelPrice />
      </Modal>
      <PayModal
        onOpenChange={(e) => {
          setIsPayOpen(e);
        }}
        open={isPayOpen}
      />
      <SessionListContent />
    </>
  );
});

export default Sessions;
