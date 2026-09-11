import { Bold, Button, Content, P, Template } from '../components';

export type SetPasswordProps = {
  url: string;
};

export default function SetPassword(props: SetPasswordProps) {
  return (
    <Template>
      <Content>
        <P>
          点击下面的按钮设置密码，该链接将在 <Bold>30 分钟</Bold>后失效。
        </P>
        <Button href={props.url}>设置密码</Button>
      </Content>
    </Template>
  );
}

SetPassword.PreviewProps = {
  url: 'https://app.affine.pro',
};
