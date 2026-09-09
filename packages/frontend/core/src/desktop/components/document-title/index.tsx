import { ServerService } from '@affine/core/modules/cloud';
import { NotificationCountService } from '@affine/core/modules/notification';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

// 站点名取服务端的 server.name（Admin 里可改，不必重新构建）。
// 分享页的 SSR 标题（doc-renderer/controller.ts）用的也是这个值，两边
// 保持一致——否则会出现刷新时显示 A、加载完变成 B 的割裂感。
const FALLBACK_SITE_NAME = 'AFFiNE';

export const DocumentTitle = () => {
  const notificationCountService = useService(NotificationCountService);
  const notificationCount = useLiveData(notificationCountService.count$);
  const workbenchService = useService(WorkbenchService);
  const workbenchView = useLiveData(workbenchService.workbench.activeView$);
  const viewTitle = useLiveData(workbenchView.title$);
  const serverService = useService(ServerService);
  const serverName = useLiveData(
    serverService.server.config$.selector(config => config.serverName)
  );

  useEffect(() => {
    const siteName = serverName || FALLBACK_SITE_NAME;
    const prefix = notificationCount > 0 ? `(${notificationCount}) ` : '';
    document.title =
      prefix + (viewTitle ? `${viewTitle} · ${siteName}` : siteName);

    return () => {
      document.title = siteName;
    };
  }, [notificationCount, serverName, viewTitle]);

  return null;
};
