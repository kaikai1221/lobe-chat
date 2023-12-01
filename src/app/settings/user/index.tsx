'use client';

import { memo } from 'react';

import PageTitle from '@/components/PageTitle';
import { CURRENT_VERSION } from '@/const/version';
import { useSwitchSideBarOnInit } from '@/store/global/hooks/useSwitchSettingsOnInit';
import { SettingsTabs } from '@/store/global/initialState';

import Footer from '../features/Footer';
import User from './User';

export default memo(() => {
  useSwitchSideBarOnInit(SettingsTabs.User);

  return (
    <>
      <PageTitle title="个人信息" />
      <User />
      <Footer>AI聊天室 v{CURRENT_VERSION}</Footer>
    </>
  );
});
