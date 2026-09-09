import { Injectable } from '@nestjs/common';

import { Cache, isValidCacheTtl } from '../../base';

// ---------------------------------------------------------------------------
// Invite-link signup quota
// ---------------------------------------------------------------------------
// 上游把"邀请新人"完全押在邮箱邀请上：邮箱邀请会预建 registered=false 的
// 用户记录，所以不受 auth.allowSignup 影响；而邀请链接不建用户，要求对方
// 已有账号（member.ts 的 acceptInviteById 对 link 分支直接抛
// AuthenticationRequired）。于是关掉公开注册后，UI 仍允许生成邀请链接，
// 对方点进去却只会撞上 SignUpForbidden——链接等于废的。
//
// 这里补上缺失的那条路：持有有效邀请链接的人可以注册。但链接是可转发的，
// 只校验"未过期"等于开了一个开放注册入口，所以额外约束注册次数：
//
//   1. 链接必须仍在 cache 中（未过期、未被 revoke）；
//   2. 每条链接有注册名额，生成链接时按当时的剩余席位快照写入；
//   3. 每次放行消耗一个名额，用满即止，计数与链接同生命周期。
//
// 注册成功不等于入群：通过链接加入仍是 UnderReview，要管理员批准，
// 真正的席位约束也还在 accept 那一步。这里挡的是"拿一条链接批量注册账号"。
// ---------------------------------------------------------------------------

export type InviteLinkPayload = {
  workspaceId: string;
  inviterUserId: string;
  /** 剩余可用于注册的名额，缺省视为 0（旧链接不放行注册） */
  signupQuota?: number;
};

export const inviteLinkCacheKey = (inviteId: string) =>
  `workspace:inviteLinkId:${inviteId}`;

const inviteLinkSignupCountKey = (inviteId: string) =>
  `workspace:inviteLinkSignup:${inviteId}`;

@Injectable()
export class InviteLinkSignupService {
  constructor(private readonly cache: Cache) {}

  /**
   * 消费一个注册名额。返回 true 表示这次注册可以豁免 allowSignup。
   *
   * 任何一个条件不满足都返回 false，调用方据此维持原有的 SignUpForbidden，
   * 不泄露"链接是否存在"这类信息。
   */
  async consumeSignupQuota(inviteId?: string | null): Promise<boolean> {
    if (!inviteId) {
      return false;
    }

    const key = inviteLinkCacheKey(inviteId);
    const payload = await this.cache.get<InviteLinkPayload>(key);
    if (!payload?.workspaceId) {
      return false;
    }

    const quota = payload.signupQuota ?? 0;
    if (quota <= 0) {
      return false;
    }

    // 计数跟着链接一起过期，链接被 revoke 后残留的计数也会自然消失
    const ttl = await this.cache.ttl(key);
    if (!isValidCacheTtl(ttl)) {
      return false;
    }

    const used = await this.cache.increaseWithTtl(
      inviteLinkSignupCountKey(inviteId),
      ttl,
      1
    );

    // increaseWithTtl 失败时返回 0，同样视为不放行
    if (used <= 0 || used > quota) {
      if (used > 0) {
        // 超额的这次自增要退回去，否则并发下计数会持续虚高
        await this.cache.decrease(inviteLinkSignupCountKey(inviteId), 1);
      }
      return false;
    }

    return true;
  }
}
