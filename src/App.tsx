import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import OcrTool from './pages/OcrTool';
import PdfTools from './pages/PdfTools';
import ImageToWord from './pages/ImageToWord';
import PdfMerge from './pages/PdfMerge';
import PdfSplit from './pages/PdfSplit';
import PdfCompress from './pages/PdfCompress';
import ImagesToPdf from './pages/ImagesToPdf';

import WordToPdf from './pages/WordToPdf';
import PowerPointToPdf from './pages/PowerPointToPdf';
import ExcelToPdf from './pages/ExcelToPdf';
import PdfToJpg from './pages/PdfToJpg';
import JpgToPdf from './pages/JpgToPdf';
import PdfToPdfA from './pages/PdfToPdfA';
import SignPdf from './pages/SignPdf';
import WatermarkPdf from './pages/WatermarkPdf';
import RotatePdf from './pages/RotatePdf';
import SortPdf from './pages/SortPdf';
import UnlockPdf from './pages/UnlockPdf';
import ProtectPdf from './pages/ProtectPdf';
import PageNumbersPdf from './pages/PageNumbersPdf';
import SummarizeDocument from './pages/SummarizeDocument';
import QrGenerator from './pages/QrGenerator';

function App() {
  const location = useLocation();

  return (
    <MainLayout>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/ocr" element={<OcrTool />} />
          <Route path="/pdf-tools" element={<PdfTools />} />
          <Route path="/pdf/merge" element={<PdfMerge />} />
          <Route path="/pdf/split" element={<PdfSplit />} />
          <Route path="/pdf/compress" element={<PdfCompress />} />
          <Route path="/pdf/images-to-pdf" element={<ImagesToPdf />} />

          <Route path="/pdf/word-to-pdf" element={<WordToPdf />} />
          <Route path="/pdf/powerpoint-to-pdf" element={<PowerPointToPdf />} />
          <Route path="/pdf/excel-to-pdf" element={<ExcelToPdf />} />
          <Route path="/pdf/pdf-to-jpg" element={<PdfToJpg />} />
          <Route path="/pdf/jpg-to-pdf" element={<JpgToPdf />} />
          <Route path="/pdf/pdf-to-pdfa" element={<PdfToPdfA />} />
          <Route path="/pdf/sign" element={<SignPdf />} />
          <Route path="/pdf/watermark" element={<WatermarkPdf />} />
          <Route path="/pdf/rotate" element={<RotatePdf />} />
          <Route path="/pdf/sort" element={<SortPdf />} />
          <Route path="/pdf/unlock" element={<UnlockPdf />} />
          <Route path="/pdf/protect" element={<ProtectPdf />} />
          <Route path="/pdf/page-numbers" element={<PageNumbersPdf />} />
          <Route path="/image-to-word" element={<ImageToWord />} />
          <Route path="/summarize-document" element={<SummarizeDocument />} />
          <Route path="/qr-generator" element={<QrGenerator />} />
        </Routes>
      </AnimatePresence>
    </MainLayout>
  );
}

export default App;
