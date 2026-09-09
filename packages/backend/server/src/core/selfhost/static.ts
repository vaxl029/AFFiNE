import { join } from 'node:path';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Application } from 'express';
import { static as serveStatic } from 'express';
import isMobile from 'is-mobile';

import { Config } from '../../base';
import { SetupMiddleware } from './setup';

// ---------------------------------------------------------------------------
// Static asset caching
// ---------------------------------------------------------------------------
// 上游给 serveStatic 传了 immutable 却没给 maxAge，而 express 的 maxAge 默认
// 是 0，两者必须成对出现才有意义——结果响应头是 `public, max-age=0`，每次
// 刷新都要把几十个 chunk 挨个回源验证一遍。登录页就要拉 20MB 以上的 JS
// （shiki、blocksuite 都在里面），这一轮往返的代价很直观。
//
// 构建产物的文件名里带内容 hash（styles.1056fe91.css、index.fd5a6b1d.js），
// 内容一变文件名就变，所以可以放心长缓存。HTML 与 manifest 必须保持不缓存，
// 否则发版后客户端拿不到新的入口。
// ---------------------------------------------------------------------------
const HASHED_ASSET =
  /\.[0-9a-f]{8,}\.(js|css|woff2?|ttf|png|jpe?g|gif|svg|ico|webp|wasm|map)$/;
// 没有 hash 的静态资源：PWA 的 screenshot（近 1.3MB）、favicon、应用图标等。
// 内容极少变动，但文件名固定，所以只能给一个有限期限而不是 immutable。
const STATIC_ASSET = /\.(woff2?|ttf|png|jpe?g|gif|svg|ico|webp)$/;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ONE_DAY_SECONDS = 60 * 60 * 24;

function setAssetCacheHeaders(
  res: { setHeader: (k: string, v: string) => void },
  filePath: string
) {
  if (HASHED_ASSET.test(filePath)) {
    res.setHeader(
      'Cache-Control',
      `public, max-age=${ONE_YEAR_SECONDS}, immutable`
    );
  } else if (STATIC_ASSET.test(filePath)) {
    res.setHeader('Cache-Control', `public, max-age=${ONE_DAY_SECONDS}`);
  }
}

@Injectable()
export class StaticFilesResolver implements OnModuleInit {
  constructor(
    private readonly config: Config,
    private readonly adapterHost: HttpAdapterHost,
    private readonly check: SetupMiddleware
  ) {}

  onModuleInit() {
    // in command line mode
    if (!this.adapterHost.httpAdapter) {
      return;
    }

    const app = this.adapterHost.httpAdapter.getInstance<Application>();
    // for example, '/affine' in host [//host.com/affine]
    const basePath = this.config.server.path;
    const staticPath = join(env.projectRoot, 'static');

    // web => {
    //   affine: 'static/index.html',
    //   selfhost: 'static/selfhost.html'
    // }
    // admin => {
    //   affine: 'static/admin/index.html',
    //   selfhost: 'static/admin/selfhost.html'
    // }
    // mobile => {
    //   affine: 'static/mobile/index.html',
    //   selfhost: 'static/mobile/selfhost.html'
    // }
    // NOTE(@forehalo):
    //   the order following routes should be respected,
    //   otherwise the app won't work properly.

    // START REGION: /admin
    // do not allow '/index.html' url, redirect to '/'
    app.get(basePath + '/admin/index.html', (_req, res) => {
      return res.redirect(basePath + '/admin');
    });

    // serve all static files
    app.use(
      basePath + '/admin',
      serveStatic(join(staticPath, 'admin'), {
        redirect: false,
        index: false,
        fallthrough: true,
        setHeaders: setAssetCacheHeaders,
      })
    );

    // fallback all unknown routes
    app.get(
      [basePath + '/admin', basePath + '/admin/*path'],
      this.check.use,
      (_req, res) => {
        res.sendFile(
          join(
            staticPath,
            'admin',
            env.selfhosted ? 'selfhost.html' : 'index.html'
          )
        );
      }
    );
    // END REGION

    // START REGION: /mobile
    // serve all static files
    app.use(
      basePath,
      serveStatic(join(staticPath, 'mobile'), {
        redirect: false,
        index: false,
        fallthrough: true,
        setHeaders: setAssetCacheHeaders,
      })
    );
    // END REGION

    // START REGION: /
    // do not allow '/index.html' url, redirect to '/'
    app.get(basePath + '/index.html', (_req, res) => {
      return res.redirect(basePath);
    });

    // serve all static files
    app.use(
      basePath,
      serveStatic(staticPath, {
        redirect: false,
        index: false,
        fallthrough: true,
        dotfiles: 'ignore',
        setHeaders: setAssetCacheHeaders,
      })
    );

    // fallback all unknown routes
    app.get([basePath, basePath + '/*path'], this.check.use, (req, res) => {
      const mobile =
        env.namespaces.canary &&
        isMobile({
          ua: req.headers['user-agent'] ?? undefined,
        });

      return res.sendFile(
        join(
          staticPath,
          mobile ? 'mobile' : '',
          env.selfhosted ? 'selfhost.html' : 'index.html'
        )
      );
    });
    // END REGION
  }
}
