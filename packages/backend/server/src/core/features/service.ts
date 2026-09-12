import { Injectable, Logger } from '@nestjs/common';

import { Models } from '../../models';

const STAFF = ['@toeverything.info', '@affine.pro'];

@Injectable()
export class FeatureService {
  protected logger = new Logger(FeatureService.name);

  constructor(private readonly models: Models) {}

  // ======== Admin ========
  isStaff(email: string) {
    for (const domain of STAFF) {
      if (email.endsWith(domain)) {
        return true;
      }
    }
    return false;
  }

  isAdmin(userId: string) {
    return this.models.userFeature.has(userId, 'administrator');
  }

  addAdmin(userId: string) {
    return this.models.userFeature.add(userId, 'administrator', 'Admin user');
  }

  // ======== Workspace creation ========
  /**
   * 能否自建工作区。管理员一律豁免，其余人看有没有被授予这项能力。
   */
  async canCreateWorkspace(userId: string) {
    if (await this.isAdmin(userId)) {
      return true;
    }
    return this.models.userFeature.has(userId, 'workspace_creation');
  }
}
