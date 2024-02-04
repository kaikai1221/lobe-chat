'use client';

import { SpotlightCard, SpotlightCardProps } from '@lobehub/ui';
import { Segmented } from 'antd';
import dynamic from 'next/dynamic';
import { FC, memo, useState } from 'react';

import AgentCard from '@/app/aiImage/features/AgentCard';
import MidTem from '@/app/aiImage/features/MidTem';
import ResponsiveIndex from '@/components/ResponsiveIndex';
import { useEffectAfterGlobalHydrated } from '@/store/global';

import Loading from '../features/AgentCard/Loading';
import Index from '../index';
import Layout from './layout.desktop';

const Mobile: FC = dynamic(() => import('../(mobile)'), { ssr: false }) as FC;

export default memo(() => {
  const [isLoading, setLoading] = useState(true);
  const [isGenerating, setGenerating] = useState(false);
  const [showType, setShowType] = useState(1);
  useEffectAfterGlobalHydrated(() => {
    setTimeout(() => {
      setLoading(false);
    }, 100);
  });

  return (
    <ResponsiveIndex Mobile={Mobile}>
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
    </ResponsiveIndex>
  );
});
