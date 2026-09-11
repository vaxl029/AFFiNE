import { Bold, Button, Content, P, Template } from '../components';

export type VerifyEmailProps = {
  url: string;
};

export default function VerifyEmail(props: VerifyEmailProps) {
  return (
    <Template>
      <Content>
        <P>
          你请求验证与账号绑定的邮箱地址。
          <br />
          请点击下面的链接完成验证。
        </P>
        <P>
          该链接将在 <Bold>30 分钟</Bold>后失效。
        </P>
        <Button href={props.url}>验证邮箱</Button>
      </Content>
    </Template>
  );
}

VerifyEmail.PreviewProps = {
  url: 'https://app.affine.pro',
};
