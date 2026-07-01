import { Directive, ElementRef, Renderer2, Input, OnChanges, SimpleChanges, inject } from '@angular/core';

@Directive({
  selector: '[appButtonLoader]',
  standalone: true
})
export class ButtonLoaderDirective implements OnChanges {
  @Input('appButtonLoader') isLoading = false;
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private spinnerElement: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isLoading']) {
      this.updateState();
    }
  }

  private updateState() {
    const button = this.el.nativeElement as HTMLButtonElement;
    if (this.isLoading) {
      this.renderer.setAttribute(button, 'disabled', 'true');
      button.classList.add('opacity-75', 'cursor-not-allowed', 'pointer-events-none');
      
      // Create and append SVG spinner if it does not already exist
      if (!this.spinnerElement) {
        this.spinnerElement = this.renderer.createElement('span');
        this.spinnerElement!.className = 'inline-flex items-center';
        this.spinnerElement!.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline" viewBox="0 0 50 50" style="vertical-align: middle;">
            <circle class="opacity-20 stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
            <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke-dasharray="50" stroke-dashoffset="15" stroke-linecap="round"></circle>
          </svg>
        `;
        // Insert spinner as the very first child of the button
        this.renderer.insertBefore(button, this.spinnerElement, button.firstChild);
      }
    } else {
      this.renderer.removeAttribute(button, 'disabled');
      button.classList.remove('opacity-75', 'cursor-not-allowed', 'pointer-events-none');
      if (this.spinnerElement) {
        this.renderer.removeChild(button, this.spinnerElement);
        this.spinnerElement = null;
      }
    }
  }
}
