import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
  Title,
  User,
  type UserProps,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type InvitationAcceptedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
  url: string;
};

export default function InvitationAccepted(props: InvitationAcceptedProps) {
  const { user, workspace, url } = props;
  return (
    <Template>
      <Title>{user.email} 接受了你的邀请</Title>
      <Content>
        <P>
          <User {...user} /> 已加入 <Workspace {...workspace} />
        </P>
        <Button href={url}>查看成员列表</Button>
      </Content>
    </Template>
  );
}

InvitationAccepted.PreviewProps = {
  user: TEST_USER,
  workspace: TEST_WORKSPACE,
  url: 'https://app.affine.pro',
};
