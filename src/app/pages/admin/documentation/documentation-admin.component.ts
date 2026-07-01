import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-docs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './documentation-admin.component.html',
  styleUrl: './documentation-admin.component.scss'
})
export class AdminDocsComponent implements OnInit {
  private api = inject(ApiService);
  loading = signal<boolean>(false);
  pages = signal<any[]>([]);

  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  activeDoc: any = {};

  ngOnInit() {
    this.loadPages();
  }

  async loadPages() {
    this.loading.set(true);
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.get<any[]>('/documentation'));
      this.pages.set(res || []);
    } catch (e) {
      console.error('Failed to load documentation catalogue', e);
    } finally {
      this.loading.set(false);
    }
  }

  openAddModal() {
    this.editMode.set(false);
    this.activeDoc = { category: 'WhatsApp' };
    this.showModal.set(true);
  }

  openEditModal(doc: any) {
    this.editMode.set(true);
    this.activeDoc = { ...doc };
    this.showModal.set(true);
  }

  async savePage() {
    try {
      const { firstValueFrom } = await import('rxjs');
      if (this.editMode()) {
        await firstValueFrom(this.api.put(`/documentation/${this.activeDoc.id}`, this.activeDoc));
        alert('Documentation page updated successfully!');
      } else {
        await firstValueFrom(this.api.post('/documentation', this.activeDoc));
        alert('Documentation page created successfully!');
      }
      this.showModal.set(false);
      this.loadPages();
    } catch (e: any) {
      alert('Failed to save guide: ' + e.message);
    }
  }

  async deletePage(id: string) {
    if (!confirm('Are you sure you want to delete this documentation page?')) return;
    try {
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(this.api.delete(`/documentation/${id}`));
      alert('Documentation page deleted successfully.');
      this.loadPages();
    } catch (e: any) {
      alert('Failed to delete guide: ' + e.message);
    }
  }
}
