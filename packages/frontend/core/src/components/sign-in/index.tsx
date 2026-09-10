import { DefaultServerService, type Server } from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { FrameworkScope, useService } from '@toeverything/infra';
import { useState } from 'react';

import { AddSelfhostedStep } from './add-selfhosted';
import { SignInStep } from './sign-in';
import { SignInWithEmailStep } from './sign-in-with-email';
import { SignInWithPasswordStep } from './sign-in-with-password';

export type SignInStep =
  | 'signIn'
  | 'signInWithPassword'
  | 'signInWithEmail'
  | 'addSelfhosted';

export interface SignInState {
  step: SignInStep;
  server?: Server;
  initialServerBaseUrl?: string;
  email?: string;
  hasPassword?: boolean;
  redirectUrl?: string;
}

export const SignInPanel = ({
  onSkip,
  server: initialServerBaseUrl,
  initStep,
  onAuthenticated,
  redirectUrl,
}: {
  onAuthenticated?: (status: AuthSessionStatus) => void;
  onSkip: () => void;
  server?: string;
  initStep?: SignInStep | undefined;
  /**
   * 登录成功后要去的站内地址。SignInState 一直留着这个字段，但没人往里
   * 填过，于是 magic link 的回跳地址恒为空——从 /invite/:id 过来的人登录
   * 完会被扔回首页，而不是回到邀请确认页。
   */
  redirectUrl?: string;
}) => {
  const [state, setState] = useState<SignInState>({
    step: initStep
      ? initStep
      : initialServerBaseUrl
        ? 'addSelfhosted'
        : 'signIn',
    initialServerBaseUrl: initialServerBaseUrl,
    redirectUrl,
  });

  const defaultServerService = useService(DefaultServerService);

  const step = state.step;
  const server = state.server ?? defaultServerService.server;

  return (
    <FrameworkScope scope={server.scope}>
      {step === 'signIn' ? (
        <SignInStep
          state={state}
          changeState={setState}
          onSkip={onSkip}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'signInWithEmail' ? (
        <SignInWithEmailStep
          state={state}
          changeState={setState}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'signInWithPassword' ? (
        <SignInWithPasswordStep
          state={state}
          changeState={setState}
          onAuthenticated={onAuthenticated}
        />
      ) : step === 'addSelfhosted' ? (
        <AddSelfhostedStep state={state} changeState={setState} />
      ) : null}
    </FrameworkScope>
  );
};
