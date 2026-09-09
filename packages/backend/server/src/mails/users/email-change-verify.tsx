import { Button, Content, P, Template, Title } from '../components';

export type VerifyChangeEmailProps = {
  url: string;
};

export default function VerifyChangeEmail(props: VerifyChangeEmailProps) {
  return (
    <Template>
      <Title>验证你的新邮箱地址</Title>
      <Content>
        <P>
          你请求更换与账号绑定的邮箱地址。请点击下面的链接完成验证，该链接将在
          30 分钟后失效。
        </P>
        <Button href={props.url}>验证新邮箱</Button>
      </Content>
    </Template>
  );
}

VerifyChangeEmail.PreviewProps = {
  url: 'https://app.affine.pro',
};
