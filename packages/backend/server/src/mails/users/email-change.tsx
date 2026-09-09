import { Bold, Button, Content, P, Template, Title } from '../components';

export type ChangeEmailProps = {
  url: string;
};

export default function ChangeEmail(props: ChangeEmailProps) {
  return (
    <Template>
      <Title>验证你当前的邮箱</Title>
      <Content>
        <P>
          你请求更换与账号绑定的邮箱地址。
          <br />
          请点击下面的链接完成验证。
        </P>
        <P>
          该链接将在 <Bold>30 分钟</Bold>后失效。
        </P>
        <Button href={props.url}>验证并设置新邮箱</Button>
      </Content>
    </Template>
  );
}

ChangeEmail.PreviewProps = {
  url: 'https://app.affine.pro',
};
