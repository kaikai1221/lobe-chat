'use client';

import { createStyles } from 'antd-style';
import { PropsWithChildren } from 'react';
import { Flexbox } from 'react-layout-kit';

import AppLayoutMobile from '@/layout/AppLayout.mobile';
import { SidebarTabKey } from '@/store/global/initialState';

import ActionPanel from '../(desktop)/features/ActionPanel';
import Header from './features/Header';

const useStyles = createStyles(({ css, token }) => ({
  description: css`
    width: 100%;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
    text-align: center;
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
    <AppLayoutMobile navBar={<Header />} showTabBar tabBarKey={SidebarTabKey.AIImage}>
      <ActionPanel isGenerating={isGenerating} mobile setGenerating={setGenerating} />
      <p className={styles.title}>历史记录</p>
      <p className={styles.description}>记录只保留30天，请及时保存</p>
      <Flexbox flex={1} gap={16} style={{ padding: 16 }}>
        {children}
      </Flexbox>
    </AppLayoutMobile>
  );
};

export default AIImageLayout;
