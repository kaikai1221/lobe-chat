import { RenderErrorMessage } from '@lobehub/ui';
import { memo } from 'react';

import { ErrorActionContainer } from './style';

const InvalidAccess: RenderErrorMessage['Render'] = memo(({ id }) => {
  console.log(id);

  return (
    <ErrorActionContainer>
      <p>余额不足请先充值</p>
      <p style={{ fontSize: '12px' }}>
        注：因回复字数不能确定，以防超出剩余积分
        <p>- gpt3系列模型至少预留当前输入(token/100+20)积分可以使用</p>
        <p>- gpt4系列模型至少预留当前输入(token/3000+2000)积分可以使用</p>
      </p>
    </ErrorActionContainer>
  );
});

export default InvalidAccess;
