import { z } from 'zod';

export interface UserQuota {
  name: string;
  blobLimit: number;
  businessBlobLimit?: number;
  storageQuota: number;
  historyPeriod: number;
  memberLimit: number;
  copilotActionLimit?: number;
}

export interface WorkspaceQuota extends UserQuota {
  seatQuota: number;
}

export enum FeatureType {
  Feature,
  Quota,
}

export enum Feature {
  Admin = 'administrator',
  // 建工作区的资格。账号和工作区本是两层：被邀请进来的人拿到的是一个
  // 完整的实例账号，默认也就能另起炉灶、在自己的地盘上再邀请别人。
  // 把这件事收成一项可授予的能力，谁能开疆由 admin 面板说了算。
  WorkspaceCreation = 'workspace_creation',
}

export const FeaturesShapes = {
  administrator: z.object({}),
  workspace_creation: z.object({}),
};

export type UserFeatureName = 'administrator' | 'workspace_creation';
export type FeatureName = UserFeatureName;
export type FeatureConfig<T extends FeatureName> = z.infer<
  (typeof FeaturesShapes)[T]
>;

export const FeatureConfigs = {
  administrator: {
    type: FeatureType.Feature,
    configs: {},
  },
  workspace_creation: {
    type: FeatureType.Feature,
    configs: {},
  },
} satisfies Record<
  FeatureName,
  { type: FeatureType; configs: FeatureConfig<FeatureName> }
>;
