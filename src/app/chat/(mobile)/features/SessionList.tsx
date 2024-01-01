import { Button, Modal } from 'antd';
import { memo, useState } from 'react';

import ModelPrice from '@/components/ModelPrice';
import PayModal from '@/components/PayModal/index';

import SessionListContent from '../../features/SessionListContent';
import SessionSearchBar from '../../features/SessionSearchBar';

const Sessions = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  return (
    <>
      <div style={{ padding: '8px 16px' }}>
        <SessionSearchBar />
        <div style={{ marginTop: '10px' }}>
          <Button onClick={() => setIsModalOpen(true)} size="small" style={{ marginRight: '10px' }}>
            模型价格
          </Button>
          <Button
            onClick={() => {
              setIsPayOpen(true);
            }}
            size="small"
          >
            充值积分
          </Button>
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
