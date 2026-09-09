import { AuthPageContainer } from '@affine/component/auth-components';
import type { GetInviteInfoQuery } from '@affine/graphql';
import { useI18n } from '@affine/i18n';

import { Avatar } from '../../ui/avatar';
import { Button } from '../../ui/button';
import * as styles from './styles.css';
export const AcceptInvitePage = ({
  onOpenWorkspace,
  inviteInfo,
}: {
  onOpenWorkspace: () => void;
  inviteInfo: GetInviteInfoQuery['getInviteInfo'];
}) => {
  const t = useI18n();
  return (
    <AuthPageContainer
      title={t['Successfully joined!']()}
      subtitle={
        <div className={styles.content}>
          <div className={styles.userWrapper}>
            <Avatar
              url={inviteInfo.user.avatarUrl || ''}
              name={inviteInfo.user.name}
              size={20}
            />
            <span className={styles.inviteName}>{inviteInfo.user.name}</span>
          </div>
          <div>{t['invited you to join']()}</div>
          {/* 工作区头像来自 base64 内联数据，工作区没设头像时就是一个空的
              data URI，渲染成裂图或空块。只保留名称。 */}
          <div className={styles.userWrapper}>
            <span className={styles.inviteName}>
              {inviteInfo.workspace.name}
            </span>
          </div>
        </div>
      }
    >
      <Button variant="primary" size="large" onClick={onOpenWorkspace}>
        {t['Visit Workspace']()}
      </Button>
    </AuthPageContainer>
  );
};
