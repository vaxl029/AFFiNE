import { defineModuleConfig } from '../config';

export type ThrottlerType = 'default' | 'strict';

declare global {
  interface AppConfigSchema {
    throttle: {
      enabled: boolean;
      throttlers: {
        [key in ThrottlerType]: ConfigItem<{
          ttl: number;
          limit: number;
        }>;
      };
    };
  }
}

defineModuleConfig('throttle', {
  enabled: {
    desc: 'Whether the throttler is enabled.',
    // 本分支默认停用限流。上游的限流键是 `<用户>;<桶名>`，不含接口名，
    // 标了 strict 的十几个接口（登录、preflight、magic-link、设备列表、
    // getInviteInfo、发送改密码邮件）共用同一份 20 次/分钟，私有实例上
    // 正常走一遍邀请或改密码流程就会触顶。守卫入口读的就是这个开关
    // （CloudThrottlerGuard.canActivate），要恢复上游行为，在 admin 面板
    // 把 throttle.enabled 打开即可，无需改码重编。
    default: false,
  },
  'throttlers.default': {
    desc: 'The config for the default throttler.',
    default: {
      ttl: 60_000,
      limit: 120,
    },
  },
  'throttlers.strict': {
    desc: 'The config for the strict throttler.',
    default: {
      ttl: 60_000,
      limit: 20,
    },
  },
});
