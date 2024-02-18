import { ActionIconGroup, Image, ImageGallery, SpotlightCardProps } from '@lobehub/ui';
import { Button, Card, Modal, Progress, Skeleton, Tooltip, message } from 'antd';
import { createStyles } from 'antd-style';
import copy from 'copy-to-clipboard';
import { Copy, Download, RotateCw, Trash2, ZoomIn } from 'lucide-react';
// import dynamic from 'next/dynamic';
// import Macy from 'macy';
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
    position: relative;
    z-index: 1;
    background-color: ${token.colorBgContainer};
  `,
  promptText: css`
    overflow: hidden;

    /* 三行显示省略号 */
    display: box;
    -webkit-box-orient: vertical;

    margin: 5px 0;

    color: ${token.colorText};
    word-break: break-all;

    -webkit-line-clamp: 2;
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
  CardRender: FC<SpotlightCardProps>;
  isGenerating: boolean;
  mobile?: boolean;
  setGenerating: (data: boolean) => void;
}
let Macy: any = function () {};

if (typeof window !== 'undefined') {
  Macy = require('macy');
}

function HistoryMasonry(props: {
  changeImage: (prompt: string, content: string) => Promise<boolean | undefined>;
  chatHistory: {
    content: string;
    createdAt: string;
    id: string;
    load?: boolean;
    modelName: string;
    prompt?: string;
  }[];
  getList: () => Promise<any>;
}) {
  const data = props.chatHistory || [];
  const { styles } = useStyles();
  const [modal, contextHolder] = Modal.useModal();
  const [actioning, setActioning] = useState(false);
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
  const actionList = {
    copy: {
      fun: async (data: any) => {
        copy(data.prompt);
        message.success('复制成功');
      },
      icon: Copy,
      label: '复制指令',
    },
    delete: {
      fun: async (data: any, id: string) => {
        await modal.confirm({
          cancelText: '取消',
          content: (
            <>
              <div>将删除以下图片，删除后无法恢复，请谨慎操作</div>
              <Image
                placeholder
                src={`https://wsrv.nl/?url=${encodeURIComponent(data.imageUrl)}&w=300&output=jpg&il`}
              />
            </>
          ),
          okText: '确定',
          onOk: async () => {
            const res = await fetch('/api/user/img-del', {
              body: JSON.stringify({
                id,
              }),
              cache: 'no-store',
              headers: {
                [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings?.token || '',
              },
              method: 'POST',
            });
            const resData = await res.json();
            if (resData.status === serverStatus.success) {
              await props.getList();
              message.success('删除成功');
            }
          },
          title: `确定删除`,
        });
      },
      icon: Trash2,
      label: '删除',
    },
    download: {
      fun: async (data: any) => {
        const imgUrl = data.imageUrl.replace('cdn.discordapp.com', 'd2ergsujxocdzc.cloudfront.net'); // 图片链接
        const a = document.createElement('a');
        // 这里是将url转成blob地址，
        await fetch(imgUrl) // 跨域时会报错
          .then((res) => res.blob())
          .then((blob) => {
            // 将链接地址字符内容转变成blob地址
            a.href = URL.createObjectURL(blob);
            a.download = data.prompt + '.png'; // 下载文件的名字
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
    refresh: {
      fun: async (data: any) => {
        await props.changeImage(data.prompt, `${data.id} R`);
      },
      icon: RotateCw,
      key: 'refresh',
      label: '重新生成',
    },
  };

  const [masonry, setMasonry] = useState<null | {
    reInit: () => void;
    recalculate: (data?: boolean) => void;
    runOnImageLoad: (data: () => void) => void;
  }>(null);
  const clickAction = async (key: any, data: any, id: string) => {
    if (actioning) {
      return message.warning('有正在执行的操作请稍后再试');
    }
    setActioning(true);
    await actionList[key.key as keyof typeof actionList].fun(data, id);
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
                promptText = promptText + ' ' + val;
              }
            });
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
                      if (content.action !== 'UPSCALE' && !content.failReason) {
                        return Object.keys(actionList).map((key) => {
                          return {
                            icon: actionList[key as keyof typeof actionList].icon,
                            key,
                            label: actionList[key as keyof typeof actionList].label,
                          };
                        });
                      } else if (content.failReason) {
                        return Object.keys(actionList)
                          .filter((key) => key !== 'refresh' && key !== 'download')
                          .map((key) => {
                            return {
                              icon: actionList[key as keyof typeof actionList].icon,
                              key,
                              label: actionList[key as keyof typeof actionList].label,
                            };
                          });
                      } else {
                        return Object.keys(actionList)
                          .filter((key) => key !== 'refresh')
                          .map((key) => {
                            return {
                              icon: actionList[key as keyof typeof actionList].icon,
                              key,
                              label: actionList[key as keyof typeof actionList].label,
                            };
                          });
                      }
                    })()}
                    onActionClick={(key) => clickAction(key, content, item.id)}
                    style={{ justifyContent: 'flex-end' }}
                    type="pure"
                  />
                  <Image
                    onLoad={() => masonry?.recalculate(true)}
                    placeholder
                    preview={{
                      src: (content.imageUrl || '').replace(
                        'cdn.discordapp.com',
                        'd2ergsujxocdzc.cloudfront.net',
                      ),
                    }}
                    src={`https://wsrv.nl/?url=${encodeURIComponent(content.imageUrl)}&w=300&output=jpg&il`}
                  />
                </ImageGallery>
                {content.progress === '100%' ? (
                  ''
                ) : (
                  <Progress
                    percent={Number((content.progress || '0%').replace('%', ''))}
                    status="active"
                    strokeColor={{ from: '#108ee9', to: '#87d068' }}
                  />
                )}
                <div style={{ display: 'flex' }}>
                  <ImageGallery>
                    {promptImg.length
                      ? promptImg.map((item: string, index: number) => {
                          return (
                            <Image
                              className={styles.thumbImg}
                              height={30}
                              key={index}
                              minSize={30}
                              onLoad={() => masonry?.recalculate(true)}
                              placeholder
                              preview={{
                                src: `https://wsrv.nl/?url=${encodeURIComponent(item)}&output=jpg&il`,
                              }}
                              src={`https://wsrv.nl/?url=${encodeURIComponent(item)}&w=60&output=jpg&il`}
                              style={{ margin: '0 10px 0 0', width: '30px' }}
                              width={30}
                            />
                          );
                        })
                      : null}
                  </ImageGallery>
                </div>

                <Tooltip title={promptText || item.prompt}>
                  <p className={styles.promptText}>{promptText || item.prompt}</p>
                </Tooltip>
                <p className={styles.description}>{new Date(item.createdAt).toLocaleString()}</p>
                {content.action !== 'UPSCALE' && !content.failReason ? (
                  <>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                    >
                      {upscale.list.map((actionItem) => (
                        <Tooltip
                          key={actionItem}
                          placement="topLeft"
                          title={upscale.desc(actionItem)}
                        >
                          <Button
                            onClick={async () =>
                              await props.changeImage(
                                content.prompt,
                                `${content.id} ${upscale.action}${actionItem}`,
                              )
                            }
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
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                    >
                      {variation.list.map((actionItem) => (
                        <Tooltip
                          key={actionItem}
                          placement="topLeft"
                          title={variation.desc(actionItem)}
                        >
                          <Button
                            onClick={async () =>
                              await props.changeImage(
                                content.prompt,
                                `${content.id} ${variation.action}${actionItem}`,
                              )
                            }
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
                  </>
                ) : (
                  ''
                )}
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
      {!useGlobalStore.getState().settings?.token && (
        <p style={{ textAlign: 'center', width: '100%' }}>
          请先 <a href="/settings/user">登录</a>{' '}
        </p>
      )}
      {useGlobalStore.getState().settings?.token && data.length === 0 && (
        <p style={{ textAlign: 'center', width: '100%' }}>暂无历史记录</p>
      )}
      <div>{contextHolder}</div>
    </div>
  );
}

const AgentCard = memo<aiImageProps>(({ mobile, isGenerating, setGenerating }) => {
  const router = useRouter();
  const [getting, setGetting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { settings } = useGlobalStore.getState();
  const [chatHistory, setChatHistory] = useState<
    {
      content: string;
      createdAt: string;
      id: string;
      modelName: string;
    }[]
  >([]);
  let { data = { body: [] }, isLoading } = useSWR<{
    body: [
      {
        content: string;
        createdAt: string;
        id: string;
        modelName: string;
      },
    ];
    status: number;
  }>(settings.token ? '/api/user/chat-history' : '', async () => {
    const res = await fetch(`/api/user/chat-history`, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
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
  const getList = async () => {
    const res = await fetch(`/api/user/chat-history`, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings?.token || '',
      },
      method: 'GET',
    });
    const data: {
      body: [
        {
          content: string;
          createdAt: string;
          id: string;
          modelName: string;
        },
      ];
    } = (await res?.clone().json()) || { body: [] };
    setChatHistory(data.body);
    setGenerating(
      data.body?.some((item) => {
        const { status } = JSON.parse(item.content || '{}');
        if (status && status !== 'SUCCESS' && status !== 'FAILURE') {
          return true;
        } else if (!status) {
          return true;
        } else {
          return false;
        }
      }),
    );
    return data;
  };
  const GetStatus = async (setFun: (data: any) => void, time?: number) => {
    setGetting(true);
    const data = await getList();
    if (
      data.body.length &&
      data.body?.some((item) => {
        const { status } = JSON.parse(item.content || '{}');
        if (status && status !== 'SUCCESS' && status !== 'FAILURE') {
          return true;
        } else if (!status) {
          return true;
        } else {
          return false;
        }
      })
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
    if (
      data.body.length &&
      data.body?.some((item) => {
        const { status } = JSON.parse(item.content || '{}');
        if (status && status !== 'SUCCESS' && status !== 'FAILURE') {
          return true;
        } else if (!status) {
          return true;
        } else {
          return false;
        }
      })
    ) {
      setTimeout(() => {
        GetStatus(setChatHistory);
      }, 2000);
    }
  }, [data.body?.length]);
  useEffect(() => {
    if (isGenerating && !getting) {
      GetStatus(setChatHistory, 3000);
    }
  }, [isGenerating, getting]);

  const changeImage = async (prompt: string, content: string) => {
    if (isGenerating) return message.warning('有正在生成的图片，请稍等');
    setGenerating(true);
    setGetting(true);
    messageApi.open({ content: '正在处理请稍等...', duration: 0, type: 'loading' });
    const res = await fetch('/api/user/mj/ai/draw/mj/simple-change', {
      body: JSON.stringify({
        content,
        model: 'midjourney',
        prompt,
      }),
      cache: 'no-store',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings?.token || '',
      },
      method: 'POST',
    });
    setGetting(false);
    const resData = await res?.clone().json();
    messageApi.destroy();
    if (res?.status === 200 && resData.code === 0) {
      sessionStorage.setItem('aiImagePrompt', '');
      message.success('正在生成，请稍等');
    } else {
      setGenerating(false);
      message.warning(resData.msg);
    }
  };
  if (isLoading) return <Loading />;

  return (
    <Flexbox>
      <div style={{ padding: mobile ? '0' : '20px' }}>
        {contextHolder}
        <HistoryMasonry changeImage={changeImage} chatHistory={chatHistory} getList={getList} />
      </div>
    </Flexbox>
  );
});

export default AgentCard;
