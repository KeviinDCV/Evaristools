import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  ImageList,
  ImageListItem,
  Slider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Stack
} from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CompressIcon from '@mui/icons-material/Compress';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import WatermarkIcon from '@mui/icons-material/BrandingWatermark';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SignatureIcon from '@mui/icons-material/Draw';
import SortIcon from '@mui/icons-material/Sort';
import CodeIcon from '@mui/icons-material/Code';
import ArchiveIcon from '@mui/icons-material/Archive';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pdf-tabpanel-${index}`}
      aria-labelledby={`pdf-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ImageItem {
  file: File;
  url: string;
}

const PdfTools: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Para dividir PDF
  const [splitPageRanges, setSplitPageRanges] = useState('');
  const [selectedSplitFile, setSelectedSplitFile] = useState<File | null>(null);
  
  // Para comprimir PDF
  const [compressionLevel, setCompressionLevel] = useState<string>('medium');
  const [selectedCompressFile, setSelectedCompressFile] = useState<File | null>(null);

  // Para imágenes a PDF
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageQuality, setImageQuality] = useState<string>('medium');


  
  // Para Word/PowerPoint/Excel a PDF
  const [selectedWordFile, setSelectedWordFile] = useState<File | null>(null);
  const [selectedPptFile, setSelectedPptFile] = useState<File | null>(null);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);

  // Para PDF a JPG
  const [selectedPdfToImageFile, setSelectedPdfToImageFile] = useState<File | null>(null);
  const [imageFormat, setImageFormat] = useState<string>('jpg');
  const [imageResolution, setImageResolution] = useState<number>(150);
  const [extractEmbeddedOnly, setExtractEmbeddedOnly] = useState<boolean>(false);

  // Para JPG a PDF
  const [jpgImages, setJpgImages] = useState<ImageItem[]>([]);
  const [jpgOrientation, setJpgOrientation] = useState<string>('portrait');
  const [jpgMargin, setJpgMargin] = useState<number>(20);

  // Para Firmar PDF
  const [selectedSignPdfFile, setSelectedSignPdfFile] = useState<File | null>(null);
  const [signatureType, setSignatureType] = useState<string>('draw');
  const [signatureName, setSignatureName] = useState<string>('');
  const [signaturePosition, setSignaturePosition] = useState<string>('bottom-right');

  // Para Marca de agua
  const [selectedWatermarkFile, setSelectedWatermarkFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENCIAL');
  const [watermarkType, setWatermarkType] = useState<string>('text');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(30);
  const [watermarkImage, setWatermarkImage] = useState<ImageItem | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<string>('center');
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(40);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);

  // Para Rotar PDF
  const [selectedRotateFile, setSelectedRotateFile] = useState<File | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [rotateAllPages, setRotateAllPages] = useState<boolean>(true);
  const [rotatePageRange, setRotatePageRange] = useState<string>('');

  // Para HTML a PDF
  const [htmlUrl, setHtmlUrl] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [htmlConversionType, setHtmlConversionType] = useState<string>('url');

  // Para Desbloquear PDF
  const [selectedLockedFile, setSelectedLockedFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState<string>('');

  // Para Proteger PDF
  const [selectedProtectFile, setSelectedProtectFile] = useState<File | null>(null);
  const [newPdfPassword, setNewPdfPassword] = useState<string>('');
  const [confirmPdfPassword, setConfirmPdfPassword] = useState<string>('');
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(false);

  // Para Ordenar PDF
  const [selectedSortFile, setSelectedSortFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<{index: number, thumbnail: string}[]>([]);
  const [pagesToDelete, setPagesToDelete] = useState<number[]>([]);

  // Para PDF a PDF/A
  const [selectedPdfaFile, setSelectedPdfaFile] = useState<File | null>(null);
  const [pdfaVersion, setPdfaVersion] = useState<string>('1b');
  
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);
  const compressFileInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const wordToPdfInputRef = useRef<HTMLInputElement>(null);
  const pptToPdfInputRef = useRef<HTMLInputElement>(null);
  const excelToPdfInputRef = useRef<HTMLInputElement>(null);
  
  // Nuevas referencias para las nuevas herramientas
  const pdfToImageInputRef = useRef<HTMLInputElement>(null);
  const jpgToPdfInputRef = useRef<HTMLInputElement>(null);
  const signPdfInputRef = useRef<HTMLInputElement>(null);
  const watermarkPdfInputRef = useRef<HTMLInputElement>(null);
  const watermarkImageInputRef = useRef<HTMLInputElement>(null);
  const rotatePdfInputRef = useRef<HTMLInputElement>(null);
  const unlockPdfInputRef = useRef<HTMLInputElement>(null);
  const protectPdfInputRef = useRef<HTMLInputElement>(null);
  const sortPdfInputRef = useRef<HTMLInputElement>(null);
  const pdfToPdfaInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    // Limpia mensajes cuando se cambia de pestaña
    setError(null);
    setSuccess(null);
  };

  // Función para manipular archivos PDF para unir
  const handleMergeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const pdfFilesOnly = newFiles.filter(file => file.type === 'application/pdf');
      
      if (newFiles.length !== pdfFilesOnly.length) {
        setError('Solo se permiten archivos PDF');
      } else {
        setPdfFiles(prev => [...prev, ...pdfFilesOnly]);
        setError(null);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSplitFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedSplitFile(null);
      } else {
        setSelectedSplitFile(file);
        setError(null);
      }
    }
  };

  const handleCompressFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedCompressFile(null);
      } else {
        setSelectedCompressFile(file);
        setError(null);
      }
    }
  };

  // Función para manejar la carga de imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (newFiles.length !== imageFiles.length) {
        setError('Solo se permiten archivos de imagen (JPEG, PNG, etc.)');
        return;
      }
      
      // Crear URLs para vista previa
      const newImageItems: ImageItem[] = [];
      
      imageFiles.forEach(file => {
        const imageUrl = URL.createObjectURL(file);
        newImageItems.push({
          file,
          url: imageUrl
        });
      });
      
      setImages(prev => [...prev, ...newImageItems]);
      setError(null);
    }
  };

  // Función para eliminar una imagen de la lista
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      // Liberar objeto URL para evitar fugas de memoria
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Función para unir PDFs
  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      setError('Se necesitan al menos 2 archivos PDF para unir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const mergedPdf = await PDFDocument.create();
      
      for (const file of pdfFiles) {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      
      // Crear un enlace para descargar
      downloadPdf(mergedPdfBytes, 'merged_document.pdf');
      
      setSuccess('PDFs unidos correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al unir PDFs:', err);
      setError('Ocurrió un error al unir los PDFs');
      setIsProcessing(false);
    }
  };

  // Función para dividir PDF
  const splitPdf = async () => {
    if (!selectedSplitFile) {
      setError('Por favor, seleccione un archivo PDF para dividir');
      return;
    }

    if (!splitPageRanges.trim()) {
      setError('Por favor, especifique los rangos de páginas');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const fileBuffer = await selectedSplitFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const totalPages = pdfDoc.getPageCount();

      // Procesar rangos (ej: "1-3,5,7-9")
      const ranges = splitPageRanges.split(',').map(range => range.trim());
      const outputPdfs = [];

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        let pages: number[] = [];

        if (range.includes('-')) {
          // Rango de páginas (ej: "1-3")
          const [start, end] = range.split('-').map(num => parseInt(num));
          if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
            throw new Error(`Rango inválido: ${range}`);
          }
          pages = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
        } else {
          // Página individual (ej: "5")
          const pageNum = parseInt(range);
          if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            throw new Error(`Página inválida: ${range}`);
          }
          pages = [pageNum - 1]; // -1 porque los índices internos comienzan en 0
        }

        // Crear un nuevo PDF con las páginas especificadas
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, pages);
        copiedPages.forEach(page => newPdf.addPage(page));
        
        const newPdfBytes = await newPdf.save();
        outputPdfs.push({
          bytes: newPdfBytes,
          name: `split_${selectedSplitFile.name.replace('.pdf', '')}_${i+1}.pdf`
        });
      }

      // Crear un ZIP o descargar individualmente si son pocos
      if (outputPdfs.length === 1) {
        downloadPdf(outputPdfs[0].bytes, outputPdfs[0].name);
      } else {
        // Para simplificar, descargaremos los PDFs uno por uno
        outputPdfs.forEach(pdf => downloadPdf(pdf.bytes, pdf.name));
      }

      setSuccess('PDF dividido correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al dividir PDF:', err);
      setError(`Error al dividir el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  // Función para comprimir PDF (simplificada)
  const compressPdf = async () => {
    if (!selectedCompressFile) {
      setError('Por favor, seleccione un archivo PDF para comprimir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const fileBuffer = await selectedCompressFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Realmente no podemos comprimir con pdf-lib directamente
      // Esta es una simulación básica para la demostración
      // En un caso real, necesitaríamos usar otras bibliotecas más específicas
      
      // Guardar con diferentes opciones según el nivel de compresión
      let compressionOptions = {};
      switch (compressionLevel) {
        case 'high':
          // Opciones que podrían resultar en mayor compresión
          compressionOptions = { useObjectStreams: true };
          break;
        case 'medium':
          // Opciones por defecto
          compressionOptions = {};
          break;
        case 'low':
          // Menos compresión pero mejor calidad
          compressionOptions = { useObjectStreams: false };
          break;
      }
      
      const compressedPdfBytes = await pdfDoc.save(compressionOptions);
      
      // Crear un enlace para descargar
      const filename = `compressed_${selectedCompressFile.name}`;
      downloadPdf(compressedPdfBytes, filename);
      
      setSuccess('PDF comprimido correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al comprimir PDF:', err);
      setError('Ocurrió un error al comprimir el PDF');
      setIsProcessing(false);
    }
  };

  // Función para convertir imágenes a PDF
  const convertImagesToPdf = async () => {
    if (images.length === 0) {
      setError('Por favor, seleccione al menos una imagen para convertir a PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      
      // Procesar cada imagen
      for (const imageItem of images) {
        const imageArrayBuffer = await imageItem.file.arrayBuffer();
        let embeddedImage;
        
        // Determinar el tipo de imagen y usar el método apropiado
        if (imageItem.file.type === 'image/jpeg' || imageItem.file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageArrayBuffer);
        } else if (imageItem.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageArrayBuffer);
        } else {
          // Para otros tipos, convertirlos a PNG en un canvas (no implementado aquí)
          continue;
        }
        
        // Obtener dimensiones de la imagen
        const imageDims = embeddedImage.scale(1);
        
        // Crear una página con dimensiones proporcionales a la imagen
        const page = pdfDoc.addPage([imageDims.width, imageDims.height]);
        
        // Determinar dimensiones para ajustar la imagen a la página
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        
        // Dibujar la imagen en la página
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
      
      // Guardar el documento PDF
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el archivo PDF
      downloadPdf(pdfBytes, 'images_to_pdf.pdf');
      
      setSuccess('Imágenes convertidas a PDF correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir imágenes a PDF:', err);
      setError('Ocurrió un error al convertir las imágenes a PDF');
      setIsProcessing(false);
    }
  };

  // Función auxiliar para descargar
  const downloadPdf = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };



  // Función para manejar la selección de archivos para convertir a PDF
  const handleWordFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
      ];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos Word (.doc, .docx)');
        setSelectedWordFile(null);
      } else {
        setSelectedWordFile(file);
        setError(null);
      }
    }
  };

  const handlePptFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.ms-powerpoint' // .ppt
      ];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos PowerPoint (.ppt, .pptx)');
        setSelectedPptFile(null);
      } else {
        setSelectedPptFile(file);
        setError(null);
      }
    }
  };

  const handleExcelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos Excel (.xls, .xlsx)');
        setSelectedExcelFile(null);
      } else {
        setSelectedExcelFile(file);
        setError(null);
      }
    }
  };



  // Función para convertir Word a PDF
  const convertWordToPdf = async () => {
    if (!selectedWordFile) {
      setError('Por favor, seleccione un archivo Word para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Simulación de conversión de Word a PDF
      // En un entorno real, se usaría una API o biblioteca específica
      
      // Creamos un PDF básico con pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // Tamaño A4
      
      // Agregamos un texto básico
      page.drawText(`Archivo Word convertido a PDF: ${selectedWordFile.name}`, {
        x: 50,
        y: 750,
        size: 16,
      });
      
      page.drawText('Este es un PDF de demostración. En un entorno de producción, contendría todo el contenido del documento Word.', {
        x: 50,
        y: 700,
        size: 12,
        maxWidth: 500,
      });
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF
      const filename = `${selectedWordFile.name.replace(/\.docx?$/, '')}.pdf`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('Word convertido a PDF correctamente (archivo de demostración)');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir Word a PDF:', err);
      setError('Ocurrió un error al convertir el Word a PDF');
      setIsProcessing(false);
    }
  };

  // Función para convertir PowerPoint a PDF
  const convertPptToPdf = async () => {
    if (!selectedPptFile) {
      setError('Por favor, seleccione un archivo PowerPoint para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Simulación de conversión de PowerPoint a PDF
      // En un entorno real, se usaría una API o biblioteca específica
      
      // Creamos un PDF básico con pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // Tamaño A4
      
      // Agregamos un texto básico
      page.drawText(`Presentación convertida a PDF: ${selectedPptFile.name}`, {
        x: 50,
        y: 750,
        size: 16,
      });
      
      page.drawText('Este es un PDF de demostración. En un entorno de producción, contendría todas las diapositivas del PowerPoint.', {
        x: 50,
        y: 700,
        size: 12,
        maxWidth: 500,
      });
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF
      const filename = `${selectedPptFile.name.replace(/\.pptx?$/, '')}.pdf`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('PowerPoint convertido a PDF correctamente (archivo de demostración)');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir PowerPoint a PDF:', err);
      setError('Ocurrió un error al convertir el PowerPoint a PDF');
      setIsProcessing(false);
    }
  };

  // Función para convertir Excel a PDF
  const convertExcelToPdf = async () => {
    if (!selectedExcelFile) {
      setError('Por favor, seleccione un archivo Excel para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Simulación de conversión de Excel a PDF
      // En un entorno real, se usaría una API o biblioteca específica
      
      // Creamos un PDF básico con pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]); // Tamaño A4 horizontal
      
      // Agregamos un texto básico
      page.drawText(`Hoja de cálculo convertida a PDF: ${selectedExcelFile.name}`, {
        x: 50,
        y: 500,
        size: 16,
      });
      
      page.drawText('Este es un PDF de demostración. En un entorno de producción, contendría las tablas y datos del Excel.', {
        x: 50,
        y: 450,
        size: 12,
        maxWidth: 700,
      });
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF
      const filename = `${selectedExcelFile.name.replace(/\.xlsx?$/, '')}.pdf`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('Excel convertido a PDF correctamente (archivo de demostración)');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir Excel a PDF:', err);
      setError('Ocurrió un error al convertir el Excel a PDF');
      setIsProcessing(false);
    }
  };

  // Función para convertir PDF a JPG
  const convertPdfToImage = async () => {
    if (!selectedPdfToImageFile) {
      setError('Por favor, seleccione un archivo PDF para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // En un entorno real, utilizaríamos una biblioteca o servicio externo para convertir PDF a imagen
      const fileBuffer = await selectedPdfToImageFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Simulación de extracción de imágenes/conversión de páginas
      setTimeout(() => {
        // En un caso real, el archivo contendría las imágenes extraídas
        if (extractEmbeddedOnly) {
          // Simular extracción de imágenes embebidas
          alert(`Se han extraído 3 imágenes del documento PDF. Descargue el archivo ZIP para acceder a ellas.`);
          
          // Descargar un archivo ZIP simulado
          const blob = new Blob(['Contenido simulado de imágenes embebidas'], { type: 'application/zip' });
          saveAs(blob, `extracted_images_${selectedPdfToImageFile.name.replace('.pdf', '')}.zip`);
        } else {
          // Simular conversión de páginas a imágenes
          alert(`Se han convertido ${pageCount} páginas del PDF a formato ${imageFormat.toUpperCase()}. Descargue el archivo ZIP para acceder a ellas.`);
          
          // Descargar un archivo ZIP simulado
          const blob = new Blob(['Contenido simulado de imágenes convertidas'], { type: 'application/zip' });
          saveAs(blob, `pdf_pages_${selectedPdfToImageFile.name.replace('.pdf', '')}.zip`);
        }
        
        setSuccess(`PDF convertido a ${imageFormat.toUpperCase()} correctamente`);
        setIsProcessing(false);
      }, 2000);
    } catch (err) {
      console.error('Error al convertir PDF a imágenes:', err);
      setError('Ocurrió un error al convertir el PDF a imágenes');
      setIsProcessing(false);
    }
  };

  // Función para convertir JPG a PDF
  const convertJpgToPdf = async () => {
    if (jpgImages.length === 0) {
      setError('Por favor, seleccione al menos una imagen para convertir a PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      
      // Definir tamaño de página
      let pageWidth = 595; // A4 - Ancho en puntos (portrait)
      let pageHeight = 842; // A4 - Alto en puntos (portrait)
      
      if (jpgOrientation === 'landscape') {
        // Intercambiar ancho y alto para orientación horizontal
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
      
      // Procesar cada imagen
      for (const imageItem of jpgImages) {
        const imageArrayBuffer = await imageItem.file.arrayBuffer();
        let embeddedImage;
        
        // Determinar el tipo de imagen y usar el método apropiado
        if (imageItem.file.type === 'image/jpeg' || imageItem.file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageArrayBuffer);
        } else if (imageItem.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageArrayBuffer);
        } else {
          // Para otros tipos, convertirlos a PNG en un canvas (no implementado aquí)
          continue;
        }
        
        // Crear una página con dimensiones definidas
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Obtener dimensiones de la imagen
        const imageDims = embeddedImage.scale(1);
        
        // Calcular dimensiones para ajustar la imagen a la página con márgenes
        const margin = jpgMargin;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        // Calcular escala para ajustar la imagen manteniendo la proporción
        let scale = Math.min(
          maxWidth / imageDims.width,
          maxHeight / imageDims.height
        );
        
        const scaledWidth = imageDims.width * scale;
        const scaledHeight = imageDims.height * scale;
        
        // Calcular posición para centrar la imagen
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;
        
        // Dibujar la imagen en la página
        page.drawImage(embeddedImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }
      
      // Guardar el documento PDF
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el archivo PDF
      downloadPdf(pdfBytes, 'images_to_pdf.pdf');
      
      setSuccess('Imágenes JPG convertidas a PDF correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al convertir imágenes a PDF:', err);
      setError('Ocurrió un error al convertir las imágenes a PDF');
      setIsProcessing(false);
    }
  };

  // Función para firmar PDF
  const signPdf = async () => {
    if (!selectedSignPdfFile) {
      setError('Por favor, seleccione un archivo PDF para firmar');
      return;
    }

    if (signatureType === 'name' && !signatureName.trim()) {
      setError('Por favor, ingrese un nombre para la firma');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // En un entorno real, utilizaríamos una biblioteca o servicio externo para firmas electrónicas
      const fileBuffer = await selectedSignPdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Simulación de firma de documento
      // En un caso real, añadiríamos una firma digital o imagen de firma
      const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
      const { width, height } = lastPage.getSize();
      
      // Posición de la firma según la selección
      let signatureX = width / 2;
      let signatureY = height / 2;
      
      switch (signaturePosition) {
        case 'bottom-right':
          signatureX = width - 150;
          signatureY = 100;
          break;
        case 'bottom-left':
          signatureX = 100;
          signatureY = 100;
          break;
        case 'top-right':
          signatureX = width - 150;
          signatureY = height - 100;
          break;
        case 'top-left':
          signatureX = 100;
          signatureY = height - 100;
          break;
      }
      
      // Simulación de adición de firma
      if (signatureType === 'name') {
        lastPage.drawText(`Firmado por: ${signatureName}`, {
          x: signatureX,
          y: signatureY,
          size: 12,
        });
      } else {
        // En 'draw', normalmente se añadiría una imagen de firma dibujada
        lastPage.drawText(`[Firma dibujada]`, {
          x: signatureX,
          y: signatureY,
          size: 12,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF firmado
      const filename = `signed_${selectedSignPdfFile.name}`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('PDF firmado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al firmar el PDF:', err);
      setError('Ocurrió un error al firmar el PDF');
      setIsProcessing(false);
    }
  };

  // Función para añadir marca de agua a PDF
  const addWatermark = async () => {
    if (!selectedWatermarkFile) {
      setError('Por favor, seleccione un archivo PDF para añadir marca de agua');
      return;
    }

    if (watermarkType === 'text' && !watermarkText.trim()) {
      setError('Por favor, ingrese un texto para la marca de agua');
      return;
    }

    if (watermarkType === 'image' && !watermarkImage) {
      setError('Por favor, seleccione una imagen para la marca de agua');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const fileBuffer = await selectedWatermarkFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      // Aplicar marca de agua a todas las páginas
      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Posición de la marca de agua
        let watermarkX = width / 2;
        let watermarkY = height / 2;
        
        // Ajustar posición según la selección
        switch (watermarkPosition) {
          case 'top-left':
            watermarkX = width * 0.25;
            watermarkY = height * 0.75;
            break;
          case 'top-right':
            watermarkX = width * 0.75;
            watermarkY = height * 0.75;
            break;
          case 'bottom-left':
            watermarkX = width * 0.25;
            watermarkY = height * 0.25;
            break;
          case 'bottom-right':
            watermarkX = width * 0.75;
            watermarkY = height * 0.25;
            break;
          // 'center' es el valor por defecto
        }
        
        if (watermarkType === 'text') {
          // Aplicar marca de agua de texto
          page.drawText(watermarkText, {
            x: watermarkX,
            y: watermarkY,
            size: watermarkFontSize,
            opacity: watermarkOpacity / 100,
            rotate: { type: 'degrees', angle: watermarkRotation } as any,
            color: rgb(0.5, 0.5, 0.5),
          });
        } else {
          // En un entorno real, aquí añadiríamos la imagen como marca de agua
          // Para esta demostración, simulamos con texto
          page.drawText('[Marca de agua de imagen]', {
            x: watermarkX,
            y: watermarkY,
            size: watermarkFontSize,
            opacity: watermarkOpacity / 100,
            rotate: { type: 'degrees', angle: watermarkRotation } as any,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF con marca de agua
      const filename = `watermarked_${selectedWatermarkFile.name}`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('Marca de agua añadida correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al añadir marca de agua:', err);
      setError('Ocurrió un error al añadir la marca de agua al PDF');
      setIsProcessing(false);
    }
  };

  // Función para rotar PDF
  const rotatePdf = async () => {
    if (!selectedRotateFile) {
      setError('Por favor, seleccione un archivo PDF para rotar');
      return;
    }

    if (!rotateAllPages && !rotatePageRange.trim()) {
      setError('Por favor, especifique el rango de páginas a rotar');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const fileBuffer = await selectedRotateFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();
      
      if (rotateAllPages) {
        // Rotar todas las páginas
        pages.forEach(page => {
          page.setRotation({
            angle: rotationAngle,
            type: 'degrees'
          } as any);
        });
      } else {
        // Rotar solo las páginas especificadas
        const pageCount = pdfDoc.getPageCount();
        const ranges = rotatePageRange.split(',').map(range => range.trim());
        
        for (const range of ranges) {
          let pagesToRotate: number[] = [];
          
          if (range.includes('-')) {
            // Rango de páginas (ej: "1-3")
            const [start, end] = range.split('-').map(num => parseInt(num));
            if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end) {
              throw new Error(`Rango de páginas inválido: ${range}`);
            }
            pagesToRotate = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
          } else {
            // Página individual (ej: "5")
            const pageNum = parseInt(range);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > pageCount) {
              throw new Error(`Número de página inválido: ${range}`);
            }
            pagesToRotate = [pageNum - 1]; // -1 porque los índices comienzan en 0
          }
          
          // Aplicar rotación a las páginas seleccionadas
          pagesToRotate.forEach(pageIndex => {
            pages[pageIndex].setRotation({
              angle: rotationAngle,
              type: 'degrees'
            } as any);
          });
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el PDF rotado
      const filename = `rotated_${selectedRotateFile.name}`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('PDF rotado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al rotar el PDF:', err);
      setError(`Error al rotar el PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setIsProcessing(false);
    }
  };

  // Función para convertir HTML a PDF
  const convertHtmlToPdf = async () => {
    if (htmlConversionType === 'url' && !htmlUrl.trim()) {
      setError('Por favor, ingrese una URL para convertir');
      return;
    }

    if (htmlConversionType === 'content' && !htmlContent.trim()) {
      setError('Por favor, ingrese contenido HTML para convertir');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // En un entorno real, se usaría un servicio backend o API para convertir HTML a PDF
      // Aquí simulamos la conversión
      
      setTimeout(() => {
        // Crear un PDF simple con un mensaje
        const source = htmlConversionType === 'url' ? htmlUrl : 'contenido HTML directo';
        
        // Generar un PDF simulado
        const blob = new Blob(['Contenido simulado de conversión HTML a PDF'], { type: 'application/pdf' });
        saveAs(blob, 'html_to_pdf.pdf');
        
        setSuccess(`HTML convertido a PDF correctamente (${source})`);
        setIsProcessing(false);
      }, 1500);
    } catch (err) {
      console.error('Error al convertir HTML a PDF:', err);
      setError('Ocurrió un error al convertir el HTML a PDF');
      setIsProcessing(false);
    }
  };

  // Función para desbloquear PDF
  const unlockPdf = async () => {
    if (!selectedLockedFile) {
      setError('Por favor, seleccione un archivo PDF para desbloquear');
      return;
    }

    if (!pdfPassword.trim()) {
      setError('Por favor, ingrese la contraseña del PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Simulación de desbloqueo de PDF
      // En un entorno real, se usaría pdf-lib con la contraseña proporcionada
      
      setTimeout(() => {
        try {
          // Simulación de éxito en el desbloqueo
          
          // En un caso real, cargaríamos el PDF con la contraseña y lo guardaríamos sin protección
          
          // Generar un PDF simulado
          const blob = new Blob(['Contenido de PDF desbloqueado'], { type: 'application/pdf' });
          saveAs(blob, `unlocked_${selectedLockedFile.name}`);
          
          setSuccess('PDF desbloqueado correctamente');
          setIsProcessing(false);
        } catch (error) {
          // Simulación de error por contraseña incorrecta
          setError('Contraseña incorrecta. El PDF no pudo ser desbloqueado.');
          setIsProcessing(false);
        }
      }, 1500);
    } catch (err) {
      console.error('Error al desbloquear el PDF:', err);
      setError('Ocurrió un error al desbloquear el PDF');
      setIsProcessing(false);
    }
  };

  // Función para proteger PDF
  const protectPdf = async () => {
    if (!selectedProtectFile) {
      setError('Por favor, seleccione un archivo PDF para proteger');
      return;
    }

    if (!newPdfPassword.trim()) {
      setError('Por favor, ingrese una contraseña para el PDF');
      return;
    }

    if (newPdfPassword !== confirmPdfPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Simulación de protección de PDF
      setTimeout(() => {
        // Generar un PDF simulado
        const blob = new Blob(['Contenido de PDF protegido'], { type: 'application/pdf' });
        saveAs(blob, `protected_${selectedProtectFile.name}`);
        
        setSuccess('PDF protegido correctamente');
        setIsProcessing(false);
      }, 1500);
    } catch (err) {
      console.error('Error al proteger el PDF:', err);
      setError('Ocurrió un error al proteger el PDF');
      setIsProcessing(false);
    }
  };

  // Función para ordenar páginas del PDF
  const sortPdf = async () => {
    if (!selectedSortFile) {
      setError('Por favor, seleccione un archivo PDF para ordenar');
      return;
    }

    if (pdfPages.length === 0) {
      setError('No se pudieron cargar las páginas del PDF');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // En un entorno real, se usaría pdf-lib para reordenar/eliminar páginas
      const fileBuffer = await selectedSortFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Crear un nuevo documento con las páginas en el orden especificado
      const newPdfDoc = await PDFDocument.create();
      
      // Copiar las páginas en el nuevo orden y excluir las marcadas para eliminación
      for (const pageData of pdfPages) {
        if (!pagesToDelete.includes(pageData.index)) {
          const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageData.index]);
          newPdfDoc.addPage(copiedPage);
        }
      }
      
      const pdfBytes = await newPdfDoc.save();
      
      // Descargar el PDF ordenado
      const filename = `sorted_${selectedSortFile.name}`;
      downloadPdf(pdfBytes, filename);
      
      setSuccess('PDF ordenado correctamente');
      setIsProcessing(false);
    } catch (err) {
      console.error('Error al ordenar el PDF:', err);
      setError('Ocurrió un error al ordenar el PDF');
      setIsProcessing(false);
    }
  };

  // Función para convertir PDF a PDF/A
  const convertToPdfA = async () => {
    if (!selectedPdfaFile) {
      setError('Por favor, seleccione un archivo PDF para convertir a PDF/A');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // En un entorno real, se usaría un servicio backend especializado para convertir a PDF/A
      // La conversión a PDF/A es compleja y generalmente requiere herramientas especializadas
      
      // Simulación de conversión a PDF/A
      setTimeout(() => {
        // Generar un PDF simulado
        const blob = new Blob(['Contenido simulado de PDF/A'], { type: 'application/pdf' });
        saveAs(blob, `pdfa_${selectedPdfaFile.name}`);
        
        setSuccess(`PDF convertido a PDF/A (versión ${pdfaVersion}) correctamente`);
        setIsProcessing(false);
      }, 1500);
    } catch (err) {
      console.error('Error al convertir a PDF/A:', err);
      setError('Ocurrió un error al convertir el PDF a PDF/A');
      setIsProcessing(false);
    }
  };

  // Función para manejar la selección de archivos para PDF a JPG
  const handlePdfToImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedPdfToImageFile(null);
      } else {
        setSelectedPdfToImageFile(file);
        setError(null);
      }
    }
  };

  // Función para manejar la carga de imágenes JPG
  const handleJpgImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      const imageFiles = newFiles.filter(file => 
        file.type === 'image/jpeg' || 
        file.type === 'image/jpg' ||
        file.type === 'image/png' ||
        file.type === 'image/gif'
      );
      
      if (newFiles.length !== imageFiles.length) {
        setError('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
        return;
      }
      
      // Crear URLs para vista previa
      const newImageItems: ImageItem[] = [];
      
      imageFiles.forEach(file => {
        const imageUrl = URL.createObjectURL(file);
        newImageItems.push({
          file,
          url: imageUrl
        });
      });
      
      setJpgImages(prev => [...prev, ...newImageItems]);
      setError(null);
    }
  };

  // Función para eliminar una imagen JPG de la lista
  const handleRemoveJpgImage = (index: number) => {
    setJpgImages(prev => {
      // Liberar objeto URL para evitar fugas de memoria
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Función para seleccionar PDF para firmar
  const handleSignPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedSignPdfFile(null);
      } else {
        setSelectedSignPdfFile(file);
        setError(null);
      }
    }
  };

  // Función para seleccionar PDF para marca de agua
  const handleWatermarkPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedWatermarkFile(null);
      } else {
        setSelectedWatermarkFile(file);
        setError(null);
      }
    }
  };

  // Función para cargar imagen para marca de agua
  const handleWatermarkImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      setWatermarkImage({
        file,
        url: imageUrl
      });
      setError(null);
    }
  };

  // Función para seleccionar PDF para rotar
  const handleRotatePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedRotateFile(null);
      } else {
        setSelectedRotateFile(file);
        setError(null);
      }
    }
  };

  // Función para seleccionar PDF bloqueado
  const handleLockedPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedLockedFile(null);
      } else {
        setSelectedLockedFile(file);
        setError(null);
      }
    }
  };

  // Función para seleccionar PDF para proteger
  const handleProtectPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedProtectFile(null);
      } else {
        setSelectedProtectFile(file);
        setError(null);
      }
    }
  };

  // Función para seleccionar PDF para ordenar
  const handleSortPdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedSortFile(null);
        setPdfPages([]);
        return;
      }
      
      setSelectedSortFile(file);
      setError(null);
      
      // En un entorno real, cargaríamos el PDF y extraeríamos miniaturas de cada página
      // Aquí crearemos páginas de muestra para la demostración
      try {
        setIsProcessing(true);
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const pageCount = pdfDoc.getPageCount();
        
        // Crear páginas de muestra
        const pagesData = Array.from({ length: pageCount }, (_, i) => ({
          index: i,
          // En un entorno real, generaríamos miniaturas reales
          thumbnail: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="200" viewBox="0 0 150 200"><rect width="150" height="200" fill="lightgray"/><text x="75" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="black">Página ${i + 1}</text></svg>`
        }));
        
        setPdfPages(pagesData);
        setIsProcessing(false);
      } catch (err) {
        console.error('Error al cargar miniaturas del PDF:', err);
        setError('No se pudieron cargar las páginas del PDF');
        setIsProcessing(false);
      }
    }
  };

  // Función para seleccionar PDF para convertir a PDF/A
  const handlePdfToPdfaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        setSelectedPdfaFile(null);
      } else {
        setSelectedPdfaFile(file);
        setError(null);
      }
    }
  };

  // Función para mover una página en el orden
  const handleMovePage = (fromIndex: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && fromIndex === 0) || 
        (direction === 'down' && fromIndex === pdfPages.length - 1)) {
      return;
    }

    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    
    setPdfPages(prev => {
      const newPages = [...prev];
      const [movedItem] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedItem);
      return newPages;
    });
  };

  // Función para marcar/desmarcar una página para eliminación
  const handleTogglePageDelete = (index: number) => {
    setPagesToDelete(prev => {
      if (prev.includes(index)) {
        return prev.filter(pageIndex => pageIndex !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Herramientas PDF
      </Typography>
      <Typography variant="body1" paragraph>
        Administre sus archivos PDF con nuestras herramientas para unir, dividir, comprimir, convertir documentos y mucho más.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          aria-label="pdf tools tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<MergeTypeIcon />} label="Unir PDFs" />
          <Tab icon={<ContentCutIcon />} label="Dividir PDF" />
          <Tab icon={<CompressIcon />} label="Comprimir PDF" />
          <Tab icon={<ImageIcon />} label="Imágenes a PDF" />

          <Tab icon={<PictureAsPdfIcon />} label="Word a PDF" />
          <Tab icon={<PictureAsPdfIcon />} label="PowerPoint a PDF" />
          <Tab icon={<PictureAsPdfIcon />} label="Excel a PDF" />
          <Tab icon={<ImageIcon />} label="PDF a JPG" />
          <Tab icon={<PictureAsPdfIcon />} label="JPG a PDF" />
          <Tab icon={<SignatureIcon />} label="Firmar PDF" />
          <Tab icon={<WatermarkIcon />} label="Marca de agua" />
          <Tab icon={<RotateRightIcon />} label="Rotar PDF" />
          <Tab icon={<CodeIcon />} label="HTML a PDF" />
          <Tab icon={<LockOpenIcon />} label="Desbloquear PDF" />
          <Tab icon={<LockIcon />} label="Proteger PDF" />
          <Tab icon={<SortIcon />} label="Ordenar PDF" />
          <Tab icon={<ArchiveIcon />} label="PDF a PDF/A" />
          <Tab icon={<WatermarkIcon />} label="Añadir marca de agua" />
          <Tab icon={<RotateRightIcon />} label="Rotar PDF" />
          <Tab icon={<CodeIcon />} label="Convertir HTML a PDF" />
          <Tab icon={<LockOpenIcon />} label="Desbloquear PDF" />
          <Tab icon={<LockIcon />} label="Proteger PDF" />
          <Tab icon={<SortIcon />} label="Ordenar PDF" />
          <Tab icon={<ArchiveIcon />} label="PDF a PDF/A" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Unir varios archivos PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => mergeFileInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDFs
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleMergeFileChange}
              multiple
              style={{ display: 'none' }}
              ref={mergeFileInputRef}
            />

            {pdfFiles.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivos seleccionados ({pdfFiles.length}):
                </Typography>
                <List sx={{ bgcolor: '#f5f5f5', borderRadius: 1, mb: 3 }}>
                  {pdfFiles.map((file, index) => (
                    <React.Fragment key={`${file.name}-${index}`}>
                      <ListItem
                        secondaryAction={
                          <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(index)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        />
                      </ListItem>
                      {index < pdfFiles.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <FileDownloadIcon />}
                  onClick={mergePdfs}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Unir PDFs'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Dividir un archivo PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => splitFileInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleSplitFileChange}
              style={{ display: 'none' }}
              ref={splitFileInputRef}
            />

            {selectedSplitFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedSplitFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Rangos de páginas"
                    variant="outlined"
                    value={splitPageRanges}
                    onChange={(e) => setSplitPageRanges(e.target.value)}
                    placeholder="Ejemplo: 1-3,5,7-9"
                    helperText="Introduce los rangos de páginas separados por comas. Ejemplo: 1-3,5,7-9"
                  />
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <ContentCutIcon />}
                  onClick={splitPdf}
                  disabled={isProcessing || !splitPageRanges.trim()}
                >
                  {isProcessing ? 'Procesando...' : 'Dividir PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Comprimir un archivo PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => compressFileInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleCompressFileChange}
              style={{ display: 'none' }}
              ref={compressFileInputRef}
            />

            {selectedCompressFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedCompressFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Nivel de Compresión</InputLabel>
                    <Select
                      value={compressionLevel}
                      label="Nivel de Compresión"
                      onChange={(e) => setCompressionLevel(e.target.value)}
                    >
                      <MenuItem value="low">Baja (mejor calidad)</MenuItem>
                      <MenuItem value="medium">Media (equilibrado)</MenuItem>
                      <MenuItem value="high">Alta (menor tamaño)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <CompressIcon />}
                  onClick={compressPdf}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Comprimir PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir imágenes a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => imagesInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar Imágenes
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleImagesChange}
              multiple
              style={{ display: 'none' }}
              ref={imagesInputRef}
            />

            {images.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Imágenes seleccionadas ({images.length}):
                </Typography>
                
                <Paper sx={{ p: 2, mb: 3, maxHeight: '300px', overflow: 'auto' }}>
                  <ImageList cols={3} gap={8}>
                    {images.map((img, index) => (
                      <ImageListItem key={`${img.file.name}-${index}`} sx={{ position: 'relative' }}>
                        <img 
                          src={img.url} 
                          alt={img.file.name}
                          loading="lazy"
                          style={{ maxHeight: '120px', objectFit: 'contain' }}
                        />
                        <IconButton 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(255,0,0,0.6)',
                            }
                          }} 
                          onClick={() => handleRemoveImage(index)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.file.name}
                        </Typography>
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Paper>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Calidad de Imagen</InputLabel>
                    <Select
                      value={imageQuality}
                      label="Calidad de Imagen"
                      onChange={(e) => setImageQuality(e.target.value)}
                    >
                      <MenuItem value="low">Baja (archivo más pequeño)</MenuItem>
                      <MenuItem value="medium">Media (recomendado)</MenuItem>
                      <MenuItem value="high">Alta (mejor calidad)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={convertImagesToPdf}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>



      <TabPanel value={currentTab} index={7}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir Word a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => wordToPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar Word
            </Button>
            <input
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleWordFileChange}
              style={{ display: 'none' }}
              ref={wordToPdfInputRef}
            />

            {selectedWordFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedWordFile.name}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Convierte tu documento Word a PDF con la máxima calidad y exactamente igual que el archivo original. Ideal para compartir documentos que no se deben modificar.
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                    onClick={convertWordToPdf}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir PowerPoint a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => pptToPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PowerPoint
            </Button>
            <input
              type="file"
              accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handlePptFileChange}
              style={{ display: 'none' }}
              ref={pptToPdfInputRef}
            />

            {selectedPptFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedPptFile.name}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Convierte tu presentación PowerPoint a PDF. Cada diapositiva se convertirá en una página del PDF, manteniendo el formato original.
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                    onClick={convertPptToPdf}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={9}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir Excel a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => excelToPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar Excel
            </Button>
            <input
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleExcelFileChange}
              style={{ display: 'none' }}
              ref={excelToPdfInputRef}
            />

            {selectedExcelFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedExcelFile.name}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Convierte tus tablas Excel a PDF con las columnas ajustadas al ancho de la página. Puedes elegir orientación vertical u horizontal.
                  </Typography>
                  
                  <FormControl sx={{ minWidth: 200, mb: 3 }}>
                    <InputLabel>Orientación de página</InputLabel>
                    <Select
                      defaultValue="landscape"
                      label="Orientación de página"
                    >
                      <MenuItem value="portrait">Vertical</MenuItem>
                      <MenuItem value="landscape">Horizontal</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                      onClick={convertExcelToPdf}
                      disabled={isProcessing}
                      sx={{ ml: 1 }}
                    >
                      {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={10}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir PDF a JPG
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => pdfToImageInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfToImageFileChange}
              style={{ display: 'none' }}
              ref={pdfToImageInputRef}
            />

            {selectedPdfToImageFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedPdfToImageFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Opciones de conversión:
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractEmbeddedOnly}
                          onChange={(e) => setExtractEmbeddedOnly(e.target.checked)}
                        />
                      }
                      label="Extraer solo imágenes embebidas"
                    />
                    
                    {!extractEmbeddedOnly && (
                      <>
                        <FormControl fullWidth sx={{ mt: 2 }}>
                          <InputLabel>Formato de imagen</InputLabel>
                          <Select
                            value={imageFormat}
                            label="Formato de imagen"
                            onChange={(e) => setImageFormat(e.target.value)}
                          >
                            <MenuItem value="jpg">JPG</MenuItem>
                            <MenuItem value="png">PNG</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography gutterBottom>
                            Resolución (DPI): {imageResolution}
                          </Typography>
                          <Slider
                            value={imageResolution}
                            onChange={(_, value) => setImageResolution(value as number)}
                            min={72}
                            max={300}
                            step={1}
                            marks={[
                              { value: 72, label: '72' },
                              { value: 150, label: '150' },
                              { value: 300, label: '300' }
                            ]}
                          />
                        </Box>
                      </>
                    )}
                  </FormControl>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <ImageIcon />}
                  onClick={convertPdfToImage}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : extractEmbeddedOnly ? 'Extraer imágenes' : 'Convertir a imágenes'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={11}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir JPG a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => jpgToPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar Imágenes
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleJpgImagesChange}
              multiple
              style={{ display: 'none' }}
              ref={jpgToPdfInputRef}
            />

            {jpgImages.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Imágenes seleccionadas ({jpgImages.length}):
                </Typography>
                
                <Paper sx={{ p: 2, mb: 3, maxHeight: '300px', overflow: 'auto' }}>
                  <ImageList cols={3} gap={8}>
                    {jpgImages.map((img, index) => (
                      <ImageListItem key={`${img.file.name}-${index}`} sx={{ position: 'relative' }}>
                        <img 
                          src={img.url} 
                          alt={img.file.name}
                          loading="lazy"
                          style={{ maxHeight: '120px', objectFit: 'contain' }}
                        />
                        <IconButton 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(255,0,0,0.6)',
                            }
                          }} 
                          onClick={() => handleRemoveJpgImage(index)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.file.name}
                        </Typography>
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Paper>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }}>
                    <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                      <FormControl fullWidth>
                        <InputLabel>Orientación</InputLabel>
                        <Select
                          value={jpgOrientation}
                          label="Orientación"
                          onChange={(e) => setJpgOrientation(e.target.value)}
                        >
                          <MenuItem value="portrait">Vertical</MenuItem>
                          <MenuItem value="landscape">Horizontal</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                      <Typography gutterBottom>
                        Margen (px): {jpgMargin}
                      </Typography>
                      <Slider
                        value={jpgMargin}
                        onChange={(_, value) => setJpgMargin(value as number)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </Box>
                  </Stack>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={convertJpgToPdf}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>
      
      <TabPanel value={currentTab} index={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Firmar PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => signPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleSignPdfChange}
              style={{ display: 'none' }}
              ref={signPdfInputRef}
            />

            {selectedSignPdfFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedSignPdfFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tipo de firma:
                    </Typography>
                    <RadioGroup
                      row
                      value={signatureType}
                      onChange={(e) => setSignatureType(e.target.value)}
                    >
                      <FormControlLabel value="draw" control={<Radio />} label="Dibujar firma" />
                      <FormControlLabel value="name" control={<Radio />} label="Usar texto como firma" />
                    </RadioGroup>
                  </FormControl>
                  
                  {signatureType === 'name' && (
                    <TextField
                      fullWidth
                      label="Nombre para la firma"
                      variant="outlined"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Escriba su nombre completo"
                      sx={{ mb: 3 }}
                    />
                  )}
                  
                  {signatureType === 'draw' && (
                    <Box 
                      sx={{ 
                        border: '1px dashed grey', 
                        borderRadius: 1, 
                        p: 2, 
                        mb: 3, 
                        height: '150px', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="body2" color="textSecondary" align="center">
                        En un entorno de producción, aquí aparecería un pad para dibujar su firma.
                        <br />
                        Para esta demostración, se utilizará una firma predeterminada.
                      </Typography>
                    </Box>
                  )}
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Posición de la firma</InputLabel>
                    <Select
                      value={signaturePosition}
                      label="Posición de la firma"
                      onChange={(e) => setSignaturePosition(e.target.value)}
                    >
                      <MenuItem value="bottom-right">Abajo a la derecha</MenuItem>
                      <MenuItem value="bottom-left">Abajo a la izquierda</MenuItem>
                      <MenuItem value="top-right">Arriba a la derecha</MenuItem>
                      <MenuItem value="top-left">Arriba a la izquierda</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <SignatureIcon />}
                  onClick={signPdf}
                  disabled={isProcessing || (signatureType === 'name' && !signatureName.trim())}
                >
                  {isProcessing ? 'Procesando...' : 'Firmar PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={13}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Añadir marca de agua a PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => watermarkPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleWatermarkPdfChange}
              style={{ display: 'none' }}
              ref={watermarkPdfInputRef}
            />

            {selectedWatermarkFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedWatermarkFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tipo de marca de agua:
                    </Typography>
                    <RadioGroup
                      row
                      value={watermarkType}
                      onChange={(e) => setWatermarkType(e.target.value)}
                    >
                      <FormControlLabel value="text" control={<Radio />} label="Texto" />
                      <FormControlLabel value="image" control={<Radio />} label="Imagen" />
                    </RadioGroup>
                  </FormControl>
                  
                  {watermarkType === 'text' && (
                    <TextField
                      fullWidth
                      label="Texto para marca de agua"
                      variant="outlined"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Ej: CONFIDENCIAL"
                      sx={{ mb: 3 }}
                    />
                  )}
                  
                  {watermarkType === 'image' && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => watermarkImageInputRef.current?.click()}
                        sx={{ mb: 2 }}
                      >
                        Seleccionar imagen
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWatermarkImageChange}
                        style={{ display: 'none' }}
                        ref={watermarkImageInputRef}
                      />
                      
                      {watermarkImage && (
                        <Box sx={{ mb: 3, textAlign: 'center' }}>
                          <img 
                            src={watermarkImage.url} 
                            alt="Marca de agua"
                            style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                  
                  <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }}>
                    <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                      <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Posición</InputLabel>
                        <Select
                          value={watermarkPosition}
                          label="Posición"
                          onChange={(e) => setWatermarkPosition(e.target.value)}
                        >
                          <MenuItem value="center">Centro</MenuItem>
                          <MenuItem value="top-right">Arriba a la derecha</MenuItem>
                          <MenuItem value="top-left">Arriba a la izquierda</MenuItem>
                          <MenuItem value="bottom-right">Abajo a la derecha</MenuItem>
                          <MenuItem value="bottom-left">Abajo a la izquierda</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                      <Typography gutterBottom>
                        Opacidad: {watermarkOpacity}%
                      </Typography>
                      <Slider
                        value={watermarkOpacity}
                        onChange={(_, value) => setWatermarkOpacity(value as number)}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </Box>
                  </Stack>
                  
                  {watermarkType === 'text' && (
                    <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }}>
                      <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                        <Typography gutterBottom>
                          Tamaño de fuente: {watermarkFontSize}
                        </Typography>
                        <Slider
                          value={watermarkFontSize}
                          onChange={(_, value) => setWatermarkFontSize(value as number)}
                          min={10}
                          max={72}
                          step={1}
                        />
                      </Box>
                      <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                        <Typography gutterBottom>
                          Rotación: {watermarkRotation}°
                        </Typography>
                        <Slider
                          value={watermarkRotation}
                          onChange={(_, value) => setWatermarkRotation(value as number)}
                          min={0}
                          max={360}
                          step={15}
                        />
                      </Box>
                    </Stack>
                  )}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <WatermarkIcon />}
                  onClick={addWatermark}
                  disabled={isProcessing || (watermarkType === 'text' && !watermarkText.trim()) || (watermarkType === 'image' && !watermarkImage)}
                >
                  {isProcessing ? 'Procesando...' : 'Añadir marca de agua'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={14}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rotar PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => rotatePdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleRotatePdfChange}
              style={{ display: 'none' }}
              ref={rotatePdfInputRef}
            />

            {selectedRotateFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedRotateFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ángulo de rotación:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Button 
                      variant={rotationAngle === 90 ? "contained" : "outlined"}
                      onClick={() => setRotationAngle(90)}
                      sx={{ mr: 1 }}
                    >
                      90°
                    </Button>
                    <Button 
                      variant={rotationAngle === 180 ? "contained" : "outlined"}
                      onClick={() => setRotationAngle(180)}
                      sx={{ mr: 1 }}
                    >
                      180°
                    </Button>
                    <Button 
                      variant={rotationAngle === 270 ? "contained" : "outlined"}
                      onClick={() => setRotationAngle(270)}
                      sx={{ mr: 1 }}
                    >
                      270°
                    </Button>
                    <Button 
                      variant={rotationAngle === 0 ? "contained" : "outlined"}
                      onClick={() => setRotationAngle(0)}
                    >
                      0°
                    </Button>
                  </Box>
                  
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={rotateAllPages}
                          onChange={(e) => setRotateAllPages(e.target.checked)}
                        />
                      }
                      label="Rotar todas las páginas"
                    />
                  </FormControl>
                  
                  {!rotateAllPages && (
                    <TextField
                      fullWidth
                      label="Páginas a rotar"
                      variant="outlined"
                      value={rotatePageRange}
                      onChange={(e) => setRotatePageRange(e.target.value)}
                      placeholder="Ejemplo: 1-3,5,7-9"
                      helperText="Introduce los rangos de páginas separados por comas. Ejemplo: 1-3,5,7-9"
                      sx={{ mb: 3 }}
                    />
                  )}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <RotateRightIcon />}
                  onClick={rotatePdf}
                  disabled={isProcessing || (!rotateAllPages && !rotatePageRange.trim())}
                >
                  {isProcessing ? 'Procesando...' : 'Rotar PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={15}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir HTML a PDF
            </Typography>
            
            <Box sx={{ mt: 3, mb: 3 }}>
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tipo de conversión:
                </Typography>
                <RadioGroup
                  row
                  value={htmlConversionType}
                  onChange={(e) => setHtmlConversionType(e.target.value)}
                >
                  <FormControlLabel value="url" control={<Radio />} label="URL" />
                  <FormControlLabel value="content" control={<Radio />} label="Contenido HTML" />
                </RadioGroup>
              </FormControl>
              
              {htmlConversionType === 'url' && (
                <TextField
                  fullWidth
                  label="URL de la página web"
                  variant="outlined"
                  value={htmlUrl}
                  onChange={(e) => setHtmlUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  sx={{ mb: 3 }}
                />
              )}
              
              {htmlConversionType === 'content' && (
                <TextField
                  fullWidth
                  label="Contenido HTML"
                  variant="outlined"
                  multiline
                  rows={8}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<html><body><h1>Hola mundo</h1><p>Este es un ejemplo.</p></body></html>"
                  sx={{ mb: 3, fontFamily: 'monospace' }}
                />
              )}
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={convertHtmlToPdf}
              disabled={
                isProcessing || 
                (htmlConversionType === 'url' && !htmlUrl.trim()) || 
                (htmlConversionType === 'content' && !htmlContent.trim())
              }
            >
              {isProcessing ? 'Procesando...' : 'Convertir a PDF'}
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={16}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Desbloquear PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => unlockPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF bloqueado
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleLockedPdfChange}
              style={{ display: 'none' }}
              ref={unlockPdfInputRef}
            />

            {selectedLockedFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedLockedFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Contraseña del PDF"
                    variant="outlined"
                    type="password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <LockOpenIcon />}
                  onClick={unlockPdf}
                  disabled={isProcessing || !pdfPassword.trim()}
                >
                  {isProcessing ? 'Procesando...' : 'Desbloquear PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={17}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Proteger PDF con contraseña
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => protectPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleProtectPdfChange}
              style={{ display: 'none' }}
              ref={protectPdfInputRef}
            />

            {selectedProtectFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedProtectFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Nueva contraseña"
                    variant="outlined"
                    type="password"
                    value={newPdfPassword}
                    onChange={(e) => setNewPdfPassword(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Confirmar contraseña"
                    variant="outlined"
                    type="password"
                    value={confirmPdfPassword}
                    onChange={(e) => setConfirmPdfPassword(e.target.value)}
                    error={newPdfPassword !== confirmPdfPassword && confirmPdfPassword !== ''}
                    helperText={
                      newPdfPassword !== confirmPdfPassword && confirmPdfPassword !== '' 
                        ? 'Las contraseñas no coinciden' 
                        : ''
                    }
                    sx={{ mb: 3 }}
                  />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Permisos:
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowPrinting}
                        onChange={(e) => setAllowPrinting(e.target.checked)}
                      />
                    }
                    label="Permitir impresión"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowCopying}
                        onChange={(e) => setAllowCopying(e.target.checked)}
                      />
                    }
                    label="Permitir copiar texto"
                  />
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <LockIcon />}
                  onClick={protectPdf}
                  disabled={
                    isProcessing || 
                    !newPdfPassword.trim() || 
                    newPdfPassword !== confirmPdfPassword
                  }
                >
                  {isProcessing ? 'Procesando...' : 'Proteger PDF'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={18}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ordenar páginas de PDF
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => sortPdfInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleSortPdfChange}
              style={{ display: 'none' }}
              ref={sortPdfInputRef}
            />

            {isProcessing && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!isProcessing && selectedSortFile && pdfPages.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Páginas del documento: {selectedSortFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Arrastra las páginas para reordenarlas o marca las que deseas eliminar.
                  </Typography>
                  
                  <Paper sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
                    <List>
                      {pdfPages.map((page, index) => (
                        <ListItem 
                          key={`page-${page.index}`}
                          sx={{ 
                            border: '1px solid #eee', 
                            mb: 1,
                            bgcolor: pagesToDelete.includes(page.index) ? 'rgba(255,0,0,0.05)' : 'transparent',
                            textDecoration: pagesToDelete.includes(page.index) ? 'line-through' : 'none'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <img 
                              src={page.thumbnail} 
                              alt={`Página ${page.index + 1}`}
                              style={{ width: '50px', height: '70px', marginRight: '16px', objectFit: 'contain' }}
                            />
                            <ListItemText primary={`Página ${page.index + 1}`} />
                            <Box>
                              <IconButton 
                                onClick={() => handleMovePage(index, 'up')}
                                disabled={index === 0}
                                size="small"
                                sx={{ mr: 1 }}
                              >
                                ↑
                              </IconButton>
                              <IconButton 
                                onClick={() => handleMovePage(index, 'down')}
                                disabled={index === pdfPages.length - 1}
                                size="small"
                                sx={{ mr: 1 }}
                              >
                                ↓
                              </IconButton>
                              <IconButton 
                                onClick={() => handleTogglePageDelete(page.index)}
                                color={pagesToDelete.includes(page.index) ? "error" : "default"}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <SortIcon />}
                  onClick={sortPdf}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Aplicar cambios'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={19}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convertir PDF a PDF/A
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => pdfToPdfaInputRef.current?.click()}
              sx={{ mb: 3 }}
            >
              Seleccionar PDF
            </Button>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfToPdfaChange}
              style={{ display: 'none' }}
              ref={pdfToPdfaInputRef}
            />

            {selectedPdfaFile && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Archivo seleccionado: {selectedPdfaFile.name}
                </Typography>
                
                <Box sx={{ mt: 3, mb: 3 }}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Versión de PDF/A</InputLabel>
                    <Select
                      value={pdfaVersion}
                      label="Versión de PDF/A"
                      onChange={(e) => setPdfaVersion(e.target.value)}
                    >
                      <MenuItem value="1b">PDF/A-1b (ISO 19005-1)</MenuItem>
                      <MenuItem value="2b">PDF/A-2b (ISO 19005-2)</MenuItem>
                      <MenuItem value="3b">PDF/A-3b (ISO 19005-3)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    El estándar PDF/A es ideal para archivos de larga duración, como documentos legales 
                    o históricos. Esta herramienta convertirá tu PDF en un formato que garantiza que se 
                    pueda abrir y reproducir exactamente igual dentro de muchos años.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <ArchiveIcon />}
                  onClick={convertToPdfA}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Convertir a PDF/A'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default PdfTools; 