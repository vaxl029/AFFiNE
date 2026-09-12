import { Injectable } from '@nestjs/common';

import { Cache, isValidCacheTtl } from '../../base';

// ---------------------------------------------------------------------------
// Invite-link signup
// ---------------------------------------------------------------------------
// 上游把"邀请新人"完全押在邮箱邀请上：邮箱邀请会预建 registered=false 的
// 用户记录，所以不受 auth.allowSignup 影响；而邀请链接不建用户，要求对方
// 已有账号（member.ts 的 acceptInviteById 对 link 分支直接抛
// AuthenticationRequired）。于是关掉公开注册后，UI 仍允许生成邀请链接，
// 对方点进去却只会撞上 SignUpForbidden——链接等于废的。
//
// 这里补上缺失的那条路：持有有效邀请链接的人可以注册，且**一条链接只能
// 注册一个账号**。注册创建的是实例级账号，不是工作区内的席位，所以它的
// 授权范围必须比"能加入多少人"小得多；界面上也没有让人填数量的地方，
// 那就没有理由凭空放大成多个。
//
// 一次性由 increaseWithTtl 这个原子自增保证：只有返回 1 的那次是首次，
// 并发下也只有一个请求能拿到。计数与链接同生命周期，链接被 revoke 或
// 过期后计数自然消失。
// ---------------------------------------------------------------------------

export type InviteLinkPayload = {
  workspaceId: string;
  inviterUserId: string;
};

export const inviteLinkCacheKey = (inviteId: string) =>
  `workspace:inviteLinkId:${inviteId}`;

const inviteLinkSignupCountKey = (inviteId: string) =>
  `workspace:inviteLinkSignup:${inviteId}`;

/**
 * 记住某人的加入申请是在哪条链接上被驳回的。
 *
 * 驳回针对的是那一次申请，不是把人永久拒之门外：同一条链接不该再用，
 * 但管理员另发一条新链接就意味着他改了主意，那条应当放行。两者的区别
 * 只在 inviteId，所以把它记下来。
 *
 * 放在缓存里而不是建表，是因为邀请链接本身就活在缓存里——这条记录跟着
 * 链接一起过期，语义正好。丢了的后果也只是对方能再申请一次。
 */
export const declinedViaLinkCacheKey = (workspaceId: string, userId: string) =>
  `workspace:declinedVia:${workspaceId}:${userId}`;

// 只认站内的 /invite/:inviteId，且 inviteId 必须是 nanoid 那种字符集。
// 传进来的地址已经过 isAllowedRedirectUri 校验（站内路径或白名单域名），
// 这里再收一次口，避免把任意字符串当成 cache key 去查。
const INVITE_PATH = /^\/invite\/([A-Za-z0-9_-]{1,128})\/?$/;

/**
 * 从 /sign-in?redirect_uri=... 的目标地址里取出邀请标识。
 */
export function parseInviteId(
  redirectUri: string | null | undefined
): string | undefined {
  if (!redirectUri) {
    return undefined;
  }

  const path = redirectUri.split('?')[0].split('#')[0];
  return INVITE_PATH.exec(path)?.[1];
}

@Injectable()
export class InviteLinkSignupService {
  constructor(private readonly cache: Cache) {}

  /**
   * 这条链接现在还能不能换一个注册名额——只读，不消耗。
   *
   * 登录预检要靠它决定是否把 magicLink 标为可用；预检可能被重复调用
   * （用户改一次邮箱就是一次），绝不能在这里 claim，否则名额会被白白
   * 烧掉，人还没收到邮件链接就失效了。
   */
  async canClaimSignup(inviteId?: string | null): Promise<boolean> {
    if (!inviteId) {
      return false;
    }

    const key = inviteLinkCacheKey(inviteId);
    const payload = await this.cache.get<InviteLinkPayload>(key);
    if (!payload?.workspaceId) {
      return false;
    }

    if (!isValidCacheTtl(await this.cache.ttl(key))) {
      return false;
    }

    // 计数由 INCR 写入，落在 Redis 里是裸数字字符串，正好是合法 JSON，
    // 能被 Cache.get 的 JSON.parse 原样读回；键不存在时得到 undefined。
    const used = await this.cache.get<number>(
      inviteLinkSignupCountKey(inviteId)
    );

    return !used;
  }

  /**
   * 认领这条邀请链接唯一的一次注册机会。
   *
   * 返回 true 表示本次注册可以豁免 allowSignup。任何一个条件不满足都返回
   * false，调用方据此维持原有的 SignUpForbidden，不泄露"链接是否存在"。
   */
  async claimSignup(inviteId?: string | null): Promise<boolean> {
    if (!inviteId) {
      return false;
    }

    const key = inviteLinkCacheKey(inviteId);
    const payload = await this.cache.get<InviteLinkPayload>(key);
    if (!payload?.workspaceId) {
      // 链接不存在、已过期，或已被 revoke
      return false;
    }

    const ttl = await this.cache.ttl(key);
    if (!isValidCacheTtl(ttl)) {
      return false;
    }

    const used = await this.cache.increaseWithTtl(
      inviteLinkSignupCountKey(inviteId),
      ttl,
      1
    );

    // 首次自增返回 1；之后恒大于 1，链接不再放行注册。
    // increaseWithTtl 失败时返回 0，同样不放行。
    return used === 1;
  }
}
