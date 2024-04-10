import { DraggablePanel, DraggablePanelBody, DraggablePanelContainer } from '@lobehub/ui';
import { PropsWithChildren, memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import SafeSpacing from '@/components/SafeSpacing';
import { IMAGE_SIDEBAR_WIDTH, MARKET_SIDEBAR_WIDTH, MAX_WIDTH } from '@/const/layoutTokens';

// import AppLayoutDesktop from '@/layout/AppLayout.desktop';
import ActionPanel from './features/ActionPanel';
import Header from './features/Header';

const AIImageLayout = memo<
  PropsWithChildren & { isGenerating: boolean; setGenerating: (data: boolean) => void }
>(({ children, isGenerating, setGenerating }) => {
  const [expand, setExpand] = useState(true);
  const [pin] = useState(true);
  console.log(isGenerating);
  return (
    <>
      {/* <AppLayoutDesktop sidebarKey={SidebarTabKey.AIImage}> */}
      <DraggablePanel
        expand={expand}
        maxWidth={MARKET_SIDEBAR_WIDTH}
        minWidth={IMAGE_SIDEBAR_WIDTH}
        mode={pin ? 'fixed' : 'float'}
        onExpandChange={setExpand}
        pin={pin}
        placement="left"
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DraggablePanelContainer
          style={{
            flex: 'none',
            height: '100%',
            maxHeight: '100vh',
            minWidth: IMAGE_SIDEBAR_WIDTH,
            overflow: 'auto',
          }}
        >
          <DraggablePanelBody>
            <ActionPanel isGenerating={isGenerating} setGenerating={setGenerating} />
          </DraggablePanelBody>
        </DraggablePanelContainer>
      </DraggablePanel>
      <Flexbox
        flex={1}
        height={'100%'}
        id={'lobe-aiImage-container'}
        style={{ position: 'relative' }}
      >
        <Header />
        <Flexbox flex={1} height={'calc(100% - 64px)'} horizontal>
          <Flexbox align={'center'} flex={1} style={{ overflow: 'auto', padding: 16 }}>
            <SafeSpacing />
            <Flexbox gap={16} style={{ maxWidth: MAX_WIDTH, position: 'relative', width: '100%' }}>
              {children}
            </Flexbox>
          </Flexbox>
        </Flexbox>
      </Flexbox>

      {/* </AppLayoutDesktop> */}
    </>
  );
});

export default AIImageLayout;
