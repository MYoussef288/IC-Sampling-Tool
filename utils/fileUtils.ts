import { DataRow, SamplingConfig, CategoricalStratum, NumericStratum } from '../types';
import * as XLSX from 'xlsx';

export const exportToCSV = (data: DataRow[], headersToExport: string[], filename: string) => {
  if (data.length === 0) {
    return;
  }

  const headers = headersToExport;
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => 
      headers.map(fieldName => 
        JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)
      ).join(',')
    )
  ];

  const csvString = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const exportToExcel = (data: DataRow[], headersToExport: string[], filename: string) => {
  if (data.length === 0) {
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headersToExport });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Auto-fit columns for better readability
  const colWidths = headersToExport.map(header => ({
    wch: Math.max(
      header.length,
      ...data.map(row => String(row[header] ?? "").length)
    ) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`, { bookType: 'xlsx', type: 'binary' });
};

export const exportConfigToExcel = (config: SamplingConfig, filename: string) => {
  const wb = XLSX.utils.book_new();

  // --- Summary Sheet ---
  const summaryData: (string | number | boolean)[][] = [
    ['إعداد', 'قيمة'],
    ['نوع العينة', config.method],
  ];

  if (config.method === 'random') {
    summaryData.push(['حجم العينة', config.sampleSize]);
    summaryData.push(['هل هي نسبة مئوية؟', config.isPercentage ? 'نعم' : 'لا']);
  } else if (config.method === 'systematic') {
    summaryData.push(['الفاصل الزمني', config.systematicInterval]);
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  // Auto-fit columns for summary
  const summaryColWidths = summaryData[0].map((_, i) => ({
      wch: summaryData.reduce((w, r) => Math.max(w, String(r[i]).length), 10)
  }));
  summaryWs['!cols'] = summaryColWidths;

  XLSX.utils.book_append_sheet(wb, summaryWs, 'ملخص الإعدادات');

  // --- Stratification Sheet ---
  if (config.method === 'stratified' && config.stratificationLevels.length > 0) {
    const strataData: (string | number)[][] = [
      ['مستوى التقسيم', 'العمود', 'قيمة/شرط الطبقة', 'عدد السجلات', 'حجم العينة المطلوب']
    ];

    config.stratificationLevels.forEach((level, index) => {
      level.strata.forEach(stratum => {
        const row: (string|number)[] = [
          index + 1,
          level.column,
          level.columnType === 'numeric' ? (stratum as NumericStratum).label : String((stratum as CategoricalStratum).value),
          stratum.count,
          String(stratum.sampleSize) // Ensure it's a string to show '%' correctly
        ];
        strataData.push(row);
      });
    });
    
    if (strataData.length > 1) { // if there are any strata
        const strataWs = XLSX.utils.aoa_to_sheet(strataData);
        // Auto-fit columns
        const colWidths = strataData[0].map((_, i) => ({
            wch: strataData.reduce((w, r) => Math.max(w, String(r[i]).length), 15)
        }));
        strataWs['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, strataWs, 'تفاصيل التقسيم');
    }
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
};


export const exportToPDF = (data: DataRow[], headers: string[], filename: string) => {
  if (data.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('الرجاء السماح بالنوافذ المنبثقة لتصدير الملف بصيغة PDF.');
    return;
  }

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          ${headers.map(h => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: right;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${headers.map(h => `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; word-break: break-all;">${String(row[h])}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        body { 
          font-family: 'Cairo', sans-serif;
        }
        h1 {
          color: #333;
        }
        p {
          color: #666;
          font-size: 10pt;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 9pt; 
        }
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 1.5cm; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
             print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <p>تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}</p>
      ${tableHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
          window.onafterprint = function() {
             window.close();
          }
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
