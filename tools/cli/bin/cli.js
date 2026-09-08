#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync('yarn', ['r', 'affine.ts', ...process.argv.slice(2)], {
  stdio: 'inherit',
  // Windows 上 yarn 是 .cmd，不走 shell 会直接 ENOENT
  shell: process.platform === 'win32',
});

// 原实现丢弃了子进程状态，无论构建成功与否都以 0 退出。
// 后果是 `yarn workspace @affine/server build` 静默"成功"却没有产物，
// 一路推到镜像里，直到容器起不来才暴露。
if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
