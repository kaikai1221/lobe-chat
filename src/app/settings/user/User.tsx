import { Form, type ItemGroup } from '@lobehub/ui';
import { Form as AntForm } from 'antd';
import { Info } from 'lucide-react';
import { memo } from 'react';
import useSWR from 'swr';

import { FORM_STYLE } from '@/const/layoutTokens';

type SettingItemGroup = ItemGroup;
const User = memo(() => {
  const [form] = AntForm.useForm();
  // const [userInfo, setUserInfo] = useState({});
  const { data } = useSWR<{
    body: {
      email?: string;
      hasPassword: boolean;
      invitation: any[];
      invitationCodes: { code: string }[];
      name?: string;
      phone?: string;
      subscriptions: {
        createdAt: string;
        expiredAt: string;
        modelTimes: { [key: string]: string };
      }[];
      userLimits: {
        expiredAt: string;
        modelName: string;
        startAt: string;
        subscription: any;
        times: number;
      }[];
    };
    status: number;
  }>('/api/user/info', async () => {
    const res = await fetch('/api/user/info', {
      cache: 'no-cache',
      method: 'GET',
    });
    return await res.json();
  });
  if (data && data.status === 0 && data.body.userLimits && data.body.userLimits.length > 0) {
    const obj: { [key: string]: string } = {};
    data.body.userLimits.forEach((item: any) => {
      obj[item.modelName] = item.times;
    });
  }
  const info: SettingItemGroup = {
    children: [
      {
        children: '555',
        desc: '登录账号',
        label: '账号',
        minWidth: undefined,
      },
      {
        children: '555',
        desc: '设置密码后可使用密码登录',
        label: '密码',
        minWidth: undefined,
      },
      {
        children: '555',
        desc: '您的充值额度，1￥=1000积分',
        label: '积分',
        minWidth: undefined,
      },
      {
        children: '555',
        desc: '最长套餐有效期',
        label: '套餐有效期',
        minWidth: undefined,
      },
      {
        children: `${location.hostname.replace('www.', '')}/?code=`,
        desc: '每有一个通过您的邀请链接注册成功的用户，将使您获得7天的不限量使用额度',
        label: '邀请链接',
        minWidth: undefined,
      },
    ],
    icon: Info,
    title: '基本信息',
  };

  return <Form form={form} items={[info]} {...FORM_STYLE} />;
});

export default User;
