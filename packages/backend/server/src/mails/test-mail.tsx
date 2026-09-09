import { Content, P, SITE_NAME, Template, Title } from './components';

export default function TestMail() {
  return (
    <Template>
      <Title>{`${SITE_NAME} 测试邮件`}</Title>
      <Content>
        <P>这是一封来自你自托管实例的测试邮件，收到即表示邮件服务配置正确。</P>
      </Content>
    </Template>
  );
}
