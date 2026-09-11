import {
  Button,
  Content,
  OnelineCodeBlock,
  P,
  SecondaryText,
  Template,
} from '../components';

export type SignInProps = {
  url: string;
  otp: string;
  serverName?: string;
};

export default function SignIn(props: SignInProps) {
  return (
    <Template>
      <Content>
        <P>你正在登录，验证码如下：</P>
        <OnelineCodeBlock>{props.otp}</OnelineCodeBlock>
        <P>也可以直接点击下面的登录链接：</P>
        <Button href={props.url}>点击登录</Button>
        <P>
          <SecondaryText>验证码与链接将在 30 分钟后失效。</SecondaryText>
        </P>
      </Content>
    </Template>
  );
}

SignIn.PreviewProps = {
  url: 'https://app.affine.pro/magic-link?token=123456&email=test@test.com',
  otp: '123456',
};
