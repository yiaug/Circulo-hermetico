import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, Outline, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, Moon, Sun, X, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Book, ReadingProgress } from '../types';
import { GlassButton } from '../App';
import { cn } from '../lib/utils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFReader({ 
  book, 
  user, 
  onClose 
}: { 
  book: Book; 
  user: UserProfile; 
  onClose: () => void; 
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isDarkMode, setIsDarkMode] = useState(user.preferences?.darkMode || false);
  const [showOutline, setShowOutline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState(book.pdfUrl);
  const [useProxy, setUseProxy] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progressRef = doc(db, 'users', user.uid, 'readingProgress', book.id);
        const progressSnap = await getDoc(progressRef);
        if (progressSnap.exists()) {
          const data = progressSnap.data() as ReadingProgress;
          if (data.currentPage) {
            setPageNumber(data.currentPage);
          }
        }
      } catch (error) {
        console.error("Error loading reading progress:", error);
      }
    };
    loadProgress();
  }, [book.id, user.uid]);

  // Save progress function
  const saveProgress = async (page: number, total: number | null) => {
    try {
      const progressRef = doc(db, 'users', user.uid, 'readingProgress', book.id);
      await setDoc(progressRef, {
        bookId: book.id,
        currentPage: page,
        totalPages: total || 0,
        lastReadAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving reading progress:", error);
    }
  };

  // Debounced save on page change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (numPages) {
        saveProgress(pageNumber, numPages);
      }
    }, 2000); // Save 2 seconds after user stops changing pages

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pageNumber, numPages]);

  // Save on unmount (when closing)
  useEffect(() => {
    return () => {
      if (numPages) {
        saveProgress(pageNumber, numPages);
      }
    };
  }, [pageNumber, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages || 1);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  if (!book.pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-xl mb-4">Este livro ainda não possui um PDF disponível para leitura interna.</p>
        <GlassButton onClick={onClose}>Voltar</GlassButton>
      </div>
    );
  }

  const isGoogleDrive = book.pdfUrl.includes('drive.google.com');

  if (isGoogleDrive) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0a0a0c] flex flex-col">
        <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{book.title}</h2>
          </div>
        </header>
        <div className="flex-1 w-full overflow-hidden bg-white">
          <iframe 
            src={book.pdfUrl.replace('/view', '/preview')} 
            className="w-full h-full border-0"
            title={`Lendo ${book.title}`}
            allow="autoplay"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0c] flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{book.title}</h2>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setShowOutline(!showOutline)} 
            className={cn("p-2 rounded-full transition-colors", showOutline ? "bg-red-500/20 text-red-400" : "hover:bg-white/10")}
            title="Índice"
          >
            <List className="w-5 h-5" />
          </button>
          
          <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white/10 rounded-md">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white/10 rounded-md">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Alternar Modo Noturno"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex bg-black/20">
        {/* Sidebar (Outline) */}
        <AnimatePresence>
          {showOutline && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full border-r border-white/10 bg-black/40 backdrop-blur-md overflow-y-auto custom-scrollbar shrink-0"
            >
              <div className="p-4 w-[250px]">
                <h3 className="font-bold mb-4 text-white/70">Índice</h3>
                <Document 
                  file={pdfUrl}
                  onLoadError={(error) => console.error("Error loading PDF outline:", error)}
                >
                  <Outline 
                    onItemClick={({ pageNumber }) => {
                      setPageNumber(pageNumber);
                      if (window.innerWidth < 768) setShowOutline(false);
                    }} 
                    className="text-sm text-white/80 hover:text-white pdf-outline"
                  />
                </Document>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto custom-scrollbar flex justify-center p-4 md:p-8 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          <div className={cn(
            "transition-all duration-300 shadow-2xl",
            isDarkMode ? "invert hue-rotate-180" : ""
          )}>
            {loadError ? (
              <div className="p-8 text-center max-w-md mx-auto bg-black/50 rounded-xl border border-red-500/30">
                <p className="text-red-400 mb-4 font-bold">Erro ao carregar o PDF</p>
                <p className="text-white/70 text-sm mb-4">{loadError}</p>
                <p className="text-white/50 text-xs">
                  Isso geralmente ocorre devido a restrições de CORS no servidor de hospedagem do PDF (ex: Firebase Storage). 
                  Para corrigir permanentemente, é necessário configurar as regras de CORS no seu bucket.
                </p>
              </div>
            ) : (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error("Error loading PDF:", error);
                  if (!useProxy && book.pdfUrl?.startsWith('http')) {
                    console.log("Attempting to load via CORS proxy...");
                    setUseProxy(true);
                    setPdfUrl(`https://corsproxy.io/?${encodeURIComponent(book.pdfUrl)}`);
                  } else {
                    setLoading(false);
                    setLoadError(error.message || "Failed to fetch PDF");
                  }
                }}
                loading=""
                className="flex flex-col items-center"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </Document>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar (Pagination) */}
      <footer className="h-16 border-t border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center gap-4 shrink-0">
        <button 
          onClick={previousPage} 
          disabled={pageNumber <= 1}
          className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <span className="text-sm font-medium font-mono">
          {pageNumber} / {numPages || '-'}
        </span>
        
        <button 
          onClick={nextPage} 
          disabled={pageNumber >= (numPages || 1)}
          className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}
