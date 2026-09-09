import { Name } from './template';

export interface WorkspaceProps {
  name: string;
  /** 保留字段以兼容既有调用方，邮件里不再渲染 */
  avatar?: string;
  size?: number;
}

// 工作区头像走的是 cid:workspaceAvatar 内嵌附件（core/mail/job.ts），而多数
// 邮件客户端默认拦截内嵌图片，导致设了头像也时有时无、经常显示成裂图或空白。
// 邮件里只保留名称。
export const Workspace = (props: WorkspaceProps) => {
  return <Name>{props.name}</Name>;
};
