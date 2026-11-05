"use client";

import { useEffect, useRef } from "react";

interface UseDrawerDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
}

// Global reference count for scroll locking across multiple/nested drawers
let activeDrawerCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

/**
 * Custom hook to handle:
 * 1. Escape key press to dismiss drawer
 * 2. Background scroll locking without page jump or layout shift
 */
export function useDrawerDismiss({
  isOpen,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
}: UseDrawerDismissOptions) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 1. Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEscape]);

  // 2. Background scroll locking
  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    if (typeof document === "undefined") return;

    if (activeDrawerCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width on desktop to prevent horizontal shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = "hidden";
    }

    activeDrawerCount++;

    return () => {
      activeDrawerCount--;
      if (activeDrawerCount <= 0) {
        activeDrawerCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isOpen, lockScroll]);
}
