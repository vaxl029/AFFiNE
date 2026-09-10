import { Injectable, Logger } from '@nestjs/common';

import {
  ActionForbidden,
  Config,
  CryptoHelper,
  InvalidAuthState,
  InvalidEmail,
  InvalidEmailToken,
  SignUpForbidden,
  URLHelper,
  WrongSignInCredentials,
} from '../../base';
import { Models, TokenType } from '../../models';
import type { MailDeliveryMetadata } from '../mail/types';
import { validators } from '../utils/validators';
import { verifyEmailDomainRecords } from './email-domain';
import type { VerifiedIdentity } from './identity';
import { InviteLinkSignupService, parseInviteId } from './invite-signup';
import { AuthService } from './service';

@Injectable()
export class MagicLinkAuthService {
  private readonly logger = new Logger(MagicLinkAuthService.name);

  constructor(
    private readonly url: URLHelper,
    private readonly auth: AuthService,
    private readonly models: Models,
    private readonly config: Config,
    private readonly crypto: CryptoHelper,
    private readonly inviteSignup: InviteLinkSignupService
  ) {}

  async send(
    email: string,
    callbackUrl = '/magic-link',
    clientNonce?: string,
    metadata?: Pick<MailDeliveryMetadata, 'source'>,
    inviteId?: string
  ) {
    validators.assertValidEmail(email);

    if (!this.url.isAllowedCallbackUrl(callbackUrl)) {
      throw new ActionForbidden();
    }

    const callbackUrlObj = this.url.url(callbackUrl);
    const redirectUriInCallback =
      callbackUrlObj.searchParams.get('redirect_uri');
    if (
      redirectUriInCallback &&
      !this.url.isAllowedRedirectUri(redirectUriInCallback)
    ) {
      throw new ActionForbidden();
    }

    const user = await this.models.user.getUserByEmail(email, {
      withDisabled: true,
    });

    if (!user) {
      // 未登录用户点邀请链接会被送到 /sign-in?redirect_uri=/invite/:inviteId，
      // 登录请求把它原样放进 callbackUrl。显式传入的 inviteId 优先，
      // 否则从这个已经过 isAllowedRedirectUri 校验的地址里取。
      await this.assertSignupAllowed(
        email,
        inviteId ?? parseInviteId(redirectUriInCallback)
      );
    } else if (user.disabled) {
      throw new WrongSignInCredentials({ email });
    }

    const ttlInSec = 30 * 60;
    const { token, expiresAt: tokenExpiresAt } =
      await this.models.verificationToken.createWithExpiresAt(
        TokenType.SignIn,
        email,
        ttlInSec
      );

    const otp = this.crypto.otp();
    const { expiresAt: otpExpiresAt } = await this.models.magicLinkOtp.upsert(
      email,
      otp,
      token,
      clientNonce
    );

    const magicLink = this.url.link(callbackUrl, { token: otp, email });
    if (env.dev) {
      this.logger.debug(`Magic link: ${magicLink}`);
    }

    await this.auth.sendSignInEmail(email, magicLink, otp, !user, {
      ...metadata,
      expiresAt:
        tokenExpiresAt.getTime() < otpExpiresAt.getTime()
          ? tokenExpiresAt
          : otpExpiresAt,
    });

    return { email };
  }

  async verify(
    email: string,
    otp: string,
    clientNonce?: string
  ): Promise<VerifiedIdentity> {
    validators.assertValidEmail(email);

    const consumed = await this.models.magicLinkOtp.consume(
      email,
      otp,
      clientNonce
    );
    if (!consumed.ok) {
      if (consumed.reason === 'nonce_mismatch') {
        throw new InvalidAuthState();
      }
      throw new InvalidEmailToken();
    }

    const tokenRecord = await this.models.verificationToken.verify(
      TokenType.SignIn,
      consumed.token,
      {
        credential: email,
      }
    );

    if (!tokenRecord) {
      throw new InvalidEmailToken();
    }

    const user = await this.models.user.fulfill(email);

    return { userId: user.id, method: 'magic_link' };
  }

  private async assertSignupAllowed(email: string, inviteId?: string) {
    // 关闭公开注册后，"邀请新人"上游只留了邮箱邀请一条路（那条会预建用户
    // 记录所以不受影响），邀请链接则必然撞 SignUpForbidden。这里放行持有
    // 有效邀请链接的注册，一条链接只认一次——链接可转发，只验过期等于
    // 开放注册。
    if (
      !this.config.auth.allowSignup &&
      !(await this.inviteSignup.claimSignup(inviteId))
    ) {
      throw new SignUpForbidden();
    }

    if (!this.config.auth.requireEmailDomainVerification) {
      return;
    }

    if (!(await verifyEmailDomainRecords(email))) {
      throw new InvalidEmail({ email });
    }
  }
}
