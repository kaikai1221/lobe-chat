import { ChatHeader } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import Link from 'next/link';
import { memo } from 'react';

// import ShareAgentButton from '../../features/ShareAgentButton';

export const useStyles = createStyles(({ css, token }) => ({
  description: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
  `,
  logo: css`
    font-size: 16px;
    font-weight: bolder;
    color: ${token.colorText};
    fill: ${token.colorText};
  `,
}));

const Header = memo(() => {
  const { styles } = useStyles();

  return (
    <ChatHeader
      left={
        <Link aria-label={'home'} href={'/'}>
          <div className={styles.logo}>AI 聊天室 / 绘图</div>
          <p className={styles.description}>只保留最近30天的图片记录，请及时保存</p>
        </Link>
      }
      // right={<ShareAgentButton />}
    />
  );
});

export default Header;
