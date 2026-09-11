import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
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
