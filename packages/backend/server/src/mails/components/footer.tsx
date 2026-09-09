import { Container } from '@react-email/container';
import { Row } from '@react-email/row';
import { Section } from '@react-email/section';
import type { CSSProperties } from 'react';

import { BasicTextStyle, SITE_NAME } from './common';

const TextStyles: CSSProperties = {
  ...BasicTextStyle,
  color: '#8e8d91',
  marginTop: '8px',
};

export const Footer = () => {
  return (
    <Container
      style={{
        backgroundColor: '#fafafa',
        maxWidth: '450px',
        marginTop: '0',
        marginBottom: '32px',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0px 0px 20px 0px rgba(66, 65, 73, 0.04)',
        padding: '24px',
      }}
    >
      {/* 上游页脚是 5 个指向 affine.pro 的社交图标 + 官方标语 + ToEverything
          版权，图片还全部从 cdn.affine.pro 拉取——自托管站点既不该署上游的名，
          也不该让发出去的邮件依赖外部 CDN（对方网络访问不到就是一堆裂图）。
          这里只留一行版权，年份跟随实际渲染时间。 */}
      <Section align="center" width="auto">
        <Row style={TextStyles}>
          <td>
            © {new Date().getFullYear()} {SITE_NAME}
          </td>
        </Row>
      </Section>
    </Container>
  );
};
