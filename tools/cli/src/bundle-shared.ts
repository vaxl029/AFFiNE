import type { Configuration as RspackDevServerConfiguration } from '@rspack/dev-server';

export const RSPACK_SUPPORTED_PACKAGES = [
  '@affine/admin',
  '@affine/web',
  '@affine/mobile',
  '@affine/ios',
  '@affine/android',
  '@affine/electron-renderer',
  '@affine/server',
  '@affine/reader',
] as const;

const rspackSupportedPackageSet = new Set<string>(RSPACK_SUPPORTED_PACKAGES);

export function isRspackSupportedPackageName(name: string) {
  return rspackSupportedPackageSet.has(name);
}

export function assertRspackSupportedPackageName(name: string) {
  if (isRspackSupportedPackageName(name)) {
    return;
  }

  throw new Error(
    `Rspack bundling currently supports: ${Array.from(RSPACK_SUPPORTED_PACKAGES).join(', ')}. Unsupported package: ${name}.`
  );
}

// ---------------------------------------------------------------------------
// Dev server port
// ---------------------------------------------------------------------------
// 默认仍是 8080（保持上游行为），可用 AFFINE_DEV_SERVER_PORT 覆盖，避开本机
// 其它服务占用的常用端口。webSocketURL 必须跟着一起变——它是写死的绝对地址
// （Electron 下 assets:// 协议无法推导 ws 端点），端口对不上会导致 liveReload
// 的 ws 连接打到别的服务上。
// ---------------------------------------------------------------------------
const DEV_SERVER_PORT = Number(process.env.AFFINE_DEV_SERVER_PORT) || 8080;

export const DEFAULT_DEV_SERVER_CONFIG: RspackDevServerConfiguration = {
  host: '0.0.0.0',
  port: DEV_SERVER_PORT,
  allowedHosts: 'all',
  hot: false,
  liveReload: true,
  compress: !process.env.CI,
  setupExitSignals: true,
  client: {
    overlay: process.env.DISABLE_DEV_OVERLAY === 'true' ? false : undefined,
    logging: process.env.CI ? 'none' : 'error',
    // see: https://webpack.js.org/configuration/dev-server/#websocketurl
    // must be an explicit ws/wss URL because custom protocols (e.g. assets://)
    // cannot be used to construct WebSocket endpoints in Electron
    webSocketURL: `ws://0.0.0.0:${DEV_SERVER_PORT}/ws`,
  },
  historyApiFallback: {
    rewrites: [
      {
        from: /.*/,
        to: () => {
          return process.env.SELF_HOSTED === 'true'
            ? '/selfhost.html'
            : '/index.html';
        },
      },
    ],
  },
  proxy: [
    {
      context: '/api',
      target: 'http://localhost:3010',
    },
    {
      context: '/socket.io',
      target: 'http://localhost:3010',
      ws: true,
    },
    {
      context: '/graphql',
      target: 'http://localhost:3010',
    },
  ],
};
