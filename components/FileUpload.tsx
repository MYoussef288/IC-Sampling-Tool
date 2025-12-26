import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PaperclipIcon } from './icons';
import { DataRow } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: DataRow[], headers: string[], fileName: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFile = (file: File) => {
    if (!file) {
      setError('لم يتم اختيار ملف.');
      return;
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');

    if (!isCsv && !isExcel) {
      setError('الرجاء اختيار ملف بصيغة CSV أو Excel.');
      return;
    }

    setError('');
    setIsProcessing(true);
    
    if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            // Filter out rows that are completely empty
            const data = (results.data as DataRow[]).filter(row => 
              headers.some(header => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== '')
            );
            onDataLoaded(data, headers, file.name);
            setIsProcessing(false);
          },
          error: (err) => {
            setError(`حدث خطأ أثناء معالجة الملف: ${err.message}`);
            setIsProcessing(false);
          },
        });
    } else if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dataBuffer = e.target?.result;
                if (!dataBuffer) {
                    throw new Error("فشل في قراءة مخزن الملف المؤقت.");
                }
                const workbook = XLSX.read(dataBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    onDataLoaded([], [], file.name);
                    setIsProcessing(false);
                    return;
                }

                const headers = Object.keys(jsonData[0]);
                 const data = jsonData.filter(row => 
                    headers.some(header => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== '')
                );
                
                onDataLoaded(data, headers, file.name);
            } catch (err) {
                 if (err instanceof Error) {
                    setError(`حدث خطأ أثناء معالجة ملف Excel: ${err.message}`);
                } else {
                    setError('حدث خطأ غير متوقع أثناء معالجة ملف Excel.');
                }
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
             setError('لا يمكن قراءة الملف.');
             setIsProcessing(false);
        };
        reader.readAsArrayBuffer(file);
    }
  };


  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFile(event.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="w-full max-w-2xl border-4 border-dashed border-gray-300 rounded-2xl p-10 cursor-pointer hover:border-blue-400 transition-colors duration-300 bg-white shadow-lg"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          accept=".csv,.xls,.xlsx"
          onChange={onFileInputChange}
          disabled={isProcessing}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
            <PaperclipIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-600">
            {isProcessing ? 'جاري معالجة الملف...' : 'اسحب وأفلت ملف CSV أو Excel هنا، أو انقر للاختيار'}
          </h2>
          <p className="text-gray-500">
            ابدأ بتحميل بياناتك لإجراء التحليل واستخراج العينات.
          </p>
          {isProcessing && (
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </div>
      <div className="mt-8 text-gray-600 bg-blue-50 p-6 rounded-lg shadow-sm w-full max-w-2xl">
          <h3 className="text-xl font-bold text-blue-800 mb-2">تعليمات الاستخدام</h3>
          <p className="text-right">
              1. قم بتجهيز بياناتك في ملف بصيغة CSV أو Excel. تأكد من أن السطر الأول يحتوي على أسماء الأعمدة.
              <br/>
              2. انقر على المنطقة المخصصة أعلاه أو قم بسحب الملف إليها لبدء عملية التحميل.
              <br/>
              3. بعد تحميل البيانات، ستظهر لك واجهة تحليلية مع عدة تبويبات للمعاينة والتحليل واستخراج العينات.
          </p>
      </div>
    </div>
  );
};

export default FileUpload;