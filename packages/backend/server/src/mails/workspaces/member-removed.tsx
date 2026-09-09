import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type MemberRemovedProps = {
  workspace: WorkspaceProps;
};

export default function MemberRemoved(props: MemberRemovedProps) {
  const { workspace } = props;
  return (
    <Template>
      <Title>你已被移出工作区</Title>
      <Content>
        <P>
          你已被移出 <Workspace {...workspace} />
          ，无法再访问该工作区。
        </P>
      </Content>
    </Template>
  );
}

MemberRemoved.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
