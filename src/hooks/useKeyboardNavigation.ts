import { useEffect, RefObject } from 'react';

export function useKeyboardNavigation(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Allow default behavior for Textarea so user can press enter for newlines or use arrows to move text cursor
      if (target.tagName.toLowerCase() === 'textarea') return;

      // Handle Enter and Arrow Keys
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        
        // Find all focusable elements inside the container
        const focusableElements = Array.from(
          container.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        const currentIndex = focusableElements.indexOf(target);
        if (currentIndex === -1) return; // target is not in our list

        let nextIndex = currentIndex;

        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          // If Enter, ArrowDown, or ArrowUp is pressed on a button, let it handle its own logic (e.g. Radix Select)
          if ((e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') && target.tagName.toLowerCase() === 'button') {
            return;
          }

          if (e.key === 'ArrowRight' && target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'number')) {
            // Only move to next field if cursor is at the very end
            if (target.selectionStart !== null && target.selectionStart !== target.value.length) {
              return; 
            }
          }
          
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          if (e.key === 'ArrowUp' && target.tagName.toLowerCase() === 'button') {
            return;
          }
          if (e.key === 'ArrowLeft' && target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'number')) {
            // Only move to prev field if cursor is at the very beginning
            if (target.selectionEnd !== null && target.selectionEnd !== 0) {
              return;
            }
          }

          e.preventDefault();
          nextIndex = currentIndex - 1;
        }

        // Apply new focus
        if (nextIndex >= 0 && nextIndex < focusableElements.length) {
          const nextEl = focusableElements[nextIndex];
          nextEl.focus();
          
          // If it's an input text, maybe select the text
          if (nextEl instanceof HTMLInputElement && (nextEl.type === 'text' || nextEl.type === 'number')) {
            nextEl.select();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef]);
}
