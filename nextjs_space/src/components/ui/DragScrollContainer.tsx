'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DragScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Show subtle fade edges when content overflows */
  showFadeEdges?: boolean;
}

/**
 * A horizontal scroll container that supports drag-to-scroll on desktop
 * and native touch scrolling on mobile. Used for tab rows, filter bars, etc.
 */
export function DragScrollContainer({ children, className, showFadeEdges = true }: DragScrollContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasMoved = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    checkOverflow();
    el.addEventListener('scroll', checkOverflow, { passive: true });
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkOverflow);
      ro.disconnect();
    };
  }, [checkOverflow]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // Don't initiate drag if clicking directly on a button/link
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX;
    scrollLeftStart.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.pageX - startX.current;
    if (Math.abs(dx) > 3) hasMoved.current = true;
    el.scrollLeft = scrollLeftStart.current - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = ref.current;
    if (el) el.style.cursor = '';
  }, []);

  const onMouseLeave = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      const el = ref.current;
      if (el) el.style.cursor = '';
    }
  }, []);

  // Prevent click events on children when user was dragging
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMoved.current = false;
    }
  }, []);

  return (
    <div className="relative">
      {showFadeEdges && canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
      )}
      <div
        ref={ref}
        className={cn(
          'overflow-x-auto scrollbar-hide',
          className
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      {showFadeEdges && canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
}
