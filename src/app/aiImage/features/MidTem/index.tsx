import { ActionIconGroup, Image, ImageGallery } from '@lobehub/ui';
import { Card, Skeleton, Tooltip, message } from 'antd';
import { createStyles } from 'antd-style';
import copy from 'copy-to-clipboard';
import { Copy, Download } from 'lucide-react';
// import dynamic from 'next/dynamic';
// import Macy from 'macy';
import { memo, useEffect, useLayoutEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import LazyLoad from 'react-lazy-load';
import useSWR from 'swr';

import Loading from '../AgentCard/Loading';

export const useStyles = createStyles(({ css, token }) => ({
  description: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
  `,
  lazyload: css`
    position: relative;
    z-index: 1;
    background-color: ${token.colorBgContainer};
  `,
  promptText: css`
    overflow: hidden;

    /* 三行显示省略号 */
    display: box;
    display: box;
    -webkit-box-orient: vertical;

    margin: 5px 0;

    color: ${token.colorText};
    word-break: break-all;

    -webkit-line-clamp: 4;
  `,
  skeletonImage: css`
    width: 100% !important;
  `,
  thumbImg: css`
    width: 30px !important;
    min-width: 30px !important;
    height: 30px !important;
    min-height: 30px !important;
  `,
}));
export interface aiImageProps {
  mobile?: boolean;
}
let Macy: any = function () {};

if (typeof window !== 'undefined') {
  Macy = require('macy');
}

function HistoryMasonry(props: {
  chatHistory: {
    batch_size: number;
    enqueue_time: string;
    event_type: string;
    full_command: string;
    height: number;
    id: string;
    job_type: string;
    liked_by_user: boolean;
    parent_grid: number;
    parent_id: string;
    parsed_version: string;
    published: boolean;
    service: string;
    shown: boolean;
    user_id: string;
    username: string;
    width: number;
  }[];
}) {
  const data = props.chatHistory || [];
  const { styles } = useStyles();
  const [actioning, setActioning] = useState(false);
  const actionList = {
    copy: {
      fun: async (data: any) => {
        copy(data.full_command);
        message.success('复制成功');
      },
      icon: Copy,
      label: '复制指令',
    },
    download: {
      fun: async (data: any) => {
        const imgUrl = `https://cdn.midjourney.com/${data.parent_id}/0_${data.parent_grid}.png`; // 图片链接
        const a = document.createElement('a');
        // 这里是将url转成blob地址，
        await fetch(imgUrl) // 跨域时会报错
          .then((res) => res.blob())
          .then((blob) => {
            // 将链接地址字符内容转变成blob地址
            a.href = URL.createObjectURL(blob);
            a.download = data.full_command + '.png'; // 下载文件的名字
            document.body.append(a);
            a.click();
            //在资源下载完成后 清除 占用的缓存资源
            window.URL.revokeObjectURL(a.href);
            a.remove();
          });
      },
      icon: Download,
      label: '下载',
    },
  };

  const [masonry, setMasonry] = useState<null | {
    reInit: () => void;
    recalculate: (data?: boolean) => void;
    runOnImageLoad: (data: () => void) => void;
  }>(null);
  const clickAction = async (key: any, data: any) => {
    if (actioning) {
      return message.warning('有正在执行的操作请稍后再试');
    }
    setActioning(true);
    await actionList[key.key as keyof typeof actionList].fun(data);
    setActioning(false);
  };
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
    if (data.length && typeof window === 'object') getMacy();
  });
  return (
    <div className="masonry-wrap">
      {data.map((item, index) => {
        let promptImg: string[] = [];
        if (item.full_command) {
          const splitArr = item.full_command?.split('https://');
          if (splitArr.length > 1) {
            for (const item of splitArr) {
              if (item && item.includes('/')) {
                promptImg.push(`https://${item.split(' ')[0]}`);
              }
            }
          }
        }
        return (
          <Card
            bodyStyle={{ padding: '5px 15px', position: 'relative' }}
            hoverable
            key={index}
            style={{ minHeight: '210px', transition: 'all 0.3s' }}
          >
            <LazyLoad className={styles.lazyload}>
              <div>
                <ImageGallery>
                  <ActionIconGroup
                    items={(() => {
                      return Object.keys(actionList).map((key) => {
                        return {
                          icon: actionList[key as keyof typeof actionList].icon,
                          key,
                          label: actionList[key as keyof typeof actionList].label,
                        };
                      });
                    })()}
                    onActionClick={(key) => clickAction(key, item)}
                    style={{ justifyContent: 'flex-end' }}
                    type="pure"
                  />
                  <Image
                    onLoad={() => masonry?.recalculate(true)}
                    placeholder
                    preview={{
                      src: `https://cdn.midjourney.com/${item.parent_id}/0_${item.parent_grid}.webp`,
                    }}
                    src={`https://cdn.midjourney.com/${item.parent_id}/0_${item.parent_grid}_384_N.webp?method=shortest&qst=6&quality=50`}
                  />
                </ImageGallery>
                <div style={{ display: 'flex' }}>
                  <ImageGallery>
                    {promptImg.length
                      ? promptImg.map((item: string, index: number) => {
                          return (
                            <Image
                              className={styles.thumbImg}
                              fallback={item}
                              height={30}
                              key={index}
                              minSize={30}
                              onLoad={() => masonry?.recalculate(true)}
                              placeholder
                              preview={{
                                src: item,
                              }}
                              src={`https://wsrv.nl/?url=${item}&w=60&output=jpg&il`}
                              style={{ margin: '0 10px 0 0', width: '30px' }}
                              width={30}
                            />
                          );
                        })
                      : null}
                  </ImageGallery>
                </div>

                <Tooltip title={item.full_command}>
                  <p className={styles.promptText}>{item.full_command}</p>
                </Tooltip>
                <p className={styles.description}>{new Date(item.enqueue_time).toLocaleString()}</p>
              </div>
            </LazyLoad>
            <div
              style={{
                left: '0',
                padding: '15px',
                position: 'absolute',
                top: '0',
                width: '100%',
              }}
            >
              <Skeleton.Image active className={styles.skeletonImage} />
              <Skeleton.Input active size="small" style={{ margin: '10px 0' }} />
              <Skeleton.Input active block size="small" />
            </div>
          </Card>
        );
      })}
      {data.length === 0 && <p style={{ textAlign: 'center', width: '100%' }}>暂无历史记录</p>}
    </div>
  );
}

