import { type ComponentType, createElement } from 'react';

import { SITE_NAME } from './components/common';
import { Comment, CommentMention, Mention } from './docs';
import { render } from './render';
import {
  TeamBecomeAdmin,
  TeamBecomeCollaborator,
  TeamDeleteIn24Hours,
  TeamDeleteInOneMonth,
  TeamExpired,
  TeamExpireSoon,
  TeamLicense,
  TeamWorkspaceDeleted,
  TeamWorkspaceUpgraded,
} from './teams';
import TestMail from './test-mail';
import {
  ChangeEmail,
  ChangeEmailNotification,
  ChangePassword,
  SetPassword,
  SignIn,
  SignUp,
  VerifyChangeEmail,
  VerifyEmail,
} from './users';
import {
  Invitation,
  InvitationAccepted,
  LinkInvitationApproved,
  LinkInvitationReviewDeclined,
  LinkInvitationReviewRequest,
  MemberLeave,
  MemberRemoved,
  OwnershipReceived,
  OwnershipTransferred,
} from './workspaces';

type EmailContent = {
  subject: string;
  html: string;
};

type Props<T> = T extends ComponentType<infer P> ? P : never;
export type EmailRenderer<Props> = (props: Props) => Promise<EmailContent>;

function make<T extends ComponentType<any>>(
  Component: T,
  subject: string | ((props: Props<T>) => string)
): EmailRenderer<Props<T>> {
  return async props => {
    if (!props && env.testing) {
      // @ts-expect-error test only
      props = Component.PreviewProps;
    }
    return {
      subject: typeof subject === 'function' ? subject(props) : subject,
      html: await render(createElement(Component, props)),
    };
  };
}

export const Renderers = {
  //#region Test
  TestMail: make(TestMail, `${SITE_NAME} 测试邮件`),
  //#endregion

  //#region User
  SignIn: make(SignIn, `登录 ${SITE_NAME}`),
  SignUp: make(SignUp, `你的 ${SITE_NAME} 账号已就绪`),
  SetPassword: make(SetPassword, '设置你的密码'),
  ChangePassword: make(ChangePassword, '修改你的密码'),
  VerifyEmail: make(VerifyEmail, '验证你的邮箱地址'),
  ChangeEmail: make(ChangeEmail, '更换你的邮箱地址'),
  VerifyChangeEmail: make(VerifyChangeEmail, '验证你的新邮箱地址'),
  EmailChanged: make(ChangeEmailNotification, '账号邮箱已变更'),
  //#endregion

  //#region Workspace
  MemberInvitation: make(Invitation, `有人邀请你加入 ${SITE_NAME} 的工作区`),
  MemberAccepted: make(InvitationAccepted, '你的工作区邀请已被接受'),
  MemberLeave: make(MemberLeave, '有成员离开了工作区'),
  LinkInvitationReviewRequest: make(
    LinkInvitationReviewRequest,
    '有人申请加入工作区'
  ),
  LinkInvitationApprove: make(
    LinkInvitationApproved,
    '你的工作区加入申请已通过'
  ),
  LinkInvitationDecline: make(
    LinkInvitationReviewDeclined,
    '你的工作区加入申请被拒绝'
  ),
  MemberRemoved: make(MemberRemoved, '你已被移出工作区'),
  OwnershipTransferred: make(OwnershipTransferred, '你的工作区所有权已转移'),
  OwnershipReceived: make(OwnershipReceived, '你已成为工作区所有者'),
  //#endregion

  //#region Doc
  Mention: make(Mention, '有人在文档中提到了你'),
  Comment: make(Comment, '文档有新评论'),
  CommentMention: make(CommentMention, '有人在评论中提到了你'),
  //#endregion

  //#region Team
  TeamWorkspaceUpgraded: make(TeamWorkspaceUpgraded, props =>
    props.isOwner
      ? 'Your workspace has been upgraded to team workspace! 🎉'
      : 'A workspace has been upgraded to team workspace! 🎉'
  ),
  TeamBecomeAdmin: make(TeamBecomeAdmin, 'You are now a workspace admin'),
  TeamBecomeCollaborator: make(
    TeamBecomeCollaborator,
    'Your workspace role has been changed'
  ),
  TeamDeleteIn24Hours: make(
    TeamDeleteIn24Hours,
    '[Action Required] Final warning: Your workspace will be deleted in 24 hours'
  ),
  TeamDeleteInOneMonth: make(
    TeamDeleteInOneMonth,
    '[Action Required] Important: Your workspace will be deleted soon'
  ),
  TeamWorkspaceDeleted: make(
    TeamWorkspaceDeleted,
    'Your workspace has been deleted'
  ),
  TeamWorkspaceExpireSoon: make(
    TeamExpireSoon,
    '[Action Required] Your team workspace will expire soon'
  ),
  TeamWorkspaceExpired: make(TeamExpired, 'Your team workspace has expired'),
  //#endregion

  //#region License
  TeamLicense: make(
    TeamLicense,
    'Your AFFiNE Self-Hosted Team Workspace license is ready'
  ),
  //#endregion
} as const;

export type MailName = keyof typeof Renderers;
export type MailProps<T extends MailName> = Parameters<
  (typeof Renderers)[T]
>[0];
