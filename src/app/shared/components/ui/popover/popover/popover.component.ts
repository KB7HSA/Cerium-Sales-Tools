// import { CommonModule } from '@angular/common';
// import {
//   Component,
//   Input,
//   ElementRef,
//   ViewChild,
//   TemplateRef,
//   ContentChild,
//   Renderer2
// } from '@angular/core';

// type Position = 'top' | 'right' | 'bottom' | 'left';

// @Component({
//   selector: 'app-popover',
//   imports: [CommonModule],
//   templateUrl: './popover.component.html',
//   styles: ``
// })
// export class PopoverComponent {

//   @Input() position: Position = 'top';

//   @ContentChild('popoverTrigger', { read: TemplateRef }) triggerTpl!: TemplateRef<any>;
//   @ContentChild('popoverContent', { read: TemplateRef }) contentTpl!: TemplateRef<any>;

//   @ViewChild('popoverRef') popoverRef!: ElementRef;
//   @ViewChild('triggerRef') triggerRef!: ElementRef;

//   isOpen = false;
//   private clickListener: (() => void) | undefined;

//   constructor(private renderer: Renderer2, private host: ElementRef) {}

//   ngAfterViewInit() {
//     this.clickListener = this.renderer.listen('document', 'mousedown', (event: MouseEvent) => {
//       if (
//         this.isOpen &&
//         this.popoverRef &&
//         !this.popoverRef.nativeElement.contains(event.target) &&
//         this.triggerRef &&
//         !this.triggerRef.nativeElement.contains(event.target)
//       ) {
//         this.isOpen = false;
//       }
//     });
//   }

//   ngOnDestroy() {
//     if (this.clickListener) this.clickListener();
//   }

//   togglePopover() {
//     this.isOpen = !this.isOpen;
//   }

//   get positionClasses(): string {
//     return {
//       top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
//       right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
//       bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
//       left: 'right-full top-1/2 transform -translate-y-1/2 mr-2'
//     }[this.position]!;
//   }

//   get arrowClasses(): string {
//     return {
//       top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45',
//       right: 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 rotate-45',
//       bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45',
//       left: 'right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rotate-45'
//     }[this.position]!;
//   }
// }


// popover.component.ts
import { Component, Input, TemplateRef, ElementRef, ViewChild, OnDestroy } from '@angular/core';

import {
  computePosition,
  flip,
  shift,
  offset,
  arrow,
  autoUpdate,
  Placement,
} from '@floating-ui/dom';
import { ClickOutsideDirective } from '../../../../directive/click-outside.directive';

type Position = 'top' | 'right' | 'bottom' | 'left';

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [ClickOutsideDirective],
  templateUrl: './popover.component.html',  
  styles: `
  `,
})
export class PopoverComponent implements OnDestroy {
  @Input() position: Position = 'top';
  
  @ViewChild('triggerRef') triggerRef!: ElementRef;
  @ViewChild('floatingRef') floatingRef!: ElementRef;
  @ViewChild('arrowRef') arrowRef!: ElementRef;

  isOpen = false;
  floatingStyles = { top: 0, left: 0 };
  arrowStyles: any = {};
  arrowBorderClasses = '';
  
  private cleanup?: () => void;

  private placementMap: Record<Position, Placement> = {
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
  };

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.updatePosition(), 0);
    }
  }

  close() {
    this.isOpen = false;
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
  }

  private getOffset(): number {
    return this.position === 'top' || this.position === 'bottom' ? 20 : 10;
  }

  private async updatePosition() {
    if (!this.triggerRef || !this.floatingRef || !this.arrowRef) return;

    const triggerEl = this.triggerRef.nativeElement;
    const floatingEl = this.floatingRef.nativeElement;
    const arrowEl = this.arrowRef.nativeElement;

    this.cleanup = autoUpdate(triggerEl, floatingEl, async () => {
      const { x, y, placement, middlewareData } = await computePosition(
        triggerEl,
        floatingEl,
        {
          placement: this.placementMap[this.position],
          middleware: [
            offset(this.getOffset()),
            flip({
              fallbackAxisSideDirection: 'start',
            }),
            shift({ padding: 8 }),
            arrow({
              element: arrowEl,
              padding: 8,
            }),
          ],
        }
      );

      this.floatingStyles = { top: y, left: x };

      // Update arrow position
      const arrowX = middlewareData.arrow?.x;
      const arrowY = middlewareData.arrow?.y;
      const side = placement.split('-')[0];

      this.arrowStyles = this.getArrowStyles(side, arrowX, arrowY);
      this.arrowBorderClasses = this.getArrowBorderSides(side);
    });
  }

  private getArrowStyles(side: string, arrowX?: number, arrowY?: number): any {
    switch (side) {
      case 'top':
        return {
          bottom: '-6px',
          left: arrowX != null ? `${arrowX}px` : '50%',
        };
      case 'bottom':
        return {
          top: '-6px',
          left: arrowX != null ? `${arrowX}px` : '50%',
        };
      case 'left':
        return {
          right: '-6px',
          top: arrowY != null ? `${arrowY}px` : '50%',
        };
      case 'right':
        return {
          left: '-6px',
          top: arrowY != null ? `${arrowY}px` : '50%',
        };
      default:
        return {};
    }
  }

  private getArrowBorderSides(side: string): string {
    switch (side) {
      case 'top':
        return 'border-r border-b';
      case 'bottom':
        return 'border-l border-t';
      case 'left':
        return 'border-r border-t';
      case 'right':
        return 'border-l border-b';
      default:
        return '';
    }
  }

  ngOnDestroy() {
    if (this.cleanup) {
      this.cleanup();
    }
  }
}
