import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Site identity
// ---------------------------------------------------------------------------
// 邮件模板是纯渲染函数，拿不到 Config，所以站点名在这里写死。想改成从
// server.name 注入的话要改造 render.ts 整条调用链，站点名不常变，不值当。
// 邮件主题（mails/index.tsx）与页脚版权都引用这里。
// ---------------------------------------------------------------------------
export const SITE_NAME = '地球OL日志';

export const BasicTextStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: '400',
  lineHeight: '24px',
  fontFamily: 'Inter, Arial, Helvetica, sans-serif',
  marginTop: '24px',
  marginBottom: '0',
  color: '#141414',
};
