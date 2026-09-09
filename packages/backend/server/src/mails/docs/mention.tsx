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

export type MentionProps = {
  user: UserProps;
  doc: DocProps;
};

export function Mention(props: MentionProps) {
  const { user, doc } = props;
  return (
    <Template>
      <Title>有人提到了你</Title>
      <Content>
        <P>
          <User {...user} /> 在 <Doc {...doc} /> 中提到了你。
        </P>
        <Button href={doc.url}>打开文档</Button>
      </Content>
    </Template>
  );
}

Mention.PreviewProps = {
  user: TEST_USER,
  doc: TEST_DOC,
};
