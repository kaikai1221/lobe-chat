import { ActionIcon, Avatar, MobileNavBar } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import { MOBILE_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useGlobalStore } from '@/store/global';
import { commonSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { mobileHeaderSticky } from '@/styles/mobileHeader';

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
  const [createSession] = useSessionStore((s) => [s.createSession]);
  const router = useRouter();
  const avatar = useGlobalStore(commonSelectors.userAvatar);
  return (
    <MobileNavBar
      center={<div className={styles.logo}>AI 聊天室</div>}
      left={
        <div onClick={() => router.push('/settings')} style={{ marginLeft: 8 }}>
          {avatar ? <Avatar avatar={avatar} size={28} /> : ''}
        </div>
      }
      right={
        <ActionIcon
          icon={MessageSquarePlus}
          onClick={() => createSession()}
          size={MOBILE_HEADER_ICON_SIZE}
        />
      }
      style={mobileHeaderSticky}
    />
  );
});

export default Header;
