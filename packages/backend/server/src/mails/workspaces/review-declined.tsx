import { TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type LinkInvitationReviewDeclinedProps = {
  workspace: WorkspaceProps;
};

export default function LinkInvitationReviewDeclined(
  props: LinkInvitationReviewDeclinedProps
) {
  const { workspace } = props;
  return (
    <Template>
      <Content>
        <P>
          你加入 <Workspace {...workspace} /> 的申请已被工作区管理员拒绝。
        </P>
      </Content>
    </Template>
  );
}

LinkInvitationReviewDeclined.PreviewProps = {
  workspace: TEST_WORKSPACE,
};
