'use client';

import { SpotlightCard, SpotlightCardProps } from '@lobehub/ui';
import dynamic from 'next/dynamic';
import { FC, memo, useState } from 'react';

import AgentCard from '@/app/aiImage/features/AgentCard';
import ResponsiveIndex from '@/components/ResponsiveIndex';
import { useEffectAfterGlobalHydrated } from '@/store/global';

import Loading from '../features/AgentCard/Loading';
import Index from '../index';
import Layout from './layout.desktop';

const Mobile: FC = dynamic(() => import('../(mobile)'), { ssr: false }) as FC;

export default memo(() => {
  const [isLoading, setLoading] = useState(true);
  const [isGenerating, setGenerating] = useState(false);

  useEffectAfterGlobalHydrated(() => {
    setTimeout(() => {
      setLoading(false);
    }, 100);
  });

  return (
    <ResponsiveIndex Mobile={Mobile}>
      <Layout isGenerating={isGenerating} setGenerating={setGenerating}>
        <Index />
        {isLoading ? (
          <Loading />
        ) : (
          <AgentCard
            CardRender={SpotlightCard as FC<SpotlightCardProps>}
            isGenerating={isGenerating}
            setGenerating={setGenerating}
          />
        )}
      </Layout>
    </ResponsiveIndex>
  );
});
