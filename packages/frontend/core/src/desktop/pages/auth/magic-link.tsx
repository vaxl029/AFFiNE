import { UserFriendlyError } from '@affine/error';
import { useService } from '@toeverything/infra';
import { useEffect, useRef } from 'react';
import {
  type LoaderFunction,
  redirect,
  useLoaderData,
  useNavigate,
} from 'react-router-dom';

import { AuthService } from '../../../modules/cloud';
import {
  buildAuthenticationDeepLink,
  buildOpenAppUrlRoute,
} from '../../../modules/open-in-app';
import { supportedClient } from './common';

interface LoaderData {
  token: string;
  email: string;
  redirectUri: string | null;
}

export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  const client = params.get('client');
  const email = params.get('email');
  const token = params.get('token');
  const redirectUri = params.get('redirect_uri');

  if (!email || !token) {
    return redirect('/sign-in?error=Invalid magic link');
  }

  const payload: LoaderData = {
    email,
    token,
    redirectUri,
  };

  if (!client || client === 'web') {
    return payload;
  }

  const clientCheckResult = supportedClient.safeParse(client);
  if (!clientCheckResult.success) {
    return redirect('/sign-in?error=Invalid callback parameters');
  }

  const urlToOpen = buildAuthenticationDeepLink({
    scheme: clientCheckResult.data,
    method: 'magic-link',
    payload,
    server: location.origin,
  });

  return redirect(buildOpenAppUrlRoute(urlToOpen));
};

export const Component = () => {
  // TODO(@eyhn): loading ui
  const auth = useService(AuthService);
  const data = useLoaderData() as LoaderData;

  const nav = useNavigate();
  // loader data from useLoaderData is not reactive, so that we can safely
  // assume the effect below is only triggered once
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) {
      return;
    }
    triggeredRef.current = true;

    // 邮件里的验证码和「点击登录」是同一把钥匙，谁先用掉另一个就作废。
    // 先输验证码登录、再回头点链接是很自然的操作顺序，此时这把钥匙已经
    // 兑现过了——本人就在线上，链接除了跳转没别的事要做。先认这个状态，
    // 免得发一个注定失败的请求，再拿它的报错去打扰一个已经登录的人。
    if (auth.session.account$.value?.email === data.email) {
      nav(data.redirectUri ?? '/', { replace: true });
      return;
    }

    auth
      .signInMagicLink(data.email, data.token)
      .then(() => {
        const subscription = auth.session.status$.subscribe(status => {
          if (status === 'authenticated') {
            nav(data.redirectUri ?? '/');
            subscription?.unsubscribe();
          }
        });
      })
      .catch(e => {
        // 兜住会话尚未恢复的情况：从邮件客户端点链接多半是新标签页，
        // 上面那个判断跑的时候 account$ 可能还是空的。等请求失败回来时
        // 会话通常已经就位，再确认一次，别把已登录的人扔回登录页。
        if (auth.session.status$.value === 'authenticated') {
          nav(data.redirectUri ?? '/', { replace: true });
          return;
        }

        // 传错误名而非后端原文，留给登录页去翻译
        const error = UserFriendlyError.fromAny(e);
        nav(`/sign-in?error=${encodeURIComponent(error.name)}`);
      });
  }, [auth, data, data.email, data.redirectUri, data.token, nav]);

  return null;
};
