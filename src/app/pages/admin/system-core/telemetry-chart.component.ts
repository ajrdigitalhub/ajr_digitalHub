import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemCoreService } from '../../../services/system-core.service';

@Component({
  selector: 'app-telemetry-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './telemetry-chart.component.html',
  styleUrl: './telemetry-chart.component.scss'
})
export class TelemetryChartComponent {
  private service = inject(SystemCoreService);
  telemetry = this.service.globalTelemetry;

  // Map history to precise coordinates
  points = computed(() => {
    const history = this.telemetry().trafficHistory;
    if (history.length === 0) return [];
    
    // Find limits to normalize
    const highestVal = Math.max(...history, 50); // Min scope for scaling
    
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * 1000;
      // SVG represents 0,0 top-left, so invert Y coordinates
      const y = 250 - (val / highestVal) * 160 - 45;
      return { x, y };
    });
  });

  // Latest telemetry node coordinates
  latestPoint = computed(() => {
    const pts = this.points();
    return pts[pts.length - 1] || { x: 0, y: 0 };
  });

  // Calculate smooth SVG path using Catmull-Rom or simplified quadratic curve approximations for sleek render
  linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return path;
  });

  // Glowing fill path terminating at bottom-right/left corners of chart
  fillPath = computed(() => {
    const lpath = this.linePath();
    if (!lpath) return '';
    const pts = this.points();
    const lastX = pts[pts.length - 1]?.x || 1000;
    return `${lpath} L ${lastX} 250 L 0 250 Z`;
  });
}
