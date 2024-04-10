'use client';

import { MobileNavBar } from '@lobehub/ui';
import { memo } from 'react';

import { mobileHeaderSticky } from '@/styles/mobileHeader';

// import ShareAgentButton from '../../features/ShareAgentButton';

const Header = memo(() => {
  return (
    <MobileNavBar
      center={<>AI 聊天室</>}
      // right={<ShareAgentButton mobile />}
      style={mobileHeaderSticky}
    />
  );
});

export default Header;