const AgentCard = memo<aiImageProps>(({ mobile }) => {
  const [chatHistory, setChatHistory] = useState<
    {
      batch_size: number;
      enqueue_time: string;
      event_type: string;
      full_command: string;
      height: number;
      id: string;
      job_type: string;
      liked_by_user: boolean;
      parent_grid: number;
      parent_id: string;
      parsed_version: string;
      published: boolean;
      service: string;
      shown: boolean;
      user_id: string;
      username: string;
      width: number;
    }[]
  >([]);
  let { data = { body: [] }, isLoading } = useSWR<{
    body: [
      {
        batch_size: number;
        enqueue_time: string;
        event_type: string;
        full_command: string;
        height: number;
        id: string;
        job_type: string;
        liked_by_user: boolean;
        parent_grid: number;
        parent_id: string;
        parsed_version: string;
        published: boolean;
        service: string;
        shown: boolean;
        user_id: string;
        username: string;
        width: number;
      },
    ];
    status: number;
  }>('/api/user/mid-tem', async () => {
    const res = await fetch(`/api/user/mid-tem`, {
      cache: 'no-cache',
      method: 'GET',
    });
    return await res?.json();
  });
  useEffect(() => {
    // console.log(JSON.parse(data?.body) )
    setChatHistory([...(Array.isArray(data?.body) ? data.body : [])]);
  }, [data.body?.length]);

  if (isLoading) return <Loading />;

  return (
    <Flexbox>
      <div style={{ padding: mobile ? '0' : '20px' }}>
        <HistoryMasonry chatHistory={chatHistory} />
      </div>
    </Flexbox>
  );
});

export default AgentCard;
