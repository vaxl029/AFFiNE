import { AuthPageContainer } from '@affine/component/auth-components';
import { UserFriendlyError } from '@affine/error';
import { ErrorNames, type GetInviteInfoQuery } from '@affine/graphql';
import { Trans, useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const JoinFailedPage = ({
  inviteInfo,
  error,
}: {
  inviteInfo?: GetInviteInfoQuery['getInviteInfo'];
  error?: any;
}) => {
  const userFriendlyError = UserFriendlyError.fromAny(error);
  const t = useI18n();
  const errorKey = `error.${userFriendlyError.name}`;
  const translated = t[errorKey]();
  const translatedError = translated === errorKey ? null : translated;
  return (
    <AuthPageContainer
      title={t['com.affine.fail-to-join-workspace.title']()}
      subtitle={
        userFriendlyError.name === ErrorNames.MEMBER_QUOTA_EXCEEDED ? (
          <div className={styles.lineHeight}>
            <Trans
              i18nKey={'com.affine.fail-to-join-workspace.description-1'}
              components={{
                // 工作区头像是空 data URI 时会渲染成裂图，这里留空占位以保持
                // i18n 的插槽结构
                1: <div className={styles.avatarWrapper} />,
                2: <span className={styles.inviteName} />,
              }}
              values={{
                workspaceName: inviteInfo?.workspace.name,
              }}
            />
            <div>{t['com.affine.fail-to-join-workspace.description-2']()}</div>
          </div>
        ) : (
          // 上游把译文和后端英文原文一并列出，等于同一句话说两遍。取译文，
          // 没有对应译文时（i18n 对未知 key 原样返回）再退回原文。
          <div>{translatedError ?? userFriendlyError.message}</div>
        )
      }
    />
  );
};
