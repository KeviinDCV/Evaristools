import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
    <div className="relative flex size-full min-h-screen flex-col bg-gray-50 group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center whitespace-nowrap px-10 py-3">
          <div className="flex items-center gap-4 text-[#101418]">
            <Link to="/" className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
              <h2 className="text-[#101418] text-lg font-bold leading-tight tracking-[-0.015em]">Evaristools</h2>
            </Link>
          </div>
        </header>
        <motion.div
          key="page-content"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageTransitionVariants}
          className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-5"
        >
          {children}
        </motion.div>
        <footer className="py-6 px-10 text-center border-t border-solid border-t-[#eaedf1]">
          <p className="text-[#101418] font-medium mb-1">Hospital Universitario del Valle "Evaristo Garcia" E.S.E</p>
          <p className="text-[#5c728a] text-sm">Desarrollado por el departamento de innovación y desarrollo</p>
        </footer>
      </div>
    </div>
  );
} 