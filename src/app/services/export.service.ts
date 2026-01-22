import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class ExportService {
  async exportElementToJpg(element: HTMLElement, filename: string) {
    await (document as any).fonts?.ready;
    element.classList.add('export-jpg-boost');
    try {
      const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      this.download(dataUrl, filename.endsWith('.jpg') ? filename : `${filename}.jpg`);
    } finally {
      element.classList.remove('export-jpg-boost');
    }
  }

  async exportElementToPdfA4(element: HTMLElement, filename: string) {
    const pdf = await this.buildPdfA4(element);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }

  async printElementToPdfA4(element: HTMLElement, filename: string) {
    const pdf = await this.buildPdfA4(element);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) return;
    const cleanup = () => URL.revokeObjectURL(url);
    const tryPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        printWindow.removeEventListener('load', tryPrint);
      }
    };
    printWindow.addEventListener('load', tryPrint);
    printWindow.addEventListener('afterprint', cleanup, { once: true });
  }

  private async buildPdfA4(element: HTMLElement) {
    await (document as any).fonts?.ready;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
    return pdf;
  }

  private download(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    a.remove();
  }
}
