import { Body } from '@react-email/body';
import { Button as EmailButton } from '@react-email/button';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Row } from '@react-email/row';
import { Section } from '@react-email/section';
import { Text as EmailText } from '@react-email/text';
import type { PropsWithChildren } from 'react';

import { BasicTextStyle, SITE_NAME } from './common';
import { Footer } from './footer';

export function Title(props: PropsWithChildren) {
  return (
    <EmailText
      style={{
        ...BasicTextStyle,
        fontSize: '20px',
        fontWeight: '600',
        lineHeight: '28px',
      }}
    >
      {props.children}
    </EmailText>
  );
}

export function P(props: PropsWithChildren) {
  return <EmailText style={BasicTextStyle}>{props.children}</EmailText>;
}

export function Text(props: PropsWithChildren) {
  return <span style={BasicTextStyle}>{props.children}</span>;
}

export function SecondaryText(props: PropsWithChildren) {
  return (
    <span
      style={{
        ...BasicTextStyle,
        color: '#7A7A7A',
        fontSize: '14px',
        lineHeight: '22px',
      }}
    >
      {props.children}
    </span>
  );
}

export function Bold(props: PropsWithChildren) {
  return <span style={{ fontWeight: 600 }}>{props.children}</span>;
}

export const Avatar = (props: {
  img: string;
  width?: string;
  height?: string;
}) => {
  return (
    <img
      src={props.img}
      alt="avatar"
      style={{
        width: props.width || '20px',
        height: props.height || '20px',
        borderRadius: '12px',
        objectFit: 'cover',
        verticalAlign: 'middle',
      }}
    />
  );
};

export const OnelineCodeBlock = (props: PropsWithChildren) => {
  return (
    <pre
      style={{
        ...BasicTextStyle,
        whiteSpace: 'nowrap',
        border: '1px solid rgba(0,0,0,.1)',
        padding: '8px 10px',
        borderRadius: '4px',
        backgroundColor: '#F5F5F5',
      }}
    >
      {props.children}
    </pre>
  );
};

export const Name = (props: PropsWithChildren) => {
  return <Bold>{props.children}</Bold>;
};

export const AvatarWithName = (props: {
  img?: string;
  name: string;
  width?: string;
  height?: string;
}) => {
  return (
    <>
      {props.img && (
        <Avatar img={props.img} width={props.width} height={props.height} />
      )}
      <Name>{props.name}</Name>
    </>
  );
};

export function Content(props: PropsWithChildren) {
  return typeof props.children === 'string' ? (
    <EmailText>{props.children}</EmailText>
  ) : (
    props.children
  );
}

export function Button(
  props: PropsWithChildren<{ type?: 'primary' | 'secondary'; href: string }>
) {
  const style = {
    ...BasicTextStyle,
    backgroundColor: props.type === 'secondary' ? '#FFFFFF' : '#1E96EB',
    color: props.type === 'secondary' ? '#141414' : '#FFFFFF',
    textDecoration: 'none',
    fontWeight: '600',
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,.1)',
    marginRight: '4px',
  };

  return (
    <EmailButton style={style} href={props.href}>
      {props.children}
    </EmailButton>
  );
}

/**
 * 标题是可选的。页头已经写着站点名，短邮件再顶一行标题往往只是重复，
 * 所以这里返回 null 让调用方跳过整个 Section，而不是像上游那样强制要求。
 */
function fetchTitle(
  children: React.ReactElement<PropsWithChildren>[]
): React.ReactElement | null {
  const title = children.find(child => child.type === Title);

  return title?.props.children ? title : null;
}

function fetchContent(
  children: React.ReactElement<PropsWithChildren>[]
): React.ReactElement | React.ReactElement[] {
  const content = children.find(child => child.type === Content);

  if (!content || !content.props.children) {
    throw new Error('<Content /> is required for an email.');
  }

  if (Array.isArray(content.props.children)) {
    return content.props.children.map((child, i) => {
      /* oxlint-disable-next-line react/no-array-index-key */
      return <Row key={i}>{child}</Row>;
    });
  }

  return content;
}

/**
 * 归一成数组。标题可选之后，只写一个 <Content /> 的邮件其 children 就不再
 * 是数组，上游那句 Array.isArray 断言会直接把这类模板判死。
 */
function toChildrenArray(
  children: React.ReactNode
): React.ReactElement<PropsWithChildren>[] {
  const list = Array.isArray(children) ? children : [children];

  if (
    !list.every(
      child => !!child && typeof child === 'object' && 'type' in child
    )
  ) {
    throw new Error(
      'Children of `Template` element must be [<Title />?, <Content />, ...]'
    );
  }

  return list as React.ReactElement<PropsWithChildren>[];
}

export function Template(props: PropsWithChildren) {
  const children = toChildrenArray(props.children);
  const title = fetchTitle(children);

  const content = (
    <>
      {title ? <Section>{title}</Section> : null}
      <Section>{fetchContent(children)}</Section>
    </>
  );

  if (globalThis.env?.testing) {
    return content;
  }

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f7fb', overflow: 'hidden' }}>
        <Container
          style={{
            backgroundColor: '#fff',
            maxWidth: '450px',
            margin: '32px auto 0',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0px 0px 20px 0px rgba(66, 65, 73, 0.04)',
            padding: '24px',
          }}
        >
          {/* 上游这里是从 cdn.affine.pro 拉取的 AFFiNE logo 且链接到官网。
              换成纯文字站点名：不署上游的名，也不依赖外部 CDN——邮件客户端
              拦截远程图片时也不会变成裂图。 */}
          <Section>
            <EmailText
              style={{
                ...BasicTextStyle,
                fontSize: '20px',
                fontWeight: '600',
                margin: '0',
              }}
            >
              {SITE_NAME}
            </EmailText>
          </Section>
          {content}
        </Container>
        <Footer />
      </Body>
    </Html>
  );
}
