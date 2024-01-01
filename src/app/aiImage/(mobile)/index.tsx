'use client';

import { SpotlightCard, SpotlightCardProps } from '@lobehub/ui';
import { FC, memo, useState } from 'react';

import AgentCard from '@/app/aiImage/features/AgentCard';
import { useEffectAfterGlobalHydrated } from '@/store/global';

import Loading from '../features/AgentCard/Loading';
import Index from '../index';
import Layout from './layout.mobile';

export default memo(() => {
  const [isLoading, setLoading] = useState(true);
  const [isGenerating, setGenerating] = useState(false);

  useEffectAfterGlobalHydrated(() => {
    setTimeout(() => {
      setLoading(false);
    }, 100);
  });

  return (
    <Layout isGenerating={isGenerating} setGenerating={setGenerating}>
      <Index />
      {isLoading ? (
        <Loading />
      ) : (
        <AgentCard
          CardRender={SpotlightCard as FC<SpotlightCardProps>}
          isGenerating={isGenerating}
          mobile
          setGenerating={setGenerating}
        />
      )}
    </Layout>
  );
});
