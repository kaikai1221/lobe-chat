import { forwardRef, useState } from 'react';

import { useStore } from '@/features/AgentSetting/store';
import DevModal from '@/features/PluginDevModal';
import { useToolStore } from '@/store/tool';

const AddPluginButton = forwardRef<HTMLButtonElement>(() => {
  const [showModal, setModal] = useState(false);
  const [toggleAgentPlugin] = useStore((s) => [s.toggleAgentPlugin]);
  const [installCustomPlugin, updateNewDevPlugin] = useToolStore((s) => [
    s.installCustomPlugin,
    s.updateNewCustomPlugin,
  ]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DevModal
        onOpenChange={setModal}
        onSave={async (devPlugin) => {
          await installCustomPlugin(devPlugin);
          toggleAgentPlugin(devPlugin.identifier);
        }}
        onValueChange={updateNewDevPlugin}
        open={showModal}
      />
      {/* <Button
        icon={<Icon icon={PackagePlus} />}
        onClick={() => {
          setModal(true);
        }}
        ref={ref}
        size={'small'}
      >
        {t('plugin.addTooltip')}
      </Button> */}
    </div>
  );
});

export default AddPluginButton;
