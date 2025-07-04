import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';

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
  FaQrcode
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
    <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
      <div className="flex flex-wrap justify-between gap-3 p-4 items-center">
        <div className="flex min-w-72 flex-col gap-3">
          <p className="text-[#101418] tracking-light text-[32px] font-bold leading-tight">Evaristools</p>
          <p className="text-[#5c728a] text-sm font-normal leading-normal">Herramientas completas de digitalización, OCR y procesamiento de documentos.</p>
        </div>
        {/* Search Input */}
        <div className="w-full sm:w-auto mt-4 sm:mt-0">
          <input
            type="text"
            placeholder="Buscar herramienta..."
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:border-transparent w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <h3 className="text-[#101418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Todas las herramientas</h3>
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 p-4">
          {filteredTools.map((tool) => (
            <Link
              key={tool.title}
              to={tool.path}
              className="flex flex-1 flex-col gap-3 rounded-lg border border-[#d4dbe2] bg-gray-50 p-4 items-center hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 group"
            >
              <div className="text-[#101418] group-hover:text-blue-600 transition-colors duration-300">
                <tool.icon />
              </div>
              <h2 className="text-[#101418] text-base font-bold leading-tight text-center group-hover:text-blue-600 transition-colors duration-300">{tool.title}</h2>
              <p className="text-[#5c728a] text-sm text-center">{tool.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="p-4 text-center text-gray-500">No se encontraron herramientas que coincidan con tu búsqueda.</p>
      )}
    </div>
  );
}
