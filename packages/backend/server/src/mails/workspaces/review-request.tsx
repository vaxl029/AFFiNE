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

export type LinkInvitationReviewRequestProps = {
  workspace: WorkspaceProps;
  user: UserProps;
  url: string;
};

export default function LinkInvitationReviewRequest(
  props: LinkInvitationReviewRequestProps
) {
  const { workspace, user, url } = props;
  return (
    <Template>
      <Title>
        有人申请加入 <Workspace {...workspace} size={24} />
      </Title>
      <Content>
        <P>
          <User {...user} /> 申请加入 <Workspace {...workspace} />。
          <br />
          作为工作区所有者或管理员，你可以通过或拒绝该申请。
        </P>
        <Button href={url}>处理申请</Button>
      </Content>
    </Template>
  );
}

LinkInvitationReviewRequest.PreviewProps = {
  workspace: TEST_WORKSPACE,
  user: TEST_USER,
  url: 'https://app.affine.pro',
};
