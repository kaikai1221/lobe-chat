'use client';

// import AppLayoutMobile from '@/layout/AppLayout.mobile';
import { MobileNavBar } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { PropsWithChildren } from 'react';
import { Flexbox } from 'react-layout-kit';

import { mobileHeaderSticky } from '@/styles/mobileHeader';

import ActionPanel from '../(desktop)/features/ActionPanel';

const useStyles = createStyles(({ css, token }) => ({
  description: css`
    width: 100%;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
    text-align: center;
  `,
  logo: css`
    font-size: 16px;
    font-weight: bolder;
    color: ${token.colorText};
    fill: ${token.colorText};
  `,
  title: css`
    width: 100%;
    margin-top: 10px;

    font-size: ${token.fontSizeHeading3}px;
    color: ${token.colorTextHeading};
    text-align: center;
  `,
}));
const AIImageLayout = ({
  children,
  isGenerating,
  setGenerating,
}: PropsWithChildren & { isGenerating: boolean; setGenerating: (data: boolean) => void }) => {
  const { styles } = useStyles();

  return (
    <>
      <MobileNavBar
        center={<>AI 聊天室</>}
        // right={<ShareAgentButton mobile />}
        style={mobileHeaderSticky}
      />
      {/* <AppLayoutMobile navBar={<Header />} showTabBar tabBarKey={SidebarTabKey.AIImage}> */}
      <ActionPanel isGenerating={isGenerating} mobile setGenerating={setGenerating} />
      <p className={styles.title}>历史记录</p>
      <p className={styles.description}>记录只保留30天，请及时保存</p>
      <Flexbox flex={1} gap={16} style={{ padding: 16 }}>
        {children}
      </Flexbox>
      {/* </AppLayoutMobile> */}
    </>
  );
};

export default AIImageLayout;
