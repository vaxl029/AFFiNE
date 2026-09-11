import {
  Button,
  Content,
  OnelineCodeBlock,
  P,
  SecondaryText,
  Template,
} from '../components';

export type SignUpProps = {
  url: string;
  otp: string;
  serverName?: string;
};

export default function SignUp(props: SignUpProps) {
  return (
    <Template>
      <Content>
        <P>你正在注册账号，验证码如下：</P>
        <OnelineCodeBlock>{props.otp}</OnelineCodeBlock>
        <P>也可以直接点击下面的注册链接：</P>
        <Button href={props.url}>点击注册</Button>
        <P>
          <SecondaryText>验证码与链接将在 30 分钟后失效。</SecondaryText>
        </P>
      </Content>
    </Template>
  );
}

SignUp.PreviewProps = {
  url: 'https://app.affine.pro/magic-link?token=123456&email=test@test.com',
  otp: '123456',
};
