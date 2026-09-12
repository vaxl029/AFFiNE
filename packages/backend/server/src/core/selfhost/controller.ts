import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  ActionForbidden,
  Config,
  InternalServerError,
  Mutex,
  PasswordRequired,
  UseNamedGuard,
} from '../../base';
import { Models } from '../../models';
import { Public, SessionIssuer } from '../auth';
import { ServerService } from '../config';
import { validators } from '../utils/validators';

interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
}

@UseNamedGuard('selfhost')
@Controller('/api/setup')
export class CustomSetupController {
  constructor(
    private readonly config: Config,
    private readonly models: Models,
    private readonly sessionIssuer: SessionIssuer,
    private readonly mutex: Mutex,
    private readonly server: ServerService
  ) {}

  @Public()
  @Post('/create-admin-user')
  async createAdmin(
    @Req() req: Request,
    @Res() res: Response,
    @Body() input: CreateUserInput
  ) {
    if (await this.server.initialized()) {
      throw new ActionForbidden('First user already created');
    }

    validators.assertValidEmail(input.email);

    if (!input.password) {
      throw new PasswordRequired();
    }

    validators.assertValidPassword(
      input.password,
      this.config.auth.passwordRequirements
    );

    await using lock = await this.mutex.acquire('createFirstAdmin');

    if (!lock) {
      throw new InternalServerError();
    }
    const user = await this.models.user.create({
      name: input.name || undefined,
      email: input.email,
      password: input.password,
      registered: true,
      // 首个管理员是在安装向导里自己填的邮箱，且这个账号此后只用密码登录，
      // 永远不会走 magic link 的 fulfill()——那是唯一补写此字段的地方。
      // 不在这里标记，它就永久停留在"邮箱未验证"，而 sendChangePasswordEmail
      // 恰恰要求 emailVerified：装完就再也改不了自己的密码。
      emailVerifiedAt: new Date(),
    });

    try {
      await this.models.userFeature.add(
        user.id,
        'administrator',
        'selfhost setup'
      );

      await this.sessionIssuer.issue(req, res, {
        userId: user.id,
        method: 'password',
      });
      res.send({ id: user.id, email: user.email, name: user.name });
    } catch (e) {
      await this.models.user.delete(user.id);
      throw e;
    }
  }
}
