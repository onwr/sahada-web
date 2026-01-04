import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToCSV = (data, headers, filename) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

export const exportToExcel = (data, headers, filename) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (data, headers, title, filename, metadata = {}) => {
  try {
    const doc = new jsPDF();
    const themeColor = [22, 163, 74]; // Green-600

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header Function
    const drawHeader = () => {
      doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
      doc.rect(0, 0, pageWidth, 20, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('SAHADA', 14, 13);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Spor Tesis Yönetimi', 37, 13);
    };

    // Initial Header
    drawHeader();

    // Metadata Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const startY = 45;
    const col1 = 14;
    const col2 = pageWidth / 2;

    doc.text(`Tarih:`, col1, startY);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date().toLocaleDateString('tr-TR'), col1 + 15, startY);
    
    if (metadata.period) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Dönem:`, col1, startY + 6);
      doc.setFont('helvetica', 'bold');
      doc.text(metadata.period, col1 + 15, startY + 6);
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`Rapor ID:`, col2, startY);
    doc.setFont('helvetica', 'bold');
    doc.text(metadata.id || '-', col2 + 20, startY);

    // Table
    doc.autoTable({
      startY: startY + 15,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: themeColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [50, 50, 50],
        lineColor: [230, 230, 230],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: 25 },
      didDrawPage: (hookData) => {
        // Redraw green header bar on subsequent pages if needed
        if (hookData.pageNumber > 1) {
           doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
           doc.rect(0, 0, pageWidth, 5, 'F');
        }
      }
    });

    // Footers (Added after table is done to know total pages)
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      const footerY = pageHeight - 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      
      const leftText = 'Bu belge Sahada Yönetim Paneli tarafından oluşturulmuştur.';
      doc.text(leftText, 14, footerY);
      
      const rightText = `Sayfa ${i} / ${pageCount}`;
      const textWidth = doc.getStringUnitWidth(rightText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      doc.text(rightText, pageWidth - 14 - textWidth, footerY);
    }
    
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('PDF oluşturulurken bir hata oluştu. Detaylar konsolda.');
  }
};

