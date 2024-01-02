'use client';

import { useTranslation } from 'react-i18next';

import FullscreenLoading from '@/components/FullscreenLoading';

function getQueryString(name: string) {
  let reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
  let r = window.location.search.slice(1).match(reg);
  if (r !== null) {
    return unescape(r[2]);
  }
  return null;
}
const InvitationCode = getQueryString('code');
if (InvitationCode) {
  localStorage.setItem('InvitationCode', InvitationCode);
}
const Loading = () => {
  const { t } = useTranslation('common');

  return <FullscreenLoading title={t('appInitializing')} />;
};

export default Loading;
