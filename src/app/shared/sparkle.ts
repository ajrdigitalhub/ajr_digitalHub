import { Directive, ElementRef, HostListener, inject, Input } from '@angular/core';
import { animate } from "motion";

@Directive({
  selector: '[appSparkle]',
  standalone: true
})
export class SparkleDirective {
  private el = inject(ElementRef);
  
  @Input() sparkleColor = '#818cf8';
  @Input() sparkleCount = 8;

  @HostListener('mouseenter')
  onMouseEnter() {
    this.createSparkles();
  }

  private createSparkles() {
    const rect = this.el.nativeElement.getBoundingClientRect();
    
    for (let i = 0; i < this.sparkleCount; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'absolute pointer-events-none z-50';
      sparkle.style.width = '4px';
      sparkle.style.height = '4px';
      sparkle.style.borderRadius = '50%';
      sparkle.style.backgroundColor = this.sparkleColor;
      sparkle.style.boxShadow = `0 0 10px ${this.sparkleColor}`;
      
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      
      this.el.nativeElement.style.position = 'relative';
      this.el.nativeElement.appendChild(sparkle);
      
      const destinationX = x + (Math.random() - 0.5) * 100;
      const destinationY = y + (Math.random() - 0.5) * 100;
      
      animate(
        sparkle,
        { 
          opacity: [1, 0],
          transform: [
            'scale(0) rotate(0deg)',
            `translate(${destinationX - x}px, ${destinationY - y}px) scale(1.5) rotate(180deg)`
          ]
        },
        { 
          duration: 0.8 + Math.random() * 0.4,
          ease: "easeOut"
        }
      ).finished.then(() => {
        sparkle.remove();
      });
    }
  }
}
