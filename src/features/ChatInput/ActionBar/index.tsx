import { ChatInputActionBar } from '@lobehub/ui';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { ReactNode, memo, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ActionKeys, actionMap, getLeftActionList, getRightActionList } from './config';

const tourMap = {
  history: 'ref1',
  token: 'ref2',
  tools: 'ref3',
};
const RenderActionList = ({ dataSource, refMap }: { dataSource: ActionKeys[]; refMap: any }) => (
  <>
    {dataSource.map((key) => {
      const Render = actionMap[key];
      // console.log(tourMap[key as keyof typeof tourMap]? refMap[tourMap[key as keyof typeof tourMap]] :undefined)
      return (
        <Render
          key={key}
          refT={
            tourMap[key as keyof typeof tourMap]
              ? refMap[tourMap[key as keyof typeof tourMap]]
              : undefined
          }
        />
      );
    })}
  </>
);

export interface ActionBarProps {
  leftAreaEndRender?: ReactNode;
  leftAreaStartRender?: ReactNode;
  mobile?: boolean;
  padding?: number | string;
  rightAreaEndRender?: ReactNode;
  rightAreaStartRender?: ReactNode;
}

const ActionBar = memo<ActionBarProps>(
  ({
    padding = '0 16px',
    mobile,
    rightAreaStartRender,
    rightAreaEndRender,
    leftAreaStartRender,
    leftAreaEndRender,
  }) => {
    const leftActionList = useMemo(() => getLeftActionList(mobile), [mobile]);
    const rightActionList = useMemo(() => getRightActionList(mobile), [mobile]);
    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null);
    const [open, setOpen] = useState<boolean>(false);
    const steps: TourProps['steps'] = [
      {
        description:
          '如果使用积分模式使用gpt，携带历史消息数越多消耗的积分越多，具体看模板价格说明，如果不携带历史消息gpt将无法记住之前的对话内容，请谨慎选择',
        nextButtonProps: { children: '下一步' },
        style: { maxWidth: '80%' },
        target: () => ref1.current,
        title: '请注意！',
      },
      {
        description:
          '这里的数字为当前会话还可输入多少字符数（token）,一个汉字约等于2个字符数（token），与携带历史消息数和使用的模型有关，不同的模型最大token数不同，携带的历史消息数越多，可输入的字符越少',
        nextButtonProps: { children: '下一步' },
        style: { maxWidth: '80%' },
        target: () => ref2.current,
        title: '请注意！',
      },
      {
        description:
          '在这里可以进入插件市场，安装后勾选即可使用各种插件包括爬虫、论文、天气等等，详情可点进去查看',
        nextButtonProps: { children: '知道了' },
        style: { maxWidth: '80%' },
        target: () => ref3.current,
        title: '请注意！',
      },
    ];
    useLayoutEffect(() => {
      if (localStorage.getItem('tour') && localStorage.getItem('tour') === '2') {
        setOpen(false);
      } else {
        setOpen(true);
      }
    });
    return (
      <>
        <ChatInputActionBar
          leftAddons={
            <>
              {leftAreaStartRender}
              <RenderActionList dataSource={leftActionList} refMap={{ ref1, ref2, ref3 }} />
              {leftAreaEndRender}
            </>
          }
          padding={padding}
          rightAddons={
            <>
              {rightAreaStartRender}
              <RenderActionList dataSource={rightActionList} refMap={{ ref1, ref2, ref3 }} />
              {rightAreaEndRender}
            </>
          }
        />
        <Tour
          onClose={() => {
            localStorage.setItem('tour', '2');
            setOpen(false);
          }}
          open={open}
          steps={steps}
        />
      </>
    );
  },
);

export default ActionBar;
