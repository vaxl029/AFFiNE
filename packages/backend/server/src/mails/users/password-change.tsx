import { Bold, Button, Content, P, Template, Title } from '../components';

export type ChangePasswordProps = {
  url: string;
};

export default function ChangePassword(props: ChangePasswordProps) {
  return (
    <Template>
      <Title>修改你的密码</Title>
      <Content>
        <P>
          点击下面的按钮重置密码，该链接将在 <Bold>30 分钟</Bold>后失效。
        </P>
        <Button href={props.url}>重置密码</Button>
      </Content>
    </Template>
  );
}

ChangePassword.PreviewProps = {
  url: 'https://app.affine.pro',
};
