import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import ScrollSmootherComponent from './ScrollSmoother';

interface MainLayoutProps {
  children: ReactNode;
}

const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <ScrollSmootherComponent
      smooth={1.2}
      effects={false}
      smoothTouch={false}
      normalizeScroll={true}
      ignoreMobileResize={true}
    >
      <div className="relative flex size-full min-h-screen flex-col bg-gray-50 group/design-root">
        <div className="layout-container flex h-full grow flex-col">
          <header className="flex items-center whitespace-nowrap px-4 md:px-6 lg:px-10 py-2 md:py-3">
            <div className="flex items-center gap-2 md:gap-4 text-[#101418]">
              <Link to="/" className="flex items-center gap-2 md:gap-4">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10" />
                <h2 className="text-[#101418] text-base md:text-lg font-bold leading-tight tracking-[-0.015em]">Evaristools</h2>
              </Link>
            </div>
          </header>
          <motion.div
            key="page-content"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageTransitionVariants}
            className="px-4 md:px-8 lg:px-20 xl:px-40 flex flex-1 justify-center py-3 md:py-5"
          >
            {children}
          </motion.div>
          <footer className="py-4 md:py-6 px-4 md:px-10 text-center border-t border-solid border-t-[#eaedf1]">
            <p className="text-[#101418] font-medium mb-1 text-sm md:text-base">Hospital Universitario del Valle "Evaristo Garcia" E.S.E</p>
            <p className="text-[#5c728a] text-xs md:text-sm">Desarrollado por el departamento de innovación y desarrollo</p>
          </footer>
        </div>
      </div>
    </ScrollSmootherComponent>
  );
}
