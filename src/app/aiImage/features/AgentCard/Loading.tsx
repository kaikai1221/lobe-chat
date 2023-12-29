import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

const Loading = memo(() => {
  return (
    <Flexbox>
      <Skeleton active paragraph={{ rows: 8 }} />
    </Flexbox>
  );
});

export default Loading;
