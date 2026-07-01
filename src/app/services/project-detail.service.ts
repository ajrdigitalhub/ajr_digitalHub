import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminStoreService, ProjectData, ProjectPolicy, ProjectUser, ApiKeyDef, AlertRule, BackupRun, AuditEvent, ProjectPlugin, BillingData, ProjectLog } from './admin-store.service';

export type { ProjectData, ProjectPolicy, ProjectUser, ApiKeyDef, AlertRule, BackupRun, AuditEvent, ProjectPlugin, BillingData, ProjectLog };

@Injectable({ providedIn: 'root' })
export class ProjectDetailService {
  private store = inject(AdminStoreService);

  // Delegate state signals
  currentProject = this.store.currentProject;
  isLoading = this.store.isLoading;

  loadProject(id: string) {
    this.store.loadProject(id);
  }

  updateProject(id: string, partial: Partial<ProjectData>): Observable<boolean> {
    return this.store.updateProject(id, partial);
  }
}
