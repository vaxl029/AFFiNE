import { TEST_DOC, TEST_USER } from '../common';
import {
  Button,
  Content,
  Doc,
  type DocProps,
  P,
  Template,
  Title,
  User,
  type UserProps,
} from '../components';

export type CommentMentionProps = {
  user: UserProps;
  doc: DocProps;
};

export function CommentMention(props: CommentMentionProps) {
  const { user, doc } = props;
  return (
    <Template>
      <Title>有人在评论中提到了你</Title>
      <Content>
        <P>
          <User {...user} /> 在 <Doc {...doc} /> 的评论中提到了你。
        </P>
        <Button href={doc.url}>查看评论</Button>
      </Content>
    </Template>
  );
}

CommentMention.PreviewProps = {
  user: TEST_USER,
  doc: TEST_DOC,
};
