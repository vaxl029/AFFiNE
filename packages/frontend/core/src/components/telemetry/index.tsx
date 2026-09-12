import { enableAutoTrack, sentry, tracker } from '@affine/track';
import { appSettingAtom } from '@toeverything/infra';
import { useAtomValue } from 'jotai/react';
import { useEffect } from 'react';

export function Telemetry() {
  const settings = useAtomValue(appSettingAtom);

  useEffect(() => {
    // 默认关闭，显式打开才上报。上游这里判的是 !== false，于是未设置过的
    // 用户会走进 else 分支重新 opt-in，把 bootstrap 里刚关掉的又打开。
    if (settings.enableTelemetry !== true) {
      sentry.disable();
      tracker.opt_out_tracking();
      return;
    }

    sentry.enable();
    tracker.opt_in_tracking();
    return enableAutoTrack(document.body, tracker.track);
  }, [settings.enableTelemetry]);

  return null;
}
