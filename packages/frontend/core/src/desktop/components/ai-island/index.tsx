import { ServerService } from '@affine/core/modules/cloud';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';

import { IslandContainer } from './container';
import { AIIcon } from './icons';
import { aiIslandBtn, aiIslandWrapper, toolStyle } from './styles.css';

const hideChat: Array<string | ((path: string) => boolean)> = [
  '/chat',
  path => path.includes('attachments'),
];

export const AIIsland = () => {
  // to make sure ai island is hidden first and animate in
  const [hide, setHide] = useState(true);

  // 上游这里只按路由和侧栏状态决定隐藏，没有跟随服务端的 copilot 开关，
  // 于是 Admin 关掉 AI 之后这个浮动按钮依旧在，点了还跳 /chat。
  // 判定条件与侧边栏入口保持一致（root-app-sidebar/index.tsx）。
  const serverService = useService(ServerService);
  const featureFlagService = useService(FeatureFlagService);
  const serverFeatures = useLiveData(serverService.server.features$);
  const enableAI = useLiveData(featureFlagService.flags.enable_ai.$);

  const workbench = useService(WorkbenchService).workbench;
  const activeView = useLiveData(workbench.activeView$);
  const haveChatTab = useLiveData(
    activeView.sidebarTabs$.map(tabs => tabs.some(t => t.id === 'chat'))
  );
  const activeLocation = useLiveData(activeView.location$);
  const activeTab = useLiveData(activeView.activeSidebarTab$);
  const sidebarOpen = useLiveData(workbench.sidebarOpen$);

  useEffect(() => {
    let hide = true;
    if (haveChatTab) {
      hide = !!sidebarOpen && activeTab?.id === 'chat';
    } else {
      const path = activeLocation.pathname;
      hide = hideChat.some(item =>
        typeof item === 'string' ? path === item : item(path)
      );
    }
    setHide(hide);
  }, [activeLocation.pathname, activeTab, haveChatTab, sidebarOpen]);

  const onOpenChat = useCallback(() => {
    if (hide) return;
    if (haveChatTab) {
      workbench.openSidebar();
      activeView.activeSidebarTab('chat');
    } else {
      workbench.open('/chat');
      workbench.closeSidebar();
    }
  }, [activeView, haveChatTab, hide, workbench]);

  // 放在所有 hook 之后再返回，避免违反 hooks 调用顺序规则
  if (!enableAI || !serverFeatures?.copilot) {
    return null;
  }

  return (
    <IslandContainer className={clsx(toolStyle, { hide })}>
      <div className={aiIslandWrapper} data-hide={hide}>
        <button
          className={aiIslandBtn}
          data-testid="ai-island"
          onClick={onOpenChat}
        >
          <AIIcon />
        </button>
      </div>
    </IslandContainer>
  );
};
