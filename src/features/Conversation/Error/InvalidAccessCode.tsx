import { Icon } from '@lobehub/ui';
import { Button, Input, Segmented, Space, message } from 'antd';
import { KeyRound, KeySquare, LogIn, SquareAsterisk, User } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import md5 from 'spark-md5';

import { serverStatus } from '@/prismaClient/serverStatus';
import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';

// import { RenderErrorMessage } from '../types';
import { ErrorActionContainer, FormAction } from './style';

enum Tab {
  Code = 'code',
  Password = 'password',
}
interface InvalidAccessCodeProps {
  id: string;
  provider?: string;
}

const InvalidAccessCode = memo<InvalidAccessCodeProps>(({ id }) => {
  const [register, setRegister] = useState('');
  const [code, setCode] = useState('');
  const [time, setTime] = useState(0);
  const { t } = useTranslation('error');
  const [mode, setMode] = useState<Tab>(Tab.Code);
  const [submitting, setSubmitting] = useState(false);
  const [logining, setLogining] = useState(false);
  const [password, setPassword] = useState('');
  const [setSettings] = useGlobalStore((s) => [s.setSettings]);

  const [resend, deleteMessage] = useChatStore((s) => [s.resendMessage, s.deleteMessage]);
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
    setLogining(true);
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
        message.success('登陆成功');
        setSettings({ token: data.signedToken.token });
        resend(id);
        deleteMessage(id);
        localStorage.setItem('InvitationCode', '');
        break;
      }
      case serverStatus.notExist: {
        message.warning('用户不存在');
        break;
      }
      case serverStatus.wrongPassword: {
        message.warning('密码错误');
        break;
      }
      default: {
        message.warning('系统异常，请稍后再试');
        break;
      }
    }
    setLogining(false);
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
      setLogining(false);
      switch (data.status) {
        case serverStatus.success: {
          message.success('登陆成功');
          setSettings({ token: data.signedToken.token });
          setTimeout(() => {
            resend(id);
            deleteMessage(id);
          }, 100);
          localStorage.setItem('InvitationCode', '');
          break;
        }
        case serverStatus.notExist: {
          message.warning('用户不存在');
          break;
        }
        case serverStatus.wrongPassword: {
          message.warning('密码错误');
          break;
        }
        default: {
          message.warning('系统异常，请稍后再试');
          break;
        }
      }
    } catch {
      setLogining(false);
      message.warning('系统异常，请稍后再试');
    }
  };
  return (
    <ErrorActionContainer>
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
                prefix={<User size={16} />}
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
                {logining ? '正在登陆' : t('unlock.confirm')}
              </Button>
              <Button
                disabled={logining || submitting}
                onClick={() => {
                  deleteMessage(id);
                }}
              >
                {logining ? '正在登陆' : t('unlock.closeMessage')}
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
                prefix={<User size={16} />}
                value={register}
              />
              <Input.Password
                autoComplete={'new-password'}
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
                {logining ? '正在登陆' : t('unlock.confirm')}
              </Button>
              <Button
                disabled={logining || submitting}
                onClick={() => {
                  deleteMessage(id);
                }}
              >
                {logining ? '正在登陆' : t('unlock.closeMessage')}
              </Button>
            </Flexbox>
          </>
        )}
      </Flexbox>
    </ErrorActionContainer>
  );
});

export default InvalidAccessCode;
