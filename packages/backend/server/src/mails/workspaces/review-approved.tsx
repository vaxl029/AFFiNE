import { TEST_WORKSPACE } from '../common';
import {
  Button,
  Content,
  P,
  Template,
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
      <Content>
        <P>
          你加入 <Workspace {...workspace} />{' '}
          的申请已通过，现在可以访问该工作区并与其他成员协作。
        </P>
        {/* 按钮原本写在 Content 外面，而 Template 只渲染 Content 里的东西，
            于是这封信发出去是没有入口的。挪进来。 */}
        <Button href={url}>打开工作区</Button>
      </Content>
    </Template>
  );
}

LinkInvitationApproved.PreviewProps = {
  workspace: TEST_WORKSPACE,
  url: 'https://app.affine.pro',
};
