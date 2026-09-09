import test from 'ava';

import type { Cache } from '../../../base';
import { InviteLinkSignupService } from '../invite-signup';

type Stored = { value: unknown; ttl: number };

// 用内存实现替代 Redis：只需要覆盖 get / ttl / increaseWithTtl / decrease，
// 语义与 CacheProvider 对齐（increaseWithTtl 在 ttl 非法时返回 0）。
class FakeCache {
  private readonly store = new Map<string, Stored>();
  private readonly counters = new Map<string, number>();

  set(key: string, value: unknown, ttl: number) {
    this.store.set(key, { value, ttl });
  }

  async get<T>(key: string): Promise<T> {
    return this.store.get(key)?.value as T;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    // CacheProvider 对不存在的 key 返回 -2
    return entry ? entry.ttl : -2;
  }

  async increaseWithTtl(key: string, ttl: number, count = 1): Promise<number> {
    if (!Number.isFinite(ttl) || ttl <= 0) return 0;
    const next = (this.counters.get(key) ?? 0) + count;
    this.counters.set(key, next);
    return next;
  }

  async decrease(key: string, count = 1): Promise<number> {
    const next = (this.counters.get(key) ?? 0) - count;
    this.counters.set(key, next);
    return next;
  }

  countOf(key: string) {
    return this.counters.get(key) ?? 0;
  }
}

const INVITE_ID = 'S135wpK34X_hvjy5anoD';
const linkKey = `workspace:inviteLinkId:${INVITE_ID}`;
const countKey = `workspace:inviteLinkSignup:${INVITE_ID}`;

function setup(payload?: unknown, ttl = 3600) {
  const cache = new FakeCache();
  if (payload !== undefined) {
    cache.set(linkKey, payload, ttl);
  }
  const service = new InviteLinkSignupService(cache as unknown as Cache);
  return { cache, service };
}

test('rejects when no invite id is supplied', async t => {
  const { service } = setup({ workspaceId: 'w1', signupQuota: 5 });

  t.false(await service.consumeSignupQuota(undefined));
  t.false(await service.consumeSignupQuota(null));
  t.false(await service.consumeSignupQuota(''));
});

test('rejects an unknown or expired link', async t => {
  // cache 里没有这条记录：链接不存在、已过期，或已被 revoke
  const { service } = setup();

  t.false(await service.consumeSignupQuota(INVITE_ID));
});

test('rejects a link issued before the quota existed', async t => {
  // 老链接的 payload 没有 signupQuota 字段，不能因此变成无限名额
  const { service } = setup({ workspaceId: 'w1', inviterUserId: 'u1' });

  t.false(await service.consumeSignupQuota(INVITE_ID));
});

test('rejects when the workspace had no free seat at issue time', async t => {
  const { service } = setup({ workspaceId: 'w1', signupQuota: 0 });

  t.false(await service.consumeSignupQuota(INVITE_ID));
});

test('allows signups up to the quota then stops', async t => {
  const { cache, service } = setup({ workspaceId: 'w1', signupQuota: 2 });

  t.true(await service.consumeSignupQuota(INVITE_ID));
  t.true(await service.consumeSignupQuota(INVITE_ID));
  // 第三次超额
  t.false(await service.consumeSignupQuota(INVITE_ID));
  // 超额的那次自增必须退回，否则并发下计数会持续虚高
  t.is(cache.countOf(countKey), 2);
  // 用满之后持续拒绝
  t.false(await service.consumeSignupQuota(INVITE_ID));
  t.is(cache.countOf(countKey), 2);
});

test('rejects when the link has no valid ttl left', async t => {
  const { service } = setup({ workspaceId: 'w1', signupQuota: 5 }, -1);

  t.false(await service.consumeSignupQuota(INVITE_ID));
});
