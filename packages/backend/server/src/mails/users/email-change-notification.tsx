import { Content, Name, P, Template, Title } from '../components';

export type ChangeEmailNotificationProps = {
  to: string;
};

export default function ChangeEmailNotification(
  props: ChangeEmailNotificationProps
) {
  return (
    <Template>
      <Title>账号邮箱已变更</Title>
      <Content>
        <P>
          你的邮箱已按请求完成变更，下次请使用 <Name>{props.to}</Name> 登录。
        </P>
      </Content>
    </Template>
  );
}

ChangeEmailNotification.PreviewProps = {
  to: 'test@affine.pro',
};
