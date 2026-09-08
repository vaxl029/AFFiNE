import clsx from 'clsx';
import type { FC } from 'react';

import { authHeaderWrapper } from './share.css';

export const AuthHeader: FC<{
  title: string;
  subTitle?: string;
  className?: string;
}> = ({ title, subTitle, className }) => {
  return (
    <div className={clsx(authHeaderWrapper, className)}>
      {/* 标题前原本有个 AFFiNE 三角 logo，自托管部署不需要官方标识 */}
      <p>{title}</p>
      <p>{subTitle}</p>
    </div>
  );
};
