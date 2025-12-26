
import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import { DataView } from './components/DataView';
import Login from './components/Login';
import { DataRow } from './types';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const handleDataLoaded = (parsedData: DataRow[], parsedHeaders: string[], name: string) => {
    setData(parsedData);
    setHeaders(parsedHeaders);
    setFileName(name);
  };

  const handleReset = () => {
    setData([]);
    setHeaders([]);
    setFileName('');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    handleReset();
  };

  if (!isLoggedIn) {
    return <Login onLogin={setIsLoggedIn} />;
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-800 font-sans flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm z-20 flex-shrink-0">
        <div className="w-full px-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-gray-700">أداة استخراج العينات للمراجع الداخلي</h1>
                <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    متصل كـ: مسؤول مراجعة
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {data.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1.5 px-4 rounded-lg flex items-center justify-center transition-colors shadow"
                  >
                    تحميل ملف جديد
                  </button>
                )}
                <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-600 text-sm font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center transition-colors"
                    title="تسجيل الخروج"
                >
                    خروج
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 p-2 overflow-hidden flex flex-col">
        {data.length === 0 ? (
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <DataView initialData={data} initialHeaders={headers} fileName={fileName} />
        )}
      </main>
      
      <footer className="text-center py-1 text-gray-400 text-xs bg-gray-100 flex-shrink-0">
        <p>تم إعداد البرنامج بواسطة MY</p>
      </footer>
    </div>
  );
};

export default App;
