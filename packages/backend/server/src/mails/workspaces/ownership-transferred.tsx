import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type OwnershipTransferredProps = {
  workspace: WorkspaceProps;
};

export default function OwnershipTransferred(props: OwnershipTransferredProps) {
  const { workspace } = props;
  return (
    <Template>
      <Content>
        <P>
          你已转移 <Workspace {...workspace} />{' '}
          的所有权，现在是该工作区的协作者。
        </P>
      </Content>
    </Template>
  );
}

OwnershipTransferred.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
