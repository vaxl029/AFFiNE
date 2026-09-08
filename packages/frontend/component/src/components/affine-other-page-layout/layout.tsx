import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';

import dotBgDark from './assets/dot-bg.dark.png';
import dotBgLight from './assets/dot-bg.light.png';
import * as styles from './index.css';

export const AffineOtherPageLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const backgroundImage =
    resolvedTheme === 'dark' && dotBgDark ? dotBgDark : dotBgLight;

  return (
    <div
      className={styles.root}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* 顶栏原本是 AFFiNE logo + 官网/Blog/Contact us + 下载 App，
          对自托管部署全是无意义的外链，web 端不再渲染。
          Electron 下保留可拖拽区域，否则窗口没法拖动。 */}
      {BUILD_CONFIG.isElectron && <div className={styles.draggableHeader} />}

      {children}
    </div>
  );
};
