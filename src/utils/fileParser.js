import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Configure PDF.js worker source safely
function ensurePdfWorker() {
  if (pdfjsLib.GlobalWorkerOptions) {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      const resolvedWorker = typeof pdfWorker === 'string' && pdfWorker
        ? pdfWorker
        : (pdfWorker && typeof pdfWorker.default === 'string' ? pdfWorker.default : '');
      pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedWorker || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }
  }
}

export async function extractResumeText(file) {
  if (!file) throw new Error('Choose a file to continue.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be 10 MB or smaller.');

  const name = file.name || 'resume';
  const extension = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(extension)) {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      const result = await worker.recognize(file);
      const text = String(result.data.text || '').trim();
      if (!text) throw new Error('No readable text was found in this image. Try a clearer photo or scan.');
      return text;
    } finally {
      await worker.terminate();
    }
  }
  if (extension === 'txt') {
    return (await file.text()).trim();
  }
  if (extension === 'docx') {
    const mammothModule = await import('mammoth/mammoth.browser');
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return String(result.value || '').trim();
  }
  if (extension === 'pdf') {
    ensurePdfWorker();
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      pages.push(pageText);
    }
    const text = pages.join('\n').trim();
    if (!text) throw new Error('This PDF has no selectable text. Try a text-based PDF or paste the resume text.');
    return text;
  }
  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, JPG, PNG, or WEBP file.');
}

