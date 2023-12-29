'use client';

import { Form, Icon, type ItemGroup, Snippet } from '@lobehub/ui';
import { Form as AntForm, Button, Input, Modal, Segmented, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import isEqual from 'fast-deep-equal';
import {
  Info,
  KeyRound,
  KeySquare,
  List,
  LogIn,
  SquareAsterisk,
  User as UserIcon,
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import md5 from 'spark-md5';
import useSWR from 'swr';

import FullscreenLoading from '@/components/FullscreenLoading';
import PayModal from '@/components/PayModal/index';
import PlanModal from '@/components/PayModal/plan';
import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { FORM_STYLE } from '@/const/layoutTokens';
import { FormAction } from '@/features/Conversation/ChatList/Error/style';
import { serverStatus } from '@/prismaClient/serverStatus';
import { useGlobalStore } from '@/store/global';
import { useSwitchSideBarOnInit } from '@/store/global/hooks/useSwitchSettingsOnInit';
import { SettingsTabs } from '@/store/global/initialState';
import { settingsSelectors } from '@/store/global/selectors';

enum Tab {
  Code = 'code',
  Password = 'password',
}
type SettingItemGroup = { children: any; title: any } | ItemGroup;

const columns: ColumnsType<any> = [
  {
    dataIndex: 'name',
    key: 'name',
    render: (_, record) => record.phone || record.email,
    title: '账号',
  },
  {
    dataIndex: 'time',
    key: 'time',
    render: (_, record) => new Date(record.createdAt).toLocaleString(),
    title: '时间',
  },
];
const InvalidAccess = (props: { setUserInfo: (value: any) => void }) => {
  const [register, setRegister] = useState('');
  const [code, setCode] = useState('');
  const [time, setTime] = useState(0);
  const { t } = useTranslation('error');
  const [mode, setMode] = useState<Tab>(Tab.Code);
  const [submitting, setSubmitting] = useState(false);
  const [logining, setLogining] = useState(false);
  const [password, setPassword] = useState('');
  const [setSettings] = useGlobalStore((s) => [s.setSettings]);
  useEffect(() => {
    if (time > 0) {
      setTimeout(() => {
        setTime(time - 1);
      }, 1000);
    }
  }, [time]);
  const handleCode = async () => {
    if (!register) return message.warning('请输入手机号或邮箱');

    let type: 'email' | 'phone' = 'email';
    if (register.includes('@')) {
      type = 'email';
      if (!/^([\w.-])+@([\w.-])+\.([A-Za-z]{2,4})$/.test(register)) {
        message.warning('请输入正确的邮箱');
        return;
      }
    } else {
      type = 'phone';
      if (!/^1[,3-9]\d{9}$/.test(register)) {
        message.warning('请输入正确的手机号');
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch('/api/user/register/code', {
      body: JSON.stringify({
        type: type,
        value: register,
      }),
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    setSubmitting(false);
    switch (data.status) {
      case serverStatus.success: {
        setTime(60);
        return message.success('验证码发送成功，请注意查收');
      }
      case serverStatus.notExist: {
        return message.warning('新用户，请先注册');
      }
      case serverStatus.wrongPassword: {
        return message.warning('密码错误');
      }
      case serverStatus.invalidCode: {
        return message.warning('验证码错误');
      }
      case serverStatus.expireCode: {
        return message.warning('验证码已过期');
      }
      default: {
        return message.warning('密码错误');
      }
    }
  };
  const handleLogin = async () => {
    if (!register || !code) return message.warning('请输入账号和验证码');
    const type = register.includes('@') ? 'email' : 'phone';
    const res = await fetch('/api/user/register', {
      body: JSON.stringify({
        invitation_code: localStorage.getItem('InvitationCode') || undefined,
        password,
        register_code: code,
        [type]: register,
      }),
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    switch (data.status) {
      case serverStatus.success: {
        setSettings({ token: data.signedToken.token });
        localStorage.setItem('InvitationCode', '');
        const res = await fetch('/api/user/info', {
          cache: 'no-cache',
          headers: {
            [LOBE_CHAT_ACCESS_CODE]: data.signedToken.token || '',
          },
          method: 'GET',
        });
        const josnData = await res.json();
        props.setUserInfo(josnData.body);
        message.success('登陆成功');
        setLogining(false);
        break;
      }
      case serverStatus.notExist: {
        message.warning('用户不存在');
        setLogining(false);
        break;
      }
      case serverStatus.wrongPassword: {
        message.warning('密码错误');
        setLogining(false);
        break;
      }
      default: {
        message.warning('系统异常，请稍后再试');
        setLogining(false);
        break;
      }
    }
  };
  const handlePasswordLogin = async () => {
    if (!register || !password) return message.warning('请输入账号和密码');
    const type = register.includes('@') ? 'email' : 'phone';
    if (register.includes('@')) {
      if (!/^([\w.-])+@([\w.-])+\.([A-Za-z]{2,4})$/.test(register)) {
        message.warning('请输入正确的邮箱');
        return;
      }
    } else {
      if (!/^1[,3-9]\d{9}$/.test(register)) {
        message.warning('请输入正确的手机号');
        return;
      }
    }
    setLogining(true);
    try {
      const res = await fetch('/api/user/login', {
        body: JSON.stringify({
          providerContent: { content: register.trim(), password: md5.hash(password) },
          providerId: type,
        }),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = await res.json();
      switch (data.status) {
        case serverStatus.success: {
          setSettings({ token: data.signedToken.token });
          localStorage.setItem('InvitationCode', '');
          const res = await fetch('/api/user/info', {
            cache: 'no-cache',
            headers: {
              [LOBE_CHAT_ACCESS_CODE]: data.signedToken.token || '',
            },
            method: 'GET',
          });
          const josnData = await res.json();
          props.setUserInfo(josnData.body);
          message.success('登陆成功');
          setLogining(false);
          break;
        }
        case serverStatus.notExist: {
          message.warning('用户不存在');
          setLogining(false);
          break;
        }
        case serverStatus.wrongPassword: {
          message.warning('密码错误');
          setLogining(false);
          break;
        }
        default: {
          message.warning('系统异常，请稍后再试');
          setLogining(false);
          break;
        }
      }
    } catch {
      message.warning('系统异常，请稍后再试');
      setLogining(false);
    }
  };
  return (
    <div style={{ margin: '0 auto', maxWidth: '300px', width: '100%' }}>
      <Segmented
        block
        onChange={(value) => setMode(value as Tab)}
        options={[
          {
            icon: <Icon icon={LogIn} />,
            label: '验证码登陆/注册',
            value: Tab.Code,
          },
          { icon: <Icon icon={KeySquare} />, label: '密码登录', value: Tab.Password },
        ]}
        style={{ width: '100%' }}
        value={mode}
      />
      <Flexbox gap={24}>
        {mode === Tab.Code && (
          <>
            <FormAction
              avatar={'🗳'}
              description={'未注册的用户将自动注册并登录，' + t('unlock.password.description')}
              title={t('unlock.password.title')}
            >
              <Input
                maxLength={50}
                onChange={(e) => setRegister(e.target.value)}
                placeholder="请输入手机号或邮箱"
                prefix={<UserIcon size={16} />}
                value={register}
              />
              <Space direction="horizontal">
                <Input
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入验证码"
                  prefix={<SquareAsterisk size={16} />}
                  type={'block'}
                  value={code}
                />
                <Button
                  disabled={logining || submitting}
                  onClick={() => {
                    if (time === 0) {
                      handleCode();
                    }
                  }}
                >
                  {time ? `${time}s后可重发` : submitting ? '正在发送' : '发送验证码'}
                </Button>
              </Space>
            </FormAction>
            <Flexbox gap={12}>
              <Button
                disabled={logining || submitting}
                onClick={() => {
                  handleLogin();
                }}
                type={'primary'}
              >
                {logining ? '正在登陆' : '立即登录'}
              </Button>
            </Flexbox>
          </>
        )}
        {mode === Tab.Password && (
          <>
            <FormAction
              avatar={'🗳'}
              description="注册后可在个人信息页面设置密码"
              title={t('unlock.password.title')}
            >
              <Input
                maxLength={50}
                onChange={(e) => setRegister(e.target.value)}
                placeholder="请输入手机号或邮箱"
                prefix={<UserIcon size={16} />}
                value={register}
              />
              <Input.Password
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder={t('unlock.password.placeholder')}
                prefix={<KeyRound size={16} />}
                type={'block'}
                value={password}
              />
            </FormAction>
            <Flexbox gap={12}>
              <Button
                disabled={logining || submitting}
                onClick={() => {
                  handlePasswordLogin();
                }}
                type={'primary'}
              >
                {logining ? '正在登陆' : '立即登录'}
              </Button>
            </Flexbox>
          </>
        )}
      </Flexbox>
    </div>
  );
};

const EditPassword = (props: {
  setIspasswordModal: (v: boolean) => void;
  setUserInfo: (v: any) => void;
  userInfo: any;
}) => {
  const [form] = AntForm.useForm();
  const [isSubmitting, setSubmitting] = useState(false);
  const settings = useGlobalStore(settingsSelectors.currentSettings, isEqual);
  const onFinish = async (values: {
    oldPassword: string;
    password: string;
    passwordAgain: string;
  }) => {
    const { oldPassword, password, passwordAgain } = values;
    if (isSubmitting) return;
    if (password !== passwordAgain) {
      return message.warning('两次密码输入不一致');
    }
    if (password.length < 6) {
      return message.warning('密码最少6位');
    }
    setSubmitting(true);
    const res = await fetch('/api/user/setPassword', {
      body: JSON.stringify({
        oldPassword: oldPassword ? md5.hash(oldPassword) : '',
        password: md5.hash(password),
      }),
      cache: 'no-store',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'POST',
    });
    const data = await res.json();
    if (data.status === 0) {
      message.success('设置成功');
      props.setIspasswordModal(false);
      if (!props.userInfo.hasPassword) {
        const InfoRes = await fetch('/api/user/info', {
          cache: 'no-cache',
          headers: {
            [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
          },
          method: 'GET',
        });
        const josnData = await InfoRes.json();
        props.setUserInfo(josnData.body);
      }
      form.setFieldsValue({
        oldPassword: '',
        password: '',
        passwordAgain: '',
      });
    } else {
      message.error(data.massage);
    }
    setSubmitting(false);
  };
  return (
    <Form
      autoComplete="off"
      colon={false}
      form={form}
      initialValues={{ remember: true }}
      labelCol={{ span: 10 }}
      name="editPassword"
      onFinish={onFinish}
      style={{ maxWidth: 500 }}
      wrapperCol={{ span: 14 }}
    >
      {props.userInfo.hasPassword && (
        <Form.Item
          label="原密码"
          name="oldPassword"
          rules={[{ message: '请输入原密码', required: true }]}
        >
          <Input.Password />
        </Form.Item>
      )}
      <Form.Item label="密码" name="password" rules={[{ message: '请输入密码', required: true }]}>
        <Input.Password />
      </Form.Item>
      <Form.Item
        label="确认密码"
        name="passwordAgain"
        rules={[{ message: '请再次输入密码', required: true }]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
        <Button htmlType="submit" type="primary">
          确认
        </Button>
      </Form.Item>
    </Form>
  );
};

const UseList = () => {
  const settings = useGlobalStore(settingsSelectors.currentSettings, isEqual);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [total, setTotal] = useState(0);
  const columns: ColumnsType<{
    createdAt: Date;
    desc: string;
    id: number;
    modelName: string;
    useValue: number;
    userId: number;
  }> = [
    {
      dataIndex: 'modelName',
      key: 'modelName',
      title: '模型',
    },
    {
      dataIndex: 'desc',
      key: 'desc',
      title: '描述',
      width: 60,
    },
    {
      dataIndex: 'useValue',
      key: 'useValue',
      title: '使用额度',
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleString(),
      title: '时间',
    },
  ];
  const getList = async () => {
    setIsLoading(true);
    const res = await fetch('/api/user/getUsedList?pageNo=' + pageNo, {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'GET',
    });
    const data = await res.json();
    setDataList(data?.body.list);
    setTotal(data?.body.total);
    setIsLoading(false);
  };
  useEffect(() => {
    if (isModalOpen) getList();
  }, [pageNo, isModalOpen]);
  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} size="small" style={{ marginLeft: '5px' }}>
        详情
      </Button>
      <Modal
        footer={null}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="积分消耗记录"
        width={600}
      >
        {' '}
        <p>只保留最近30天的数据</p>
        <Table
          columns={columns}
          dataSource={dataList}
          loading={isLoading}
          pagination={{
            current: pageNo,
            onChange: (page) => {
              setPageNo(page);
            },
            showTotal: (total) => `共${total}条`,
            total: total,
          }}
          rowKey="id"
        ></Table>
      </Modal>
    </>
  );
};
const User = memo(() => {
  const [form] = AntForm.useForm();
  const [userInfo, setUserInfo] = useState<any>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [passwordModal, setIspasswordModal] = useState(false);
  const [redeemsModal, setRedeemsModal] = useState(false);
  const [setSettings] = useGlobalStore((s) => [s.setSettings]);
  const settings = useGlobalStore(settingsSelectors.currentSettings, isEqual);
  const [isSubmitting, setSubmitting] = useState(false);
  const [redeemCode, setSedeemCode] = useState('');
  useSwitchSideBarOnInit(SettingsTabs.User);
  const logout = () => {
    setSettings({ token: '' });
    setUserInfo(null);
  };
  const getUserInfo = async () => {
    const res = await fetch('/api/user/info', {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'GET',
    });
    return await res.json();
  };
  const { data, isLoading = true } = useSWR(settings.token ? '/api/user/info' : '', async () => {
    const res = await fetch('/api/user/info', {
      cache: 'no-cache',
      headers: {
        [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
      },
      method: 'GET',
    });
    return await res.json();
  });
  const translateTag = (item: any) => {
    const nowDate = new Date();
    if (nowDate > new Date(item.startAt) && nowDate < new Date(item.expiredAt)) {
      return <Tag color="success">生效中</Tag>;
    } else if (nowDate < new Date(item.startAt)) {
      return <Tag>未到生效时间</Tag>;
    }
  };
  useEffect(() => {
    setUserInfo(data?.body);
  }, [data]);
  const submitRedeem = async () => {
    if (isSubmitting) return;
    setSubmitting(true);
    if (redeemCode) {
      const res = await fetch(`/api/user/redeem?redeemCode=${redeemCode}`, {
        cache: 'no-cache',
        headers: {
          [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
        },
        method: 'GET',
      });
      const redeemData = await res?.json();
      if (redeemData?.code === 0) {
        message.success('使用成功');
        const InfoRes = await fetch('/api/user/info', {
          cache: 'no-cache',
          headers: {
            [LOBE_CHAT_ACCESS_CODE]: settings.token || '',
          },
          method: 'GET',
        });
        const josnData = await InfoRes.json();
        setUserInfo(josnData?.body);
        setSedeemCode('');
      } else {
        message.error(redeemData.msg);
      }
      setSubmitting(false);
    } else {
      message.warning('请输入兑换码');
      setSubmitting(false);
    }
  };
  const info: SettingItemGroup = userInfo
    ? {
        children: [
          {
            children: userInfo.phone || userInfo.email,
            desc: '登录账号',
            label: '账号',
            minWidth: undefined,
          },
          {
            children: (
              <Button onClick={() => setIspasswordModal(true)}>
                {userInfo.hasPassword ? '修改密码' : '设置密码'}
              </Button>
            ),
            desc: '设置密码后可使用密码登录',
            label: '密码',
            minWidth: undefined,
          },
          {
            children: (
              <>
                {userInfo.integral}
                <UseList />
              </>
            ),
            desc: '您的充值额度，1￥=1000积分，会优先使用套餐额度，若当前无套餐则会消耗积分',
            label: '积分',
            minWidth: undefined,
          },
          {
            children: userInfo.subscriptions.length
              ? new Date(userInfo.subscriptions[0].expiredAt).toLocaleString()
              : '无',
            desc: '最长套餐有效期',
            label: '套餐有效期',
            minWidth: undefined,
          },
          {
            children: (
              <Snippet
                copyable={true}
                language="txt"
              >{`www.chat99.icu/?code=${userInfo.invitationCodes[0].code}`}</Snippet>
            ),
            desc: '每有一个通过您的邀请链接注册成功的用户，将使您获得1000积分',
            label: '邀请链接',
            minWidth: undefined,
          },
          {
            children: (
              <Button onClick={() => setIsModalOpen(true)}> {userInfo.invitation.length}</Button>
            ),
            desc: '通过您的邀请链接注册成功的人数',
            label: '邀请人数',
            minWidth: undefined,
          },
        ],
        icon: Info,
        title: (
          <>
            基本信息
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsPayOpen(true);
              }}
              size="small"
              style={{ marginLeft: '5px' }}
              type="primary"
            >
              充值积分
            </Button>
          </>
        ),
      }
    : { children: [{}], title: '暂无数据，请先登录' };
  const limit: SettingItemGroup = userInfo
    ? {
        children: userInfo.userLimits.length
          ? userInfo.userLimits.map((item: any) => ({
              children: `${item.times}/${
                item.subscription.plan.limits.find((limitItem: any) => {
                  return limitItem.modelName === item.modelName;
                })?.times || 0
              }`,
              desc: `${new Date(item.startAt).toLocaleString()} - ${new Date(
                item.expiredAt,
              ).toLocaleString()} 的用量`,
              label: (
                <>
                  {`${item.modelName} (${item.subscription.plan.name})`}
                  {translateTag(item)}
                </>
              ),
              minWidth: undefined,
            }))
          : [
              {
                desc: '套餐尚未生效或无套餐',
                label: '暂无使用中套餐',
              },
            ],
        icon: List,
        title: (
          <>
            套餐用量
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlanOpen(true);
              }}
              size="small"
              style={{ marginLeft: '5px' }}
              type="primary"
            >
              购买套餐
            </Button>
          </>
        ),
      }
    : { children: [{}], title: '暂无数据，请先登录' };
  if (isLoading) return <FullscreenLoading />;
  return userInfo ? (
    <>
      <Form form={form} items={[info, limit]} {...FORM_STYLE} />
      <Button onClick={() => setRedeemsModal(true)} style={{ maxWidth: '1024px', width: '100%' }}>
        兑换码
      </Button>
      <Button danger onClick={logout} style={{ maxWidth: '1024px', width: '100%' }}>
        退出登陆
      </Button>
      <Modal
        cancelText="取消"
        okText="确认"
        onCancel={() => setRedeemsModal(false)}
        onOk={submitRedeem}
        open={redeemsModal}
        title="兑换码"
      >
        <Input onChange={(e) => setSedeemCode(e.target.value)} placeholder="请输入兑换码" />
      </Modal>
      <Modal
        footer={null}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="邀请记录"
      >
        <Table columns={columns} dataSource={userInfo.invitation} pagination={false}></Table>
      </Modal>
      <Modal
        footer={null}
        onCancel={() => setIspasswordModal(false)}
        open={passwordModal}
        title={userInfo.hasPassword ? '修改密码' : '设置密码'}
      >
        <EditPassword
          setIspasswordModal={setIspasswordModal}
          setUserInfo={setUserInfo}
          userInfo={userInfo}
        />
      </Modal>
      <PayModal
        onOpenChange={(e) => {
          setIsPayOpen(e);
          if (!e) getUserInfo();
        }}
        open={isPayOpen}
      />
      {isPlanOpen && (
        <PlanModal
          onOpenChange={(e) => {
            setIsPlanOpen(e);
            if (!e) getUserInfo();
          }}
          open={isPlanOpen}
        />
      )}
    </>
  ) : (
    <InvalidAccess setUserInfo={setUserInfo} />
  );
});

export default User;
