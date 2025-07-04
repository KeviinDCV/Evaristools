import React, { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

// Registrar los plugins
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

interface ScrollSmootherProps {
  children: ReactNode;
  smooth?: number;
  effects?: boolean;
  smoothTouch?: boolean;
  normalizeScroll?: boolean;
  ignoreMobileResize?: boolean;
  className?: string;
}

const ScrollSmootherComponent: React.FC<ScrollSmootherProps> = ({
  children,
  smooth = 1,
  effects = false,
  smoothTouch = false,
  normalizeScroll = true,
  ignoreMobileResize = true,
  className = "",
}) => {
  const smoothWrapperRef = useRef<HTMLDivElement>(null);
  const smoothContentRef = useRef<HTMLDivElement>(null);
  const scrollSmootherRef = useRef<ScrollSmoother | null>(null);

  useEffect(() => {
    // Verificar que los elementos existen
    if (!smoothWrapperRef.current || !smoothContentRef.current) {
      return;
    }

    // Crear ScrollSmoother
    scrollSmootherRef.current = ScrollSmoother.create({
      wrapper: smoothWrapperRef.current,
      content: smoothContentRef.current,
      smooth: smooth,
      effects: effects,
      smoothTouch: smoothTouch,
      normalizeScroll: normalizeScroll,
      ignoreMobileResize: ignoreMobileResize,
    });

    // Cleanup function
    return () => {
      if (scrollSmootherRef.current) {
        scrollSmootherRef.current.kill();
        scrollSmootherRef.current = null;
      }
    };
  }, [smooth, effects, smoothTouch, normalizeScroll, ignoreMobileResize]);

  return (
    <div 
      id="smooth-wrapper" 
      ref={smoothWrapperRef}
      className={`smooth-wrapper ${className}`}
    >
      <div 
        id="smooth-content" 
        ref={smoothContentRef}
        className="smooth-content"
      >
        {children}
      </div>
    </div>
  );
};

export default ScrollSmootherComponent;
