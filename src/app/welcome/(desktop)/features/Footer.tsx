'use client';

import { ActionIcon, Modal } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import { BookmarkPlus } from 'lucide-react';
import Image from 'next/image';
import { memo, useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const Footer = memo(() => {
  const theme = useTheme();
  // const { t } = useTranslation('common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <Flexbox align={'center'} horizontal justify={'space-between'} style={{ padding: 16 }}>
      <span style={{ color: theme.colorTextDescription }}>
        ©{new Date().getFullYear()} AI聊天室
      </span>
      <Flexbox horizontal>
        <ActionIcon
          icon={BookmarkPlus}
          onClick={() => setIsModalOpen(true)}
          size={'site'}
          title={'关注公众号'}
        />
        <Modal
          footer={''}
          onCancel={() => setIsModalOpen(false)}
          onOk={() => setIsModalOpen(false)}
          open={isModalOpen}
          title="关注公众号"
        >
          <p style={{ textAlign: 'center' }}>关注公众号，获取最新消息，领取专属礼包</p>
          <div style={{ textAlign: 'center' }}>
            <Image alt="公众号" height={200} src="/images/qrcode_for_gzh.jpg" width={200} />
          </div>
        </Modal>
        {/* <ActionIcon
          icon={Book}
          onClick={() => window.open(DOCUMENTS, '__blank')}
          size={'site'}
          title={t('document')}
        />
        <ActionIcon
          icon={Github}
          onClick={() => window.open(GITHUB, '__blank')}
          size={'site'}
          title={'GitHub'}
        /> */}
      </Flexbox>
    </Flexbox>
  );
});

export default Footer;
