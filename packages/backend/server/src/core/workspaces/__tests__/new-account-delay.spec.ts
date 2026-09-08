import test from 'ava';

import type { Config } from '../../../base';
import {
  canUserExecuteLimitedActions,
  newAccountActionDelayMs,
} from '../abuse';

const DELAY_SECONDS = 24 * 60 * 60;
const config = {
  auth: { newAccountShareActionDelay: DELAY_SECONDS },
} as Config;

let originalDeploymentType: typeof env.DEPLOYMENT_TYPE;

const deployAs = (type: 'affine' | 'selfhosted') => {
  // @ts-expect-error test: 全局 env 在运行期是只读的
  env.DEPLOYMENT_TYPE = type;
};

test.beforeEach(() => {
  originalDeploymentType = env.DEPLOYMENT_TYPE;
});

test.afterEach.always(() => {
  // @ts-expect-error test
  env.DEPLOYMENT_TYPE = originalDeploymentType;
});

test.serial('cloud keeps the configured new-account observation window', t => {
  deployAs('affine');

  t.is(newAccountActionDelayMs(config), DELAY_SECONDS * 1000);

  const freshAccount = { createdAt: new Date() };
  t.false(
    canUserExecuteLimitedActions(freshAccount, newAccountActionDelayMs(config))
  );
});

test.serial('selfhost drops the new-account observation window', t => {
  deployAs('selfhosted');

  t.is(newAccountActionDelayMs(config), 0);

  // 刚注册的账号也应能立即邀请成员 / 创建分享链接，与 native rolling
  // quota 的 self-host 分支保持一致。
  const freshAccount = { createdAt: new Date() };
  t.true(
    canUserExecuteLimitedActions(freshAccount, newAccountActionDelayMs(config))
  );
});
