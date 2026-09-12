import { AuthPageContainer } from '@affine/component/auth-components';
import type { GetInviteInfoQuery } from '@affine/graphql';
import { Trans, useI18n } from '@affine/i18n';

import * as styles from './styles.css';

/**
 * 加入申请被管理员驳回后落地的页面。
 *
 * 驳回是终态，所以这里不提供任何"再试一次"的入口——要重新进来只能等对方
 * 主动邀请。上游没有这个状态（驳回即删记录），于是被拒的人刷新一下就又拿
 * 到申请按钮，驳回形同虚设。
 */
export const RequestDeclinedPage = ({
  inviteInfo,
}: {
  inviteInfo: GetInviteInfoQuery['getInviteInfo'];
}) => {
  const t = useI18n();

  return (
    <AuthPageContainer
      title={t['com.affine.request-declined.title']()}
      subtitle={
        <div className={styles.lineHeight}>
          <Trans
            i18nKey="com.affine.request-declined.description"
            components={{
              1: <span className={styles.inviteName} />,
            }}
            values={{ workspaceName: inviteInfo.workspace.name }}
          />
        </div>
      }
    />
  );
};
