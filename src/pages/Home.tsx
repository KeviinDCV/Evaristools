import { Link } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

// Importar iconos de las librerías disponibles
import {
  FaImages,
  FaBrain,
  FaCompress,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileExcel,
  FaFileImage,
  FaSignature,
  FaTint,
  FaSortAmountDown,
  FaCrop,
  FaListOl,
  FaLock,
  FaLockOpen,
  FaQrcode,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import {
  MdDocumentScanner,
  MdRotateRight,
  MdCallSplit
} from 'react-icons/md';
import {
  HiPhotograph
} from 'react-icons/hi';
import { BiMerge } from 'react-icons/bi';
// Los iconos ahora se importan de las librerías disponibles

const allTools = [
  {
    title: 'OCR y Extracción de Texto',
    description: 'Extrae texto de imágenes y PDFs',
    path: '/ocr',
    icon: MdDocumentScanner
  },
  {
    title: 'Imágenes a Word',
    description: 'Convierte imágenes a documentos Word editables',
    path: '/image-to-word',
    icon: FaFileWord
  },
  {
    title: 'Resumir Documento',
    description: 'Genera resúmenes automáticos con IA',
    path: '/summarize-document',
    icon: FaBrain
  },
  {
    title: 'Generador de QR',
    description: 'Crea códigos QR personalizados con logo institucional',
    path: '/qr-generator',
    icon: FaQrcode
  },
  {
    title: 'Unir PDFs',
    description: 'Combina múltiples archivos PDF en uno solo',
    path: '/pdf/merge',
    icon: BiMerge
  },
  {
    title: 'Dividir PDF',
    description: 'Separa un PDF en múltiples archivos más pequeños',
    path: '/pdf/split',
    icon: MdCallSplit
  },
  {
    title: 'Comprimir PDF',
    description: 'Reduce el tamaño de tus archivos PDF',
    path: '/pdf/compress',
    icon: FaCompress
  },
  {
    title: 'Imágenes a PDF',
    description: 'Convierte imágenes a formato PDF',
    path: '/pdf/images-to-pdf',
    icon: FaImages
  },
  {
    title: 'Word a PDF',
    description: 'Convierte documentos Word a formato PDF',
    path: '/pdf/word-to-pdf',
    icon: FaFileWord
  },
  {
    title: 'PowerPoint a PDF',
    description: 'Convierte presentaciones PowerPoint a PDF',
    path: '/pdf/powerpoint-to-pdf',
    icon: FaFilePowerpoint
  },
  {
    title: 'Excel a PDF',
    description: 'Convierte hojas de cálculo Excel a PDF',
    path: '/pdf/excel-to-pdf',
    icon: FaFileExcel
  },
  {
    title: 'PDF a JPG',
    description: 'Convierte páginas de PDF a imágenes JPG',
    path: '/pdf/pdf-to-jpg',
    icon: FaFileImage
  },
  {
    title: 'JPG a PDF',
    description: 'Crea PDFs a partir de imágenes JPG',
    path: '/pdf/jpg-to-pdf',
    icon: HiPhotograph
  },
  {
    title: 'PDF a PDF/A',
    description: 'Convierte PDF a formato de archivo PDF/A',
    path: '/pdf/pdf-to-pdfa',
    icon: FaFilePdf
  },
  {
    title: 'Firmar PDF',
    description: 'Añade firmas digitales a tus documentos PDF',
    path: '/pdf/sign',
    icon: FaSignature
  },
  {
    title: 'Marca de agua en PDF',
    description: 'Añade marcas de agua a tus documentos PDF',
    path: '/pdf/watermark',
    icon: FaTint
  },
  {
    title: 'Rotar PDF',
    description: 'Rota las páginas de tus documentos PDF',
    path: '/pdf/rotate',
    icon: MdRotateRight
  },
  {
    title: 'Ordenar PDF',
    description: 'Reorganiza las páginas de tus documentos PDF',
    path: '/pdf/sort',
    icon: FaSortAmountDown
  },
  {
    title: 'Recortar PDF',
    description: 'Elimina los márgenes de tus documentos PDF o selecciona un área específica',
    path: '/pdf/crop',
    icon: FaCrop
  },
  {
    title: 'Números de página',
    description: 'Añade números de página a un PDF. Escoge posición, formato y tipografía',
    path: '/pdf/page-numbers',
    icon: FaListOl
  },
  {
    title: 'Desbloquear PDF',
    description: 'Elimina la protección por contraseña de PDFs',
    path: '/pdf/unlock',
    icon: FaLockOpen
  },
  {
    title: 'Proteger PDF',
    description: 'Añade protección por contraseña a tus PDFs',
    path: '/pdf/protect',
    icon: FaLock
  }
];

// Hook personalizado para animaciones GSAP de cards
const useCardAnimation = () => {
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const icon = card.querySelector('.card-icon');
    const title = card.querySelector('.card-title');

    // Configurar estado inicial
    gsap.set([card, icon], {
      scale: 1,
      y: 0,
      rotationY: 0,
    });

    // Animación de entrada al hover (más sutil en pantallas pequeñas)
    const handleMouseEnter = () => {
      const isMobile = window.innerWidth < 768;

      gsap.to(card, {
        scale: isMobile ? 1.01 : 1.02,
        y: isMobile ? -2 : -4,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to(icon, {
        scale: isMobile ? 1.05 : 1.1,
        rotationY: isMobile ? 2 : 5,
        duration: 0.3,
        ease: "power2.out",
      });

      // Usar opacity en lugar de cambiar color directamente
      gsap.to([icon, title], {
        opacity: 0.8,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    // Animación de salida al quitar hover
    const handleMouseLeave = () => {
      gsap.to(card, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to(icon, {
        scale: 1,
        rotationY: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to([icon, title], {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    // Agregar event listeners
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return cardRef;
};

// Componente de búsqueda animado
const AnimatedSearchInput = ({ searchTerm, onSearchChange }: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Detectar clics fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    const container = searchContainerRef.current;
    const input = inputRef.current;
    const icon = iconRef.current;

    if (!container || !input || !icon) return;

    if (isExpanded) {
      // Animación de expansión
      gsap.to(container, {
        width: "280px",
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(input, {
        opacity: 1,
        transform: "translateY(-50%) translateX(0px)",
        duration: 0.3,
        delay: 0.1,
        ease: "power2.out",
        onComplete: () => {
          input.focus();
        }
      });

      // Mover el icono al lado izquierdo
      gsap.to(icon, {
        left: "0px",
        right: "auto",
        width: "44px",
        duration: 0.4,
        ease: "power2.out",
      });
    } else {
      // Animación de contracción
      gsap.to(input, {
        opacity: 0,
        transform: "translateY(-50%) translateX(-20px)",
        duration: 0.2,
        ease: "power2.in",
      });

      // Regresar el icono al centro
      gsap.to(icon, {
        left: "0px",
        right: "0px",
        width: "100%",
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(container, {
        width: "44px",
        duration: 0.4,
        delay: 0.1,
        ease: "power2.out",
      });
    }
  }, [isExpanded]);

  const handleIconClick = () => {
    if (!isExpanded) {
      // Si está contraído, expandir y enfocar
      setIsExpanded(true);
    } else if (searchTerm) {
      // Si está expandido y hay texto, limpiar
      onSearchChange('');
      inputRef.current?.focus();
    } else {
      // Si está expandido sin texto, contraer
      setIsExpanded(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      onSearchChange('');
    }
  };

  const handleInputClick = () => {
    // Si el input está visible pero no enfocado, solo enfocar
    if (isExpanded) {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative">
      <div
        ref={searchContainerRef}
        className="flex items-center bg-card border border-border rounded-lg shadow-sm overflow-hidden cursor-pointer relative"
        style={{ width: "44px", height: "44px" }}
        onClick={!isExpanded ? handleIconClick : undefined}
      >
        <div
          ref={iconRef}
          className="flex items-center justify-center w-full h-full text-primary hover:text-primary/80 transition-colors absolute inset-0 z-10"
          onClick={isExpanded ? handleIconClick : undefined}
        >
          {isExpanded && searchTerm ? (
            <FaTimes className="text-sm" />
          ) : (
            <FaSearch className="text-sm" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar herramienta..."
          className="absolute left-11 right-3 top-1/2 transform -translate-y-1/2 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground cursor-text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          style={{ opacity: 0, transform: 'translateY(-50%) translateX(-20px)' }}
        />
      </div>
    </div>
  );
};

// Componente individual de card con animación
const ToolCard = ({ tool }: { tool: typeof allTools[0] }) => {
  const cardRef = useCardAnimation();

  return (
    <Link
      ref={cardRef}
      to={tool.path}
      className="flex flex-col justify-center items-center rounded-lg border border-border bg-card p-2 md:p-4 cursor-pointer min-h-[120px] md:min-h-[140px] text-center"
      style={{ willChange: 'transform' }}
    >
      <div className="flex flex-col items-center justify-center gap-1 md:gap-2 h-full">
        <div className="card-icon text-primary text-lg md:text-xl lg:text-2xl flex items-center justify-center">
          <tool.icon />
        </div>
        <h2 className="card-title text-primary text-xs md:text-sm lg:text-base font-bold leading-tight text-center line-clamp-2">{tool.title}</h2>
        <p className="text-muted-foreground text-xs md:text-sm text-center line-clamp-2 hidden sm:block">{tool.description}</p>
      </div>
    </Link>
  );
};

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTools = useMemo(() => {
    if (!searchTerm) {
      return allTools;
    }
    return allTools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="layout-content-container flex flex-col max-w-[1200px] xl:max-w-[960px] flex-1">
      <div className="flex flex-wrap justify-between gap-2 md:gap-3 p-2 md:p-4 items-center">
        <div className="flex min-w-0 flex-col gap-2 md:gap-3 flex-1">
          <p className="text-[#101418] tracking-light text-xl md:text-2xl lg:text-[32px] font-bold leading-tight">Evaristools</p>
          <p className="text-[#5c728a] text-xs md:text-sm font-normal leading-normal">Herramientas completas de digitalización, OCR y procesamiento de documentos.</p>
        </div>
        {/* Animated Search Input */}
        <div className="flex justify-end mt-2 sm:mt-0">
          <AnimatedSearchInput
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
      </div>

      <h3 className="text-[#101418] text-base md:text-lg font-bold leading-tight tracking-[-0.015em] px-2 md:px-4 pb-2 pt-3 md:pt-4">Todas las herramientas</h3>
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 md:gap-4 p-2 md:p-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>
      ) : (
        <p className="p-2 md:p-4 text-center text-gray-500 text-sm">No se encontraron herramientas que coincidan con tu búsqueda.</p>
      )}
    </div>
  );
}
