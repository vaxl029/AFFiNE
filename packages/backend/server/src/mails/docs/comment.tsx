import { TEST_DOC, TEST_USER } from '../common';
import {
  Button,
  Content,
  Doc,
  type DocProps,
  P,
  Template,
  User,
  type UserProps,
} from '../components';

export type CommentProps = {
  user: UserProps;
  doc: DocProps;
};

export function Comment(props: CommentProps) {
  const { user, doc } = props;
  return (
    <Template>
      <Content>
        <P>
          <User {...user} /> 评论了 <Doc {...doc} />。
        </P>
        <Button href={doc.url}>查看评论</Button>
      </Content>
    </Template>
  );
}

Comment.PreviewProps = {
  user: TEST_USER,
  doc: TEST_DOC,
};
