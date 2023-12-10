import { CaretRightOutlined } from '@ant-design/icons';
import { Icon } from '@lobehub/ui';
import { Button, Collapse, Modal, Segmented, Spin, message, theme } from 'antd';
import type { CollapseProps } from 'antd';
import isEqual from 'fast-deep-equal';
import { CreditCard } from 'lucide-react';
import Image from 'next/image';
import React, { memo, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import useSWR from 'swr';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { Plan, Price } from '@/prismaClient/serverStatus';
import { settingsSelectors, useGlobalStore } from '@/store/global';

import WechatPay from './wechatPay.svg';

interface DataStyleModalProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  width?: number;
}
// global.navigator={ userAgent: 'node.js', };
// 获取用户代理字符串
const userAgent = global.navigator?.userAgent || '';

// 使用正则表达式匹配常见的移动设备用户代理字符串
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|micromessenger/i;
let isMobile = mobileRegex.test(userAgent);
if (isMobile) {
  // 微信也当作pc处理
  const isWeChatBrowser = /micromessenger/.test(userAgent.toLowerCase());
  isMobile = !isWeChatBrowser;
}
const ListItem = (props: { getQRcode: (plan: Plan, price: Price) => void; item: Plan }) => {
  const [pricesItem, setPricesItem] = useState(props.item.prices[0]);
  return (
    <div>
      <Segmented
        onChange={(e) => setPricesItem(props.item.prices.find((v) => v.id === e)!)}
        options={props.item.prices.map((p) => ({ label: p.name, value: p.id }))}
      />
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '10px',
        }}
      >
        <div>
          {props.item.features.map((v, i) => (
            <p key={i}>{v}</p>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '16px', fontWeight: 'bolder' }}>
            {(pricesItem.amount / 100).toFixed(2)}元
          </p>
          <Button onClick={() => props.getQRcode(props.item, pricesItem)} size="small">
            购买
          </Button>
        </div>
      </div>
    </div>
  );
};
const DataStyleModal = memo<DataStyleModalProps>(({ onOpenChange, open, width = 550 }) => {
  const { token } = theme.useToken();
  const settings = useGlobalStore(settingsSelectors.currentSettings, isEqual);
  const [QRcode, setQRcode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [planList, setPlanList] = useState<CollapseProps['items']>([]);
  const panelStyle: React.CSSProperties = {
    background: token.colorFillAlter,
    border: 'none',
    borderRadius: token.borderRadiusLG,
    marginBottom: 24,
  };
  const { data, isLoading = true } = useSWR('/api/user/plan', async () => {
    const res = await fetch('/api/user/plan', {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'GET',
    });
    return await res.json();
  });
  const getQRcode = async (plan: Plan, price: Price) => {
    if (loading) return;
    setLoading(true);
    let newWindow: Window | null = null;
    if (isMobile) {
      newWindow = window.open()!;
    }
    const res = await fetch('/api/user/pay', {
      body: JSON.stringify({
        planId: plan.planId,
        priceId: price.id,
      }),
      cache: 'no-store',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'POST',
    });
    const data = await res.json();
    if (isMobile) {
      newWindow!.location.href = data.data;
    }
    if (data.code === 0) {
      setQRcode(data.data.QRcode_url);
    } else {
      message.error(data.msg);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (data?.plans)
      setPlanList(
        data?.plans
          .filter((item: Plan) => item.features.length)
          .map((item: Plan) => {
            return {
              children: <ListItem getQRcode={getQRcode} item={item} />,
              extra: <Button size="small">点击展开</Button>,
              key: item.planId,
              label: item.name,
              style: panelStyle,
            };
          }) || [],
      );
  }, [data]);
  return (
    <Modal
      cancelText="关闭"
      centered
      closable={false}
      okText={QRcode ? '完成支付' : '确定'}
      onCancel={() => onOpenChange(false)}
      onOk={() => onOpenChange(false)}
      open={open}
      title={
        <Flexbox gap={8} horizontal>
          <Icon icon={CreditCard} />
          购买套餐
        </Flexbox>
      }
      width={width}
    >
      {loading && (
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            height: '200%',
            justifyContent: 'center',
            margin: '10px 0',
            width: '100%',
          }}
        >
          <p style={{ width: '100%' }}>正在加载二维码，请稍等...</p>
          <Spin />
        </div>
      )}
      {QRcode && (
        <div style={{ marginBottom: '10px', marginTop: '15px', textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>
            <Image alt="微信支付" src={WechatPay} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p>使用微信扫码，或长按识别二维码</p>
            <p>或者保存到相册后使用微信扫码识别</p>
            <p>支付后请刷新页面</p>
            <Image alt="微信支付" height={200} src={QRcode} width={200} />
          </div>
        </div>
      )}
      {isMobile && <p>请使用微信外部浏览器调起微信支付</p>}
      {isLoading ? (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <Spin />
        </div>
      ) : (
        <Collapse
          bordered={false}
          defaultActiveKey={[data?.plans.find((item: Plan) => item.features.length).planId]}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          items={planList}
          style={{ background: token.colorBgContainer }}
        />
      )}
    </Modal>
  );
});

export default DataStyleModal;
