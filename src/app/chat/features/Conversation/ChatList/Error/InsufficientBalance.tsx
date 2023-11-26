import { RenderErrorMessage } from '@lobehub/ui';
import { memo } from 'react';

import { ErrorActionContainer } from './style';

const InvalidAccess: RenderErrorMessage['Render'] = memo(({ id }) => {
  console.log(id);

  return <ErrorActionContainer>余额不足请先充值</ErrorActionContainer>;
});

export default InvalidAccess;
