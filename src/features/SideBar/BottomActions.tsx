import { ActionIcon, Icon, Modal } from '@lobehub/ui';
import { Badge, ConfigProvider, Dropdown, MenuProps } from 'antd';
import {
  BookmarkPlus,
  HardDriveDownload,
  HardDriveUpload,
  Settings,
  Settings2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import DataImporter from '@/features/DataImporter';
import { configService } from '@/services/config';
import { GlobalStore, useGlobalStore } from '@/store/global';
import { SettingsTabs, SidebarTabKey } from '@/store/global/initialState';

export interface BottomActionProps {
  setTab: GlobalStore['switchSideBar'];
  tab: GlobalStore['sidebarKey'];
}

const BottomActions = memo<BottomActionProps>(({ tab, setTab }) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNewVersion] = useGlobalStore((s) => [s.hasNewVersion, s.useCheckLatestVersion]);

  // useCheckLatestVersion();

  const items: MenuProps['items'] = [
    {
      icon: <Icon icon={HardDriveUpload} />,
      key: 'import',
      label: <DataImporter>{t('import')}</DataImporter>,
    },
    {
      children: [
        {
          key: 'allAgent',
          label: <div>{t('exportType.allAgent')}</div>,
          onClick: configService.exportAgents,
        },
        {
          key: 'allAgentWithMessage',
          label: <div>{t('exportType.allAgentWithMessage')}</div>,
          onClick: configService.exportSessions,
        },
        {
          key: 'globalSetting',
          label: <div>{t('exportType.globalSetting')}</div>,
          onClick: configService.exportSettings,
        },
        {
          type: 'divider',
        },
        {
          key: 'all',
          label: <div>{t('exportType.all')}</div>,
          onClick: configService.exportAll,
        },
      ],
      icon: <Icon icon={HardDriveDownload} />,
      key: 'export',
      label: t('export'),
    },
    // {
    //   type: 'divider',
    // },
    // {
    //   icon: <Icon icon={Feather} />,
    //   key: 'feedback',
    //   label: t('feedback'),
    //   onClick: () => window.open(FEEDBACK, '__blank'),
    // },
    // {
    //   icon: <Icon icon={FileClock} />,
    //   key: 'changelog',
    //   label: t('changelog'),
    //   onClick: () => window.open(CHANGELOG, '__blank'),
    // },
    // {
    //   icon: <Icon icon={Book} />,
    //   key: 'wiki',
    //   label: 'WIKI',
    //   onClick: () => window.open(WIKI, '__blank'),
    // },
    // {
    //   icon: <Icon icon={Heart} />,
    //   key: 'about',
    //   label: t('about'),
    //   onClick: () => window.open(ABOUT, '__blank'),
    // },
    {
      type: 'divider',
    },
    {
      icon: <Icon icon={Settings} />,
      key: 'setting',
      label: (
        <Flexbox align={'center'} distribution={'space-between'} gap={8} horizontal>
          {t('setting')} {hasNewVersion && <Badge count={t('upgradeVersion.hasNew')} />}
        </Flexbox>
      ),
      onClick: () => {
        setTab(SidebarTabKey.Setting);
        useGlobalStore.setState({
          settingsTab: SettingsTabs.Common,
          sidebarKey: SidebarTabKey.Setting,
        });
        router.push('/settings/common');
      },
    },
  ];

  return (
    <>
      <ActionIcon
        icon={BookmarkPlus}
        onClick={() => setIsModalOpen(true)}
        size={'site'}
        title={'关注公众号'}
      />
      <Modal
        footer={''}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="关注公众号"
      >
        <p style={{ textAlign: 'center' }}>关注公众号，获取最新消息，领取专属礼包</p>
        <div style={{ textAlign: 'center' }}>
          <Image alt="公众号" height={200} src="/images/qrcode_for_gzh.jpg" width={200} />
        </div>
      </Modal>
      <Dropdown arrow={false} menu={{ items }} trigger={['click']}>
        {hasNewVersion ? (
          <Flexbox>
            <ConfigProvider theme={{ components: { Badge: { dotSize: 8 } } }}>
              <Badge dot offset={[-4, 4]}>
                <ActionIcon active={tab === SidebarTabKey.Setting} icon={Settings2} />
              </Badge>
            </ConfigProvider>
          </Flexbox>
        ) : (
          <ActionIcon active={tab === SidebarTabKey.Setting} icon={Settings2} />
        )}
      </Dropdown>
    </>
  );
});

export default BottomActions;
