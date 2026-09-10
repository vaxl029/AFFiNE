import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
  User,
  type UserProps,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type InvitationProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  url: string;
};

export default function Invitation(props: InvitationProps) {
  const { user, workspace, url } = props;

  return (
    <Template>
      <Content>
        <P>
          <User {...user} /> 邀请你加入 <Workspace {...workspace} /> 工作区
        </P>
        <P>点击下面的按钮即可加入</P>
        <Button href={url}>接受邀请</Button>
      </Content>
    </Template>
  );
}

Invitation.PreviewProps = {
  user: TEST_USER,
  workspace: TEST_WORKSPACE,
  url: 'https://app.affine.pro',
};
