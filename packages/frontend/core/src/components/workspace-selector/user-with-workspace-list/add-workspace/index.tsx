import { MenuItem } from '@affine/component/ui/menu';
import {
  AuthService,
  DefaultServerService,
  UserFeatureService,
} from '@affine/core/modules/cloud';
import { ServerFeature } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { ImportIcon, PlusIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

import * as styles from './index.css';

export const AddWorkspace = ({
  onAddWorkspace,
  onNewWorkspace,
}: {
  onAddWorkspace?: () => void;
  onNewWorkspace?: () => void;
}) => {
  const t = useI18n();
  const defaultServerService = useService(DefaultServerService);
  const enableLocalWorkspace = useLiveData(
    defaultServerService.server.config$.selector(
      c =>
        c.features.includes(ServerFeature.LocalWorkspace) ||
        BUILD_CONFIG.isNative
    )
  );
  const isAuthenticated = useLiveData(
    useService(AuthService).session.status$.map(
      status => status === 'authenticated'
    )
  );
  const userFeatureService = useService(UserFeatureService);
  const canCreateWorkspace = useLiveData(
    userFeatureService.userFeature.canCreateWorkspace$
  );

  // UserFeatureService 只在 AccountChanged 时自行刷新，而新开标签页是从
  // cookie 恢复会话——账号并没有"改变"，事件不发，features 就一直停在
  // 未加载。于是这里判不出无权限，入口照常露出来。其余消费方（账号菜单、
  // 设置页）也都是自己拉一次，照做。
  useEffect(() => {
    userFeatureService.userFeature.revalidate();
  }, [userFeatureService]);

  // 服务端关掉 LocalWorkspace 后，未登录用户点这里只会被弹回登录框。
  // 与其给出 "可以先建个工作区试试" 的错误引导，不如直接不显示入口。
  // 桌面端 BUILD_CONFIG.isNative 恒为 true，不受影响。
  if (!enableLocalWorkspace && !isAuthenticated) {
    return null;
  }

  // 没有建工作区的资格就别摆入口。判定在服务端（createWorkspace 会拒绝），
  // 这里只管露不露。null 表示还没查到，先不藏，免得入口闪一下才出现。
  if (isAuthenticated && canCreateWorkspace === false) {
    return null;
  }

  return (
    <>
      {BUILD_CONFIG.isElectron && (
        <MenuItem
          block={true}
          prefixIcon={<ImportIcon />}
          prefixIconClassName={styles.prefixIcon}
          onClick={onAddWorkspace}
          data-testid="add-workspace"
          className={styles.ItemContainer}
        >
          <div className={styles.ItemText}>
            {t['com.affine.workspace.local.import']()}
          </div>
        </MenuItem>
      )}
      <MenuItem
        block={true}
        prefixIcon={<PlusIcon />}
        prefixIconClassName={styles.prefixIcon}
        onClick={onNewWorkspace}
        data-testid="new-workspace"
        className={styles.ItemContainer}
      >
        <div className={styles.ItemText}>
          {enableLocalWorkspace
            ? t['com.affine.workspaceList.addWorkspace.create']()
            : t['com.affine.workspaceList.addWorkspace.create-cloud']()}
        </div>
      </MenuItem>
    </>
  );
};
