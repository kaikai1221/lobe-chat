import { ActionIcon } from '@lobehub/ui';
import { Compass, Image, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { GlobalStore, useGlobalStore } from '@/store/global';
import { SidebarTabKey } from '@/store/global/initialState';
import { useSessionStore } from '@/store/session';

export interface TopActionProps {
  tab?: GlobalStore['sidebarKey'];
}

const TopActions = memo<TopActionProps>(({ tab }) => {
  const { t } = useTranslation('common');
  const switchBackToChat = useGlobalStore((s) => s.switchBackToChat);

  return (
    <>
      <Link
        href={'/chat'}
        onClick={(e) => {
          e.preventDefault();
          switchBackToChat(useSessionStore.getState().activeId);
        }}
      >
        <ActionIcon
          active={tab === SidebarTabKey.Chat}
          icon={MessageSquare}
          placement={'right'}
          size="large"
          title={t('tab.chat')}
        />
      </Link>
      <Link href={'/market'}>
        <ActionIcon
          active={tab === SidebarTabKey.Market}
          icon={Compass}
          placement={'right'}
          size="large"
          title={t('tab.market')}
        />
      </Link>
      <Link href={'/aiImage'}>
        <ActionIcon
          active={tab === SidebarTabKey.AIImage}
          icon={Image}
          // onClick={() => {
          //   setTab(SidebarTabKey.AIImage);
          // }}
          placement={'right'}
          size="large"
          title="AI绘图"
        />
      </Link>
    </>
  );
});

export default TopActions;
