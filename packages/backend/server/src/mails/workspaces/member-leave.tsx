import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Content,
  Name,
  P,
  Template,
  type UserProps,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type MemberLeaveProps = {
  user: UserProps;
  workspace: WorkspaceProps;
};

export default function MemberLeave(props: MemberLeaveProps) {
  const { user, workspace } = props;
  return (
    <Template>
      <Content>
        <P>
          <Name>{user.email}</Name> 已离开工作区 <Workspace {...workspace} />
        </P>
      </Content>
    </Template>
  );
}

MemberLeave.PreviewProps = {
  user: TEST_USER,
  workspace: TEST_WORKSPACE,
};
