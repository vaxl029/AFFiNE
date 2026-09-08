export const DEFAULT_SELF_HOSTED_SERVER_NAME = 'AFFiNE Self-hosted';

// 上游会拼成 `AFFiNE Self-hosted (自定义名)`，用来提示"这是一台自托管
// 服务器"。本 fork 只服务自己的部署，这个前缀是冗余噪音，直接用服务端
// server.name 配的名字；没配时才回落到默认名。
export function getSelfHostedServerName(serverName?: string | null) {
  return serverName || DEFAULT_SELF_HOSTED_SERVER_NAME;
}
