import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

// Registrar los plugins
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

interface UseScrollSmootherOptions {
  smooth?: number;
  effects?: boolean;
  smoothTouch?: boolean;
  normalizeScroll?: boolean;
  ignoreMobileResize?: boolean;
}

export const useScrollSmoother = (options: UseScrollSmootherOptions = {}) => {
  const scrollSmootherRef = useRef<ScrollSmoother | null>(null);
  const isInitialized = useRef(false);

  const {
    smooth = 1,
    effects = false,
    smoothTouch = false,
    normalizeScroll = true,
    ignoreMobileResize = true,
  } = options;

  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (isInitialized.current) {
      return;
    }

    // Esperar a que el DOM esté listo
    const initScrollSmoother = () => {
      const wrapper = document.querySelector('#smooth-wrapper');
      const content = document.querySelector('#smooth-content');

      if (wrapper && content) {
        try {
          scrollSmootherRef.current = ScrollSmoother.create({
            wrapper: wrapper as HTMLElement,
            content: content as HTMLElement,
            smooth: smooth,
            effects: effects,
            smoothTouch: smoothTouch,
            normalizeScroll: normalizeScroll,
            ignoreMobileResize: ignoreMobileResize,
          });
          
          isInitialized.current = true;
          console.log('ScrollSmoother initialized successfully');
        } catch (error) {
          console.error('Error initializing ScrollSmoother:', error);
        }
      }
    };

    // Intentar inicializar inmediatamente
    initScrollSmoother();

    // Si no se pudo inicializar, intentar después de un breve delay
    if (!scrollSmootherRef.current) {
      const timeout = setTimeout(initScrollSmoother, 100);
      return () => clearTimeout(timeout);
    }

    // Cleanup function
    return () => {
      if (scrollSmootherRef.current) {
        scrollSmootherRef.current.kill();
        scrollSmootherRef.current = null;
        isInitialized.current = false;
      }
    };
  }, [smooth, effects, smoothTouch, normalizeScroll, ignoreMobileResize]);

  // Métodos útiles para controlar ScrollSmoother
  const scrollTo = (target: string | number | Element, smooth?: boolean, position?: string) => {
    if (scrollSmootherRef.current) {
      scrollSmootherRef.current.scrollTo(target, smooth, position);
    }
  };

  const refresh = () => {
    if (scrollSmootherRef.current) {
      scrollSmootherRef.current.refresh();
    }
  };

  const paused = (value?: boolean) => {
    if (scrollSmootherRef.current) {
      return scrollSmootherRef.current.paused(value);
    }
    return false;
  };

  return {
    scrollSmoother: scrollSmootherRef.current,
    scrollTo,
    refresh,
    paused,
    isInitialized: isInitialized.current,
  };
};
