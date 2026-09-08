import test from 'ava';

import {
  blocksInviteByWorkspaceName,
  containsUrlOrDomain,
} from '../content-policy';

// ava.config.js 默认把测试跑在 DEPLOYMENT_TYPE=affine 下，逐例改写并还原。
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

// --- Cloud：保持原有 anti-abuse 行为 -------------------------------------
test.serial(
  'cloud still blocks invites from domain-like workspace names',
  t => {
    deployAs('affine');

    t.true(blocksInviteByWorkspaceName('wei.ch'));
    t.true(blocksInviteByWorkspaceName('https://example.com'));
  }
);

test.serial('cloud allows invites from ordinary workspace names', t => {
  deployAs('affine');

  t.false(blocksInviteByWorkspaceName('My Workspace'));
});

// --- Self-host：跳过 Cloud-only 策略 --------------------------------------
test.serial('selfhost allows invites from domain-like workspace names', t => {
  deployAs('selfhosted');

  t.false(blocksInviteByWorkspaceName('wei.ch'));
  t.false(blocksInviteByWorkspaceName('https://example.com'));
});

// --- 原语语义不被 deployment 判断污染 --------------------------------------
test.serial(
  'the underlying content policy primitive stays deployment-agnostic',
  t => {
    deployAs('selfhosted');

    t.true(containsUrlOrDomain('wei.ch'));
    t.true(containsUrlOrDomain('https://example.com'));
  }
);

// --- 输入合法性 -----------------------------------------------------------
test.serial('empty workspace names never block invites', t => {
  for (const type of ['affine', 'selfhosted'] as const) {
    deployAs(type);

    t.false(blocksInviteByWorkspaceName(null));
    t.false(blocksInviteByWorkspaceName(undefined));
    t.false(blocksInviteByWorkspaceName(''));
  }
});
