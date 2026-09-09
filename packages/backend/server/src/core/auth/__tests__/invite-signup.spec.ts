import test from 'ava';

import type { Cache } from '../../../base';
import { InviteLinkSignupService } from '../invite-signup';

type Stored = { value: unknown; ttl: number };

// 用内存实现替代 Redis：只需要覆盖 get / ttl / increaseWithTtl，
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
    // CacheProvider 对不存在的 key 返回 -2
    return this.store.get(key)?.ttl ?? -2;
  }

  async increaseWithTtl(key: string, ttl: number, count = 1): Promise<number> {
    if (!Number.isFinite(ttl) || ttl <= 0) return 0;
    const next = (this.counters.get(key) ?? 0) + count;
    this.counters.set(key, next);
    return next;
  }
}

const INVITE_ID = 'S135wpK34X_hvjy5anoD';
const linkKey = `workspace:inviteLinkId:${INVITE_ID}`;

function setup(payload?: unknown, ttl = 3600) {
  const cache = new FakeCache();
  if (payload !== undefined) {
    cache.set(linkKey, payload, ttl);
  }
  return {
    cache,
    service: new InviteLinkSignupService(cache as unknown as Cache),
  };
}

const validLink = { workspaceId: 'w1', inviterUserId: 'u1' };

test('rejects when no invite id is supplied', async t => {
  const { service } = setup(validLink);

  t.false(await service.claimSignup(undefined));
  t.false(await service.claimSignup(null));
  t.false(await service.claimSignup(''));
});

test('rejects an unknown, expired or revoked link', async t => {
  const { service } = setup();

  t.false(await service.claimSignup(INVITE_ID));
});

test('rejects when the link has no valid ttl left', async t => {
  const { service } = setup(validLink, -1);

  t.false(await service.claimSignup(INVITE_ID));
});

test('one link grants exactly one signup', async t => {
  const { service } = setup(validLink);

  t.true(await service.claimSignup(INVITE_ID));
  // 同一条链接不再放行第二个账号——注册创建的是实例级账号，
  // 不是工作区席位，界面上也没有让人填数量的地方。
  t.false(await service.claimSignup(INVITE_ID));
  t.false(await service.claimSignup(INVITE_ID));
});

test('each link is counted independently', async t => {
  const cache = new FakeCache();
  const other = 'AnotherInviteId1234';
  cache.set(linkKey, validLink, 3600);
  cache.set(`workspace:inviteLinkId:${other}`, validLink, 3600);
  const service = new InviteLinkSignupService(cache as unknown as Cache);

  t.true(await service.claimSignup(INVITE_ID));
  t.true(await service.claimSignup(other));
  t.false(await service.claimSignup(INVITE_ID));
  t.false(await service.claimSignup(other));
});
