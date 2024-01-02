import { ActionIcon } from '@lobehub/ui';
import { Button, Modal } from 'antd';
import { createStyles } from 'antd-style';
import { MessageSquarePlus } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import ModelPrice from '@/components/ModelPrice';
import PayModal from '@/components/PayModal/index';
import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
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
        <Button
          onClick={() => {
            setIsPayOpen(true);
          }}
          size="small"
        >
          充值积分
        </Button>
      </div>
      <Modal
        centered
        footer={false}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        style={{ maxHeight: '80vh' }}
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
    </Flexbox>
  );
});

export default Header;
