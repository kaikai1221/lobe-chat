import { ActionIconGroup, Image, ImageGallery, SpotlightCardProps } from '@lobehub/ui';
import { Button, Card, Tooltip, message } from 'antd';
import { createStyles } from 'antd-style';
import { Copy, Download, RotateCw, Trash2, ZoomIn } from 'lucide-react';
import Macy from 'macy';
import { useRouter } from 'next/navigation';
import { FC, memo, useEffect, useLayoutEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import LazyLoad from 'react-lazy-load';
import useSWR from 'swr';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { serverStatus } from '@/prismaClient/serverStatus';
import { useGlobalStore } from '@/store/global';

import Loading from './Loading';

export const useStyles = createStyles(({ css, token }) => ({
  description: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
  `,
  lazyload: css`
    min-height: 70px;
  `,
  promptText: css`
    overflow: hidden;

    /* 三行显示省略号 */
    display: box;

    margin: 5px 0;

    color: ${token.colorText};
    word-break: break-all;

    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  `,
}));
export interface aiImageProps {
  CardRender: FC<SpotlightCardProps>;
  isGenerating: boolean;
  mobile?: boolean;
  setGenerating: (data: boolean) => void;
}

function HistoryMasonry(props: {
  changeImage: (prompt: string, content: string, isBtn?: boolean) => void;
  chatHistory: {
    content: string;
    createdAt: string;
    load?: boolean;
    modelName: string;
    prompt?: string;
  }[];
}) {
  const data = props.chatHistory || [];
  const { styles } = useStyles();
  const upscale = {
    action: 'U',
    desc: (num: string) => `放大第${num}张图片`,
    icon: <ZoomIn size={14} />,
    list: ['1', '2', '3', '4'],
  };
  const variation = {
    action: 'V',
    desc: (num: string) => `变换第${num}张图片`,
    icon: <RotateCw size={14} />,
    list: ['1', '2', '3', '4'],
  };

  const [masonry, setMasonry] = useState<null | {
    reInit: () => void;
    recalculate: (data?: boolean) => void;
    runOnImageLoad: (data: () => void) => void;
  }>(null);
  const getMacy = () => {
    if (masonry) {
      //当数据更新时，会重新计算并排版
      setTimeout(() => {
        masonry.recalculate(true);
      }, 100);
      masonry.runOnImageLoad(function () {
        masonry.recalculate(true);
      });
    } else if (document.querySelector('.masonry-wrap')) {
      let macyInstance = new Macy({
        // 设置列数
        breakAt: {
          1000: 2,
          1200: 3,
          1400: 4,
          1800: 5,
          200: 1,
        },

        // 设计列与列的间距
        columns: 5,

        container: '.masonry-wrap',

        margin: { x: 10, y: 10 },

        // 图像列表容器
        trueOrder: false,

        useOwnImageLoader: false,
        waitForImages: false,
      });
      setMasonry(macyInstance);
    }
  };
  useLayoutEffect(() => {
    if (data.length) getMacy();
  });
  return (
    <div className="masonry-wrap">
      {data.map((item, index) => {
        const content = JSON.parse(item.content || '{}');
        let promptImg: string[] = [];
        let promptText = '';
        if (content.prompt) {
          if (content.prompt?.split('<https://').length > 1) {
            const arr = content.prompt.split('> ');
            arr.forEach((val: string) => {
              if (val.includes('<https://')) {
                promptImg.push(val.replace('<', ''));
              } else {
                promptText = promptText + val;
              }
            });
          } else if (content.prompt?.split('https://').length > 1) {
            const arr = content.prompt.split(' ');
            arr.forEach((val: string) => {
              if (val.includes('https://')) {
                promptImg.push(val);
              } else {
                promptText = promptText + val;
              }
            });
          }
        }
        return (
          <Card
            bodyStyle={{ padding: '5px 15px' }}
            hoverable
            key={index}
            style={{ transition: 'all 0.3s' }}
          >
            <LazyLoad className="lazyload">
              <div>
                <ImageGallery>
                  <ActionIconGroup
                    items={[
                      {
                        icon: Copy,
                        key: 'copy',
                        label: '复制指令',
                      },
                      {
                        icon: Download,
                        key: 'download',
                        label: '下载',
                      },
                      {
                        icon: RotateCw,
                        key: 'refresh',
                        label: '重新生成',
                      },
                      {
                        icon: Trash2,
                        key: 'delete',
                        label: '删除',
                      },
                    ]}
                    onActionClick={(key) => console.log(key)}
                    style={{ justifyContent: 'flex-end' }}
                    type="pure"
                  />
                  <Image
                    placeholder
                    preview={{
                      src: (content.imageUrl || '').replace(
                        'cdn.discordapp.com',
                        'd2ergsujxocdzc.cloudfront.net',
                      ),
                    }}
                    src={`https://wsrv.nl/?url=${content.imageUrl}&w=300&output=jpg&il`}
                  />
                </ImageGallery>
                <p className={styles.promptText}>{promptText || item.prompt}</p>
                <p className={styles.description}>{new Date(item.createdAt).toLocaleString()}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  {upscale.list.map((actionItem) => (
                    <Tooltip key={actionItem} placement="topLeft" title={upscale.desc(actionItem)}>
                      <Button
                        size="small"
                        style={{ alignItems: 'center', display: 'flex' }}
                        type="text"
                      >
                        {upscale.icon}
                        <p style={{ fontSize: '12px' }}>{actionItem}</p>
                      </Button>
                    </Tooltip>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  {variation.list.map((actionItem) => (
                    <Tooltip
                      key={actionItem}
                      placement="topLeft"
                      title={variation.desc(actionItem)}
                    >
                      <Button
                        size="small"
                        style={{ alignItems: 'center', display: 'flex' }}
                        type="text"
                      >
                        {variation.icon}
                        <p style={{ fontSize: '12px' }}> {actionItem} </p>
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </LazyLoad>
          </Card>
        );
      })}
    </div>
  );
}

const AgentCard = memo<aiImageProps>(({ mobile, isGenerating, setGenerating }) => {
  const router = useRouter();
  const [getting, setGetting] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    {
      content: string;
      createdAt: string;
      modelName: string;
    }[]
  >([]);
  let { data = { body: [] }, isLoading } = useSWR<{
    body: [
      {
        content: string;
        createdAt: string;
        modelName: string;
      },
    ];
    status: number;
  }>('/api/user/chat-history', async () => {
    const res = await fetch(`/api/user/chat-history`, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings.token || '',
      },
      method: 'GET',
    });
    const data = await res?.json();
    if (data.status === serverStatus.success) {
      return data;
    } else {
      setTimeout(() => {
        router.push('/settings/user');
      }, 1000);
      message.warning(data.msg);
    }
  });
  const GetStatus = async (setFun: (data: any) => void, time?: number) => {
    const res = await fetch(`/api/user/chat-history`, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings.token || '',
      },
      method: 'GET',
    });
    const data: {
      body: [
        {
          content: string;
          createdAt: string;
          modelName: string;
        },
      ];
    } = (await res?.clone().json()) || { body: [] };
    setFun(data.body);
    setGenerating(
      data.body?.some((item) => {
        const status = JSON.parse(item.content || '{}').status;
        return status !== 'SUCCESS' && status !== 'FAILURE';
      }) || false,
    );
    if (
      data.body.length &&
      (data.body?.some((item) => {
        const status = JSON.parse(item.content || '{}').status;
        return status !== 'SUCCESS' && status !== 'FAILURE';
      }) ||
        false)
    ) {
      setTimeout(() => {
        GetStatus(setFun);
      }, time || 2000);
    } else {
      setGetting(false);
    }
  };
  useEffect(() => {
    setChatHistory([...(Array.isArray(data?.body) ? data.body : [])]);
  }, [data.body?.length]);
  useEffect(() => {
    if (isGenerating && !getting) {
      GetStatus(setChatHistory, 3000);
    }
  }, [isGenerating]);

  const changeImage = async (prompt: string, content: string, isBtn?: boolean) => {
    if (isGenerating) return message.warning('有正在生成的图片，请稍等');
    const aiImagePrompt = sessionStorage.getItem('aiImagePrompt');
    if ((aiImagePrompt && aiImagePrompt.length > 0) || isBtn) {
      setGenerating(true);
      const res = await fetch('/api/user/mj/ai/draw/mj/simple-change', {
        body: JSON.stringify({
          content,
          model: 'midjourney',
          prompt,
        }),
        cache: 'no-store',
        method: 'POST',
      });
      const resData = await res?.clone().json();
      if (res?.status === 200 && resData.code === 0) {
        sessionStorage.setItem('aiImagePrompt', '');
        GetStatus(setChatHistory, 3000);
        message.success('正在生成，请稍等');
      } else {
        setGenerating(false);
        message.warning(resData.msg);
      }
    }
  };
  if (isLoading) return <Loading />;

  return (
    <Flexbox gap={mobile ? 16 : 24}>
      <div style={{ padding: '20px' }}>
        <HistoryMasonry changeImage={changeImage} chatHistory={chatHistory} />
      </div>
    </Flexbox>
  );
});

export default AgentCard;
