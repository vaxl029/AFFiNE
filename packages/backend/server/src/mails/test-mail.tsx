import { Content, P, Template } from './components';

// Template 的页头已经是站点名，标题再写一遍就是重复，索性不要标题。
export default function TestMail() {
  return (
    <Template>
      <Content>
        <P>这是一封来自你自托管实例的测试邮件，收到即表示邮件服务配置正确。</P>
      </Content>
    </Template>
  );
}
