import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type OwnershipReceivedProps = {
  workspace: WorkspaceProps;
};

export default function OwnershipReceived(props: OwnershipReceivedProps) {
  const { workspace } = props;

  return (
    <Template>
      <Content>
        <P>
          你已被指定为 <Workspace {...workspace} />{' '}
          的所有者，拥有该工作区的完全控制权。
        </P>
      </Content>
    </Template>
  );
}

OwnershipReceived.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
