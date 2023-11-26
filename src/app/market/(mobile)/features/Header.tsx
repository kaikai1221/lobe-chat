import { MobileNavBar } from '@lobehub/ui';
import { memo } from 'react';

// import ShareAgentButton from '../../features/ShareAgentButton';

const Header = memo(() => {
  return <MobileNavBar center={<div>AI 聊天室</div>} />;
});

export default Header;
