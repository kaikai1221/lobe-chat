import { Icon } from '@lobehub/ui';
import { InputNumber, Modal, Radio, Spin, message } from 'antd';
import isEqual from 'fast-deep-equal';
import { CreditCard } from 'lucide-react';
import Image from 'next/image';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { settingsSelectors, useGlobalStore } from '@/store/global';

import WechatPay from './wechatPay.svg';

interface DataStyleModalProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  width?: number;
}
// 获取用户代理字符串
const userAgent = navigator.userAgent;

// 使用正则表达式匹配常见的移动设备用户代理字符串
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|micromessenger/i;
let isMobile = mobileRegex.test(userAgent);
if (isMobile) {
  // 微信也当作pc处理
  const isWeChatBrowser = /micromessenger/.test(userAgent.toLowerCase());
  isMobile = !isWeChatBrowser;
}
const DataStyleModal = memo<DataStyleModalProps>(({ onOpenChange, open, width = 550 }) => {
  const [value, setValue] = useState(1);
  const settings = useGlobalStore(settingsSelectors.currentSettings, isEqual);
  const [QRcode, setQRcode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const getQRcode = async () => {
    if (loading) return;
    setLoading(true);
    let newWindow: Window | null = null;
    if (isMobile) {
      newWindow = window.open()!;
    }
    const res = await fetch('/api/user/pay', {
      body: JSON.stringify({
        price: value,
        type: 1,
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
  return (
    <Modal
      cancelText="关闭"
      centered
      closable={false}
      okText={loading ? '正在拉取支付' : '确定'}
      onCancel={() => onOpenChange(false)}
      onOk={getQRcode}
      open={open}
      title={
        <Flexbox gap={8} horizontal>
          <Icon icon={CreditCard} />
          充值积分
        </Flexbox>
      }
      width={width}
    >
      <div>
        <p style={{ margin: '10px 0' }}>
          1 元等于1000积分，实际到账：{(value * 1000).toFixed(0)}积分
        </p>
        <Radio.Group
          onChange={(e) => setValue(e.target.value)}
          style={{ marginBottom: '10px' }}
          value={value}
        >
          <Radio.Button value={1}>1元</Radio.Button>
          <Radio.Button value={5}>5元</Radio.Button>
          {/* <Radio.Button value={10}>10元</Radio.Button> */}
          <Radio.Button value={20}>20元</Radio.Button>
          <Radio.Button value={50}>50元</Radio.Button>
          <Radio.Button value={100}>100元</Radio.Button>
        </Radio.Group>
        <InputNumber
          addonAfter="￥"
          addonBefore="自定义金额"
          defaultValue={1}
          max={9999}
          min={1}
          onChange={(e) => setValue(e || 1)}
          precision={0}
          step="1"
          style={{ width: 300 }}
          value={value}
        />
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
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <div style={{ marginBottom: '10px' }}>
              <Image alt="微信支付" src={WechatPay} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p>使用微信扫码，或长按识别二维码</p>
              <p>或者保存到相册后使用微信扫码识别</p>
              <Image alt="微信支付" height={200} src={QRcode} width={200} />
            </div>
          </div>
        )}
        {isMobile && <p>请使用微信外部浏览器调起微信支付</p>}
      </div>
    </Modal>
  );
});

export default DataStyleModal;
