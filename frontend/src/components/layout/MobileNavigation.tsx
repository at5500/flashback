import { ReactNode, useEffect, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

interface MobileNavigationProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Enable swipe-to-close gesture
   */
  enableSwipe?: boolean;
}

/**
 * Mobile navigation overlay with slide-in animation and swipe-to-close gesture
 */
export function MobileNavigation({
  show,
  onClose,
  children,
  enableSwipe = true,
}: MobileNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle hardware back button
  useEffect(() => {
    if (!show) return;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      onClose();
    };

    // Push a state when overlay opens
    window.history.pushState({ modal: true }, '');

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [show, onClose]);

  // Swipe gesture handler using useDrag
  const bind = useDrag(
    ({ movement: [mx], direction: [dx], cancel }) => {
      if (!enableSwipe) return;

      // Swiping right (positive direction) and moved more than 100px
      if (dx > 0 && mx > 100) {
        cancel();
        onClose();
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Overlay Content */}
      <div
        ref={containerRef}
        {...(enableSwipe ? bind() : {})}
        className={`fixed inset-0 bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 ease-out lg:hidden touch-none ${
          show ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        style={{ touchAction: enableSwipe ? 'pan-y' : 'auto' }}
      >
        {children}
      </div>
    </>
  );
}
