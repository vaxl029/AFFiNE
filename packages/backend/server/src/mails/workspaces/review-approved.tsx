import { TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
  Title,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type LinkInvitationApprovedProps = {
  workspace: WorkspaceProps;
  url: string;
};

export default function LinkInvitationApproved(
  props: LinkInvitationApprovedProps
) {
  const { workspace, url } = props;
  return (
    <Template>
      <Title>加入申请已通过</Title>
      <Content>
        <P>
          你加入 <Workspace {...workspace} />{' '}
          的申请已通过，现在可以访问该工作区并与其他成员协作。
        </P>
      </Content>
      <Button href={url}>打开工作区</Button>
    </Template>
  );
}

LinkInvitationApproved.PreviewProps = {
  workspace: TEST_WORKSPACE,
  url: 'https://app.affine.pro',
};
