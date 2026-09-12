import { sentry, tracker } from '@affine/track';
import { APP_SETTINGS_STORAGE_KEY } from '@toeverything/infra/atom';

tracker.init();
sentry.init();

if (typeof localStorage !== 'undefined') {
  // 自建实例默认不上报：这些数据会发往上游的 mixpanel 与 sentry，用户既
  // 没被问过，也无从受益。改成显式打开才启用——上游默认开启、需要主动
  // 关闭，对一个私人实例来说方向是反的。
  let enabled = false;
  const settingsStr = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);

  if (settingsStr) {
    const parsed = JSON.parse(settingsStr);
    enabled = parsed.enableTelemetry === true;
  }

  if (!enabled) {
    // NOTE: telemetry setting is respected by tracker and sentry.
    sentry.disable();
    tracker.opt_out_tracking();
  }
}
