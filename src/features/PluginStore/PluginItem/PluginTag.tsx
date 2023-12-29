import { Icon, Tag } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { BadgeCheck, CircleUser, Package } from 'lucide-react';
import { rgba } from 'polished';
import { memo } from 'react';

import { InstallPluginMeta } from '@/types/tool/plugin';

const useStyles = createStyles(({ css, token }) => ({
  community: css`
    color: ${rgba(token.colorInfo, 0.75)};
    background: ${token.colorInfoBg};

    &:hover {
      color: ${token.colorInfo};
    }
  `,
  custom: css`
    color: ${rgba(token.colorWarning, 0.75)};
    background: ${token.colorWarningBg};

    &:hover {
      color: ${token.colorWarning};
    }
  `,
  official: css`
    color: ${rgba(token.colorSuccess, 0.75)};
    background: ${token.colorSuccessBg};

    &:hover {
      color: ${token.colorSuccess};
    }
  `,
}));

interface PluginTagProps extends Pick<InstallPluginMeta, 'author' | 'type'> {
  showIcon?: boolean;
  showText?: boolean;
}

const PluginTag = memo<PluginTagProps>(({ showIcon = true, author, type }) => {
  const { styles, cx } = useStyles();
  const isCustom = type === 'customPlugin';
  const isOfficial = author === 'AI 聊天室';

  return (
    <Tag
      className={cx(isCustom ? styles.custom : isOfficial ? styles.official : styles.community)}
      icon={showIcon && <Icon icon={isCustom ? Package : isOfficial ? BadgeCheck : CircleUser} />}
    >
      {/* {showText && (author || t(isCustom ? 'store.customPlugin' : 'store.communityPlugin'))} */}
      AI 聊天室
    </Tag>
  );
});

export default PluginTag;
