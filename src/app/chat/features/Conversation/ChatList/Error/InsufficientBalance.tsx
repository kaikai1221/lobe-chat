import { RenderErrorMessage } from '@lobehub/ui';
import { Button } from 'antd';
import { memo, useState } from 'react';

import PayModal from '@/components/PayModal/index';
import PlanModal from '@/components/PayModal/plan';

import { ErrorActionContainer } from './style';

const InvalidAccess: RenderErrorMessage['Render'] = memo(({ id }) => {
  console.log(id);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  return (
    <ErrorActionContainer>
      <p>套餐内不包含当前使用模型且积分余额不足请先充值或购买套餐</p>
      <div style={{ fontSize: '12px' }}>
        注：因回复字数不能确定，以防超出剩余积分
        <p>- gpt3系列模型至少预留当前输入(token/100+20)积分可以使用</p>
        <p>- gpt4系列模型至少预留当前输入(token/2+2000)积分可以使用</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-evenly', width: '100%' }}>
        <Button
          onClick={() => {
            setIsPayOpen(true);
          }}
          size="small"
          style={{ marginLeft: '10px' }}
          type="primary"
        >
          充值积分
        </Button>
        <Button
          onClick={() => {
            setIsPlanOpen(true);
          }}
          size="small"
          type="primary"
        >
          购买套餐
        </Button>
      </div>

      <PayModal
        onOpenChange={(e) => {
          setIsPayOpen(e);
        }}
        open={isPayOpen}
      />
      {isPlanOpen && (
        <PlanModal
          onOpenChange={(e) => {
            setIsPlanOpen(e);
          }}
          open={isPlanOpen}
        />
      )}
    </ErrorActionContainer>
  );
});

export default InvalidAccess;
