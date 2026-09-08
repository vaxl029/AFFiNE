import { scanContentPolicyV1 } from '../native';

export function scanContentPolicy(value: string | null | undefined) {
  return scanContentPolicyV1({
    value: value ?? '',
    checks: ['url_or_domain'],
  });
}

export function containsUrlOrDomain(value: string | null | undefined) {
  return scanContentPolicy(value).matches.some(
    match => match.type === 'url_or_domain'
  );
}

// ---------------------------------------------------------------------------
// Cloud-only invite anti-abuse
// ---------------------------------------------------------------------------
// 公共 Cloud 上，"Workspace 名含 URL/域名" 是钓鱼邀请的强信号，因此邀请链路
// (member resolver -> notification -> mail job) 三层都会据此拦截。
//
// self-host 是私有可信部署，不承担公共服务的垃圾邮件治理职责，这条策略只会
// 误伤正常命名（例如把 Workspace 叫 `wei.ch`）。
//
// 收口成单一入口有两个原因：
//   1. `containsUrlOrDomain` 作为通用原语保持语义纯粹，不掺入 deployment
//      判断，其它内容安全场景仍可直接复用；
//   2. deployment 判断只此一处，避免散落的 if 漏改某一层，导致
//      "邀请记录建了但邮件被静默丢弃" 这类三层不一致。
// ---------------------------------------------------------------------------
export function blocksInviteByWorkspaceName(value: string | null | undefined) {
  if (env.selfhosted) {
    return false;
  }

  return containsUrlOrDomain(value);
}
