import { CloseCircleOutlined } from '@ant-design/icons';
import { EmptyCard } from '@lobehub/ui';
import { Carousel } from 'antd';
import { css, cx, useThemeMode } from 'antd-style';
import isEqual from 'fast-deep-equal';
import React, { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { imageUrl } from '@/const/url';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useGlobalStore } from '@/store/global';
import { ChatTopic } from '@/types/topic';

import { Placeholder, SkeletonList } from './SkeletonList';
import TopicItem from './TopicItem';

const container = css`
  > div {
    padding-inline: 8px;
  }
`;
const close = css`
  cursor: pointer;

  position: absolute;
  top: 6px;
  right: 6px;

  font-size: 18px;
  color: #bbb;

  transition: all 0.2s;

  &:hover {
    scale: 1.2 !important;
    color: #ddd;
  }
`;

export const Topic = memo(() => {
  const { t } = useTranslation('chat');
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { isDarkMode } = useThemeMode();
  const clientWidth = document.body.clientWidth;
  const [isShowAd, setisShowAd] = useState(true);
  const [topicsInit, activeTopicId, topicLength] = useChatStore((s) => [
    s.topicsInit,
    s.activeTopicId,
    topicSelectors.currentTopicLength(s),
  ]);
  const [visible, updateGuideState] = useGlobalStore((s) => [
    s.preference.guide?.topic,
    s.updateGuideState,
  ]);

  const topics = useChatStore(
    (s) => [
      {
        favorite: false,
        id: 'default',
        title: t('topic.defaultTitle'),
      } as ChatTopic,
      ...topicSelectors.displayTopics(s),
    ],
    isEqual,
  );

  const itemContent = useCallback(
    (index: number, { id, favorite, title }: ChatTopic) =>
      index === 0 ? (
        <TopicItem active={!activeTopicId} fav={favorite} title={title} />
      ) : (
        <TopicItem active={activeTopicId === id} fav={favorite} id={id} key={id} title={title} />
      ),
    [activeTopicId],
  );

  const activeIndex = topics.findIndex((topic) => topic.id === activeTopicId);

  return !topicsInit ? (
    <SkeletonList />
  ) : (
    <Flexbox gap={2} height={'100%'} style={{ marginBottom: 12 }}>
      {topicLength === 0 && (
        <Flexbox flex={1}>
          <EmptyCard
            alt={t('topic.guide.desc')}
            cover={imageUrl(`empty_topic_${isDarkMode ? 'dark' : 'light'}.webp`)}
            desc={t('topic.guide.desc')}
            height={120}
            imageProps={{
              priority: true,
            }}
            onVisibleChange={(visible) => {
              updateGuideState({ topic: visible });
            }}
            style={{ marginBottom: 6 }}
            title={t('topic.guide.title')}
            visible={visible}
            width={200}
          />
        </Flexbox>
      )}
      {topicLength !== 0 && isShowAd && clientWidth > 600 && (
        <Flexbox flex={1}>
          <Carousel
            dots={false}
            style={{ padding: '10px', position: 'relative', textAlign: 'center', width: '100%' }}
          >
            <div>
              <CloseCircleOutlined
                className={cx(close)}
                onClick={(e) => {
                  e.preventDefault();
                  setisShowAd(false);
                }}
              />
              <a
                href="https://www.biguo.cn/details/652f4d7962a5e12b4c06cf50"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', width: 'fit-content' }}
                target="_blank"
              >
                <img
                  alt="大头ai课"
                  src={imageUrl('ad_big.jpg')}
                  style={{ borderRadius: '5px', maxHeight: '215px', maxWidth: '100%' }}
                />
              </a>
            </div>
          </Carousel>
        </Flexbox>
      )}
      <Virtuoso
        className={cx(container)}
        components={{ ScrollSeekPlaceholder: Placeholder }}
        computeItemKey={(_, item) => item.id}
        data={topics}
        fixedItemHeight={44}
        initialTopMostItemIndex={Math.max(activeIndex, 0)}
        itemContent={itemContent}
        overscan={44 * 10}
        ref={virtuosoRef}
        scrollSeekConfiguration={{
          enter: (velocity) => Math.abs(velocity) > 350,
          exit: (velocity) => Math.abs(velocity) < 10,
        }}
      />
    </Flexbox>
  );
});
