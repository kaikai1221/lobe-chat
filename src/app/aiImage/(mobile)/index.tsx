'use client';

import { SpotlightCard, SpotlightCardProps } from '@lobehub/ui';
import { Segmented } from 'antd';
import { FC, memo, useState } from 'react';

import AgentCard from '@/app/aiImage/features/AgentCard';
import MidTem from '@/app/aiImage/features/MidTem';
import { useEffectAfterGlobalHydrated } from '@/store/global/hooks/useEffectAfterHydrated';

import Loading from '../features/AgentCard/Loading';
import Index from '../index';
import Layout from './layout.mobile';

export default memo(() => {
  const [isLoading, setLoading] = useState(true);
  const [isGenerating, setGenerating] = useState(false);
  const [showType, setShowType] = useState(1);

  useEffectAfterGlobalHydrated(() => {
    setLoading(false);
  });

  return (
    <Layout isGenerating={isGenerating} setGenerating={setGenerating}>
      <Index />
      <Segmented
        onChange={(value) => {
          setShowType(Number(value)); // string
        }}
        options={[
          { label: '我的绘画', value: 1 },
          { label: '灵感发现', value: 2 },
        ]}
        style={{ marginBottom: '20px' }}
        value={showType}
      />
      {isLoading ? (
        <Loading />
      ) : showType === 1 ? (
        <AgentCard
          CardRender={SpotlightCard as FC<SpotlightCardProps>}
          isGenerating={isGenerating}
          mobile
          setGenerating={setGenerating}
        />
      ) : (
        <MidTem mobile />
      )}
    </Layout>
  );
});
