
import React, { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, LabelList } from 'recharts';
import { DataRow, ColumnStat, SamplingMethod, PreviewType, StratificationLevel, CategoricalStratum, NumericStratum, SamplingConfig, Filter, NumericFilterCondition, NumericConditionOperator } from '../types';
import { analyzeDataWithGemini } from '../services/geminiService';
import { getColumnInfo, generateCorrelationMatrix } from '../services/analysisService';
import { exportToCSV, exportToExcel, exportToPDF, exportConfigToExcel } from '../utils/fileUtils';
import { TrashIcon, DownloadIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, FilterIcon, ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon, DatabaseIcon, ColumnsIcon, HashIcon, AlertTriangleIcon, PencilIcon, SearchIcon, BroomIcon, CopyIcon, UndoIcon, BotIcon, ShuffleIcon, PlayIcon, TableCellsIcon, ChartBarSquareIcon, BeakerIcon, ChevronLeftIcon, ChevronRightIcon, PresentationChartLineIcon, BarChartIcon, TicketIcon, ArrowsPointingOutIcon, GripVerticalIcon, PlusIcon, PrinterIcon, DocumentTextIcon, ChartBarHorizontalIcon, PieChartIcon, DonutChartIcon, LineChartIcon, ArrowCircleLeftIcon, ArrowCircleRightIcon } from './icons';
import AIChatAssistant from './AIChatAssistant';

interface DataViewProps {
  initialData: DataRow[];
  initialHeaders: string[];
  fileName: string;
}

type Tab = 'preview' | 'stats' | 'ai' | 'sampling' | 'viz';

interface ChartConfig {
    id: string;
    type: 'bar' | 'bar-horizontal' | 'line' | 'pie' | 'donut' | 'ticket';
    title: string;
    xCol: string;
    yCol: string;
    agg: 'count' | 'sum' | 'avg' | 'distinct';
    width: number;
    height: number;
}


// Filter Menu Component
interface FilterMenuProps {
  column: string;
  allData: DataRow[];
  currentFilter: Filter | undefined;
  onApply: (newFilter: Filter | undefined) => void;
  onClose: () => void;
  isNumeric: boolean;
}

const FilterMenu = forwardRef<HTMLDivElement, FilterMenuProps>(({ column, allData, currentFilter, onApply, onClose, isNumeric }, ref) => {
    // State for Categorical Filter
    const [tempSelection, setTempSelection] = useState<Set<any>>(
        currentFilter?.type === 'categorical' ? new Set(currentFilter.values) : new Set()
    );

    // State for Numeric Filter
    const [numericCondition, setNumericCondition] = useState<NumericFilterCondition>(
        currentFilter?.type === 'numeric' ? currentFilter.condition : 'equals'
    );
    const [value1, setValue1] = useState<string>(
        (currentFilter?.type === 'numeric' && currentFilter.value1 !== null) ? String(currentFilter.value1) : ''
    );
    const [value2, setValue2] = useState<string>(
        (currentFilter?.type === 'numeric' && currentFilter.value2 !== null) ? String(currentFilter.value2) : ''
    );
    
    const uniqueValuesWithCounts = useMemo(() => {
        if (isNumeric) return [];
        
        const counts = new Map<any, number>();
        for (const row of allData) {
            const value = row[column];
            counts.set(value, (counts.get(value) || 0) + 1);
        }

        return Array.from(counts.entries())
            .sort(([valA], [valB]) => {
                const strA = valA === null || valA === undefined ? '' : String(valA);
                const strB = valB === null || valB === undefined ? '' : String(valB);
                return strA.localeCompare(strB, undefined, { numeric: true });
            })
            .map(([value, count]) => ({
                value,
                count,
            }));
    }, [allData, column, isNumeric]);

    useEffect(() => {
        if (currentFilter) {
            if (currentFilter.type === 'categorical') {
                setTempSelection(new Set(currentFilter.values));
            } else if (currentFilter.type === 'numeric') {
                setNumericCondition(currentFilter.condition);
                setValue1(currentFilter.value1 !== null ? String(currentFilter.value1) : '');
                setValue2(currentFilter.value2 !== null ? String(currentFilter.value2) : '');
            }
        } else {
             // Reset state when there's no filter
             setTempSelection(new Set(uniqueValuesWithCounts.map(item => item.value)));
             setNumericCondition('equals');
             setValue1('');
             setValue2('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFilter]);


    // Handlers for Categorical Filter
    const handleToggle = (value: any) => {
        setTempSelection(prev => {
            const newSet = new Set(prev);
            if (newSet.has(value)) {
                newSet.delete(value);
            } else {
                newSet.add(value);
            }
            return newSet;
        });
    };
    const handleSelectAll = () => setTempSelection(new Set(uniqueValuesWithCounts.map(item => item.value)));
    const handleDeselectAll = () => setTempSelection(new Set());

    const handleApplyCategorical = () => {
        onApply({ type: 'categorical', values: tempSelection });
    };
    
    // Handlers for Numeric Filter
    const handleApplyNumeric = () => {
        const num1 = value1.trim() !== '' ? parseFloat(value1) : null;
        const num2 = value2.trim() !== '' ? parseFloat(value2) : null;

        if (num1 === null || isNaN(num1)) {
            // If primary value is invalid, treat as no filter
            onApply(undefined);
            return;
        }

        if (numericCondition === 'between' && (num2 === null || isNaN(num2))) {
            alert('الرجاء إدخال قيمة صالحة في الحقل الثاني لشرط "بين".');
            return;
        }
        
         if (numericCondition === 'between' && num1 > num2!) {
            alert("القيمة 'من' يجب أن تكون أصغر من أو تساوي القيمة 'إلى'.");
            return;
        }

        onApply({
            type: 'numeric',
            condition: numericCondition,
            value1: num1,
            value2: numericCondition === 'between' ? num2 : null
        });
    };

    const handleClearFilter = () => {
        onApply(undefined);
    };

    return (
        <div ref={ref} onClick={e => e.stopPropagation()} className="absolute top-full mt-2 right-0 z-50 w-72 bg-white rounded-lg shadow-xl border p-4 space-y-4 text-right">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm text-gray-800">فلترة حسب: {column}</h4>
                <button onClick={handleClearFilter} className="text-red-600 hover:underline text-xs font-medium">إزالة الفلتر</button>
            </div>
            {isNumeric ? (
                // Numeric Filter UI
                <div className="space-y-3">
                     <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">الشرط</label>
                        <select value={numericCondition} onChange={e => setNumericCondition(e.target.value as NumericFilterCondition)} className="w-full p-1.5 border rounded-md text-sm shadow-sm">
                            <option value="equals">يساوي</option>
                            <option value="notEquals">لا يساوي</option>
                            <option value="greaterThan">أكبر من</option>
                            <option value="lessThan">أصغر من</option>
                            <option value="between">بين</option>
                        </select>
                    </div>
                     <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                                {numericCondition === 'between' ? 'من' : 'القيمة'}
                            </label>
                            <input type="number" value={value1} onChange={e => setValue1(e.target.value)} className="w-full p-1.5 border rounded-md text-sm shadow-sm" />
                        </div>
                        {numericCondition === 'between' && (
                            <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600 block mb-1">إلى</label>
                                <input type="number" value={value2} onChange={e => setValue2(e.target.value)} className="w-full p-1.5 border rounded-md text-sm shadow-sm" />
                            </div>
                        )}
                    </div>
                     <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t mt-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">إلغاء</button>
                        <button onClick={handleApplyNumeric} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">تطبيق</button>
                    </div>
                </div>
            ) : (
                // Categorical Filter UI
                <>
                    <div className="flex justify-between text-sm">
                        <button onClick={handleSelectAll} className="text-blue-600 hover:underline font-medium">تحديد الكل</button>
                        <button onClick={handleDeselectAll} className="text-blue-600 hover:underline font-medium">إلغاء تحديد الكل</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 text-sm pr-2 border-t border-b py-2">
                        {uniqueValuesWithCounts.map((item, i) => {
                             const displayValue = item.value === null || item.value === undefined || String(item.value).trim() === '' ? '[فارغ]' : String(item.value);
                             return (
                                <label key={i} className="flex items-center justify-between space-x-2 space-x-reverse cursor-pointer">
                                    <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                                            checked={tempSelection.has(item.value)}
                                            onChange={() => handleToggle(item.value)}
                                        />
                                        <span className="text-gray-700 truncate" title={displayValue}>{displayValue}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.count}</span>
                                </label>
                             );
                        })}
                    </div>
                    <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">إلغاء</button>
                        <button onClick={handleApplyCategorical} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">تطبيق</button>
                    </div>
                </>
            )}
        </div>
    );
});


// KPI Card Component
interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon }) => (
    <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center space-x-3 space-x-reverse">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const NumericStratumRuleCreator: React.FC<{onAdd: (operator: NumericConditionOperator, value: number) => void}> = ({ onAdd }) => {
    const [operator, setOperator] = useState<NumericConditionOperator>('eq');
    const [value, setValue] = useState('');

    const handleAdd = () => {
        const numValue = parseFloat(value);
        if (value.trim() === '' || isNaN(numValue)) {
            alert("الرجاء إدخال رقم صالح.");
            return;
        }
        onAdd(operator, numValue);
        setValue('');
    };
    
    return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3 mb-4">
            <h5 className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <FilterIcon className="w-4 h-4"/>
                تعريف شرط جديد
            </h5>
            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                    <select 
                        value={operator} 
                        onChange={e => setOperator(e.target.value as NumericConditionOperator)} 
                        className="w-1/3 p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="eq">يساوي (=)</option>
                        <option value="neq">لا يساوي (≠)</option>
                        <option value="gt">أكبر من (&gt;)</option>
                        <option value="gte">أكبر من أو يساوي (≥)</option>
                        <option value="lt">أصغر من (&lt;)</option>
                        <option value="lte">أصغر من أو يساوي (≤)</option>
                    </select>
                    <input 
                        type="number" 
                        placeholder="القيمة..." 
                        value={value} 
                        onChange={e => setValue(e.target.value)} 
                        className="w-2/3 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" 
                    />
                </div>
                <button 
                    onClick={handleAdd} 
                    className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-sm flex justify-center items-center gap-2"
                >
                    <CheckCircleIcon className="w-4 h-4"/>
                    تنفيذ الشرط
                </button>
            </div>
        </div>
    );
};

// Search Modal Component
interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
    onClear: () => void;
    initialValue: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSearch, onClear, initialValue }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue]);

    const handleSearchClick = () => {
        onSearch(value);
        onClose();
    };

    const handleClearClick = () => {
        setValue('');
        onClear();
        onClose();
    };
    
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearchClick();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse mb-4">
                     <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <SearchIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            بحث في البيانات
                        </h3>
                         <p className="text-sm text-gray-500 mt-1">
                            أدخل الكلمة المفتاحية للبحث في جميع الأعمدة.
                        </p>
                    </div>
                </div>

                <div className="mt-2 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="أدخل كلمة البحث..."
                    />
                    <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>

                <div className="mt-6 flex flex-row-reverse gap-2">
                     <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                        onClick={handleSearchClick}
                    >
                        بحث
                    </button>
                    <button
                        type="button"
                         onClick={handleClearClick}
                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                    >
                        مسح البحث
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-transparent text-base font-medium text-gray-500 hover:text-gray-700 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Save Configuration Modal Component
interface SaveConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    existingNames: string[];
}

const SaveConfigModal: React.FC<SaveConfigModalProps> = ({ isOpen, onClose, onSave, existingNames }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setError('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const trimmedName = name.trim();
    const isDuplicate = existingNames.includes(trimmedName);

    const handleSaveClick = () => {
        if (trimmedName === '') {
            setError('الرجاء إدخال اسم للإعداد.');
            return;
        }
        onSave(trimmedName);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">حفظ إعدادات العينة</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="configName" className="block text-sm font-medium text-gray-700 mb-1">اسم الإعداد</label>
                        <input
                            ref={inputRef}
                            id="configName"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder={`إعداد ${existingNames.length + 1}`}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        {isDuplicate && !error && (
                            <p className="text-orange-500 text-xs mt-1 flex items-center">
                                <AlertTriangleIcon className="w-4 h-4 ml-1 flex-shrink-0"/>
                                يوجد إعداد بهذا الاسم. الحفظ سيؤدي إلى الكتابة فوقه.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            إلغاء
                        </button>
                        <button onClick={handleSaveClick} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            {isDuplicate ? 'الكتابة فوقه وحفظ' : 'حفظ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Rename Configuration Modal Component
interface RenameConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRename: (newName: string) => void;
    currentName: string;
    existingNames: string[];
}

const RenameConfigModal: React.FC<RenameConfigModalProps> = ({ isOpen, onClose, onRename, currentName, existingNames }) => {
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError('');
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, currentName]);

    const trimmedNewName = newName.trim();
    const isDuplicate = existingNames.includes(trimmedNewName) && trimmedNewName !== currentName;

    const handleRenameClick = () => {
        if (trimmedNewName === '') {
            setError('الرجاء إدخال اسم للإعداد.');
            return;
        }
        if (isDuplicate) {
            setError('هذا الاسم مستخدم بالفعل.');
            return;
        }
        onRename(trimmedNewName);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleRenameClick();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-2">إعادة تسمية الإعداد</h3>
                <p className="text-sm text-gray-500 mb-4">الاسم الحالي: <span className="font-semibold">{currentName}</span></p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="configNewName" className="block text-sm font-medium text-gray-700 mb-1">الاسم الجديد</label>
                        <input
                            ref={inputRef}
                            id="configNewName"
                            type="text"
                            value={newName}
                            onChange={(e) => {
                                setNewName(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyPress={handleKeyPress}
                            className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${error || isDuplicate ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="أدخل الاسم الجديد"
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        {isDuplicate && !error && <p className="text-red-500 text-xs mt-1">هذا الاسم مستخدم بالفعل.</p>}
                    </div>
                    <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            إلغاء
                        </button>
                        <button onClick={handleRenameClick} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            إعادة تسمية
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Confirm Delete Modal Component
interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    configName: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, configName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-right">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            حذف الإعداد
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                هل أنت متأكد من رغبتك في حذف الإعداد "{configName}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        حذف
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Clean Data Selection Modal Component
interface CleanDataSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selection: { rows: boolean; cols: boolean }) => void;
    stats: { rows: number; cols: number };
}

const CleanDataSelectionModal: React.FC<CleanDataSelectionModalProps> = ({ isOpen, onClose, onConfirm, stats }) => {
    const [selection, setSelection] = useState({ rows: false, cols: false });

    useEffect(() => {
        if (isOpen) {
            // Reset selection when modal opens
            setSelection({ rows: false, cols: false });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const canDeleteRows = stats.rows > 0;
    const canDeleteCols = stats.cols > 0;
    const nothingSelected = !selection.rows && !selection.cols;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <BroomIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            تنظيف البيانات
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 mb-4">
                                تم العثور على بيانات فارغة. الرجاء تحديد الإجراءات التي ترغب في تنفيذها.
                            </p>
                            <div className="space-y-3 text-right">
                                <label className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border-2 ${selection.rows ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${canDeleteRows ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selection.rows}
                                        disabled={!canDeleteRows}
                                        onChange={() => setSelection(s => ({ ...s, rows: !s.rows }))}
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="flex-grow">حذف <span className="font-bold">{stats.rows}</span> صفوف فارغة بالكامل</span>
                                </label>
                                <label className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border-2 ${selection.cols ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${canDeleteCols ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selection.cols}
                                        disabled={!canDeleteCols}
                                        onChange={() => setSelection(s => ({ ...s, cols: !s.cols }))}
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="flex-grow">حذف <span className="font-bold">{stats.cols}</span> أعمدة فارغة بالكامل</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        disabled={nothingSelected}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        onClick={() => onConfirm(selection)}
                    >
                        تأكيد التنظيف
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Confirm Duplicates Modal Component
interface ConfirmDuplicatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: () => void;
    onExport: () => void;
    info: {
        groups: { row: DataRow; count: number }[];
        totalDuplicatesToRemove: number;
    } | null;
    headers: string[];
}

const ConfirmDuplicatesModal: React.FC<ConfirmDuplicatesModalProps> = ({ isOpen, onClose, onConfirmDelete, onExport, info, headers }) => {
    if (!isOpen || !info) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-6xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                        <CopyIcon className="h-6 w-6 text-orange-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            تم العثور على صفوف مكررة
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                تم العثور على <span className="font-bold">{info.groups.length}</span> مجموعات من الصفوف المكررة.
                                سيتم حذف <span className="font-bold">{info.totalDuplicatesToRemove}</span> صفًا والإبقاء على نسخة واحدة من كل صف في حال اخترت الحذف.
                            </p>
                            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-2 font-semibold">التكرار</th>
                                            {headers.slice(0, 3).map(h => <th key={h} className="p-2 font-semibold truncate" title={h}>{h}</th>)}
                                            {headers.length > 3 && <th className="p-2 font-semibold">...</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {info.groups.map((group, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="p-2 text-center font-medium">{group.count}</td>
                                                {headers.slice(0, 3).map(h => <td key={h} className="p-2 truncate" title={String(group.row[h])}>{String(group.row[h])}</td>)}
                                                {headers.length > 3 && <td className="p-2">...</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">يمكنك حذف هذه التكرارات، أو تصديرها للمراجعة، أو إلغاء الإجراء.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                        onClick={onConfirmDelete}
                    >
                        حذف التكرارات
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onExport}
                    >
                        تصدير للمراجعة
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export Data Modal Component
interface ExportDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

const ExportDataModal: React.FC<ExportDataModalProps> = ({ isOpen, onClose, onConfirmExport }) => {
    const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');

    if (!isOpen) return null;

    const handleExportClick = () => {
        onConfirmExport(format);
    };

    const formatOptions: { id: 'csv' | 'excel' | 'pdf', label: string }[] = [
        { id: 'csv', label: 'CSV' },
        { id: 'excel', label: 'Excel' },
        { id: 'pdf', label: 'PDF' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد تصدير البيانات</h3>
                <p className="text-sm text-gray-600 mb-6">الرجاء اختيار صيغة الملف التي ترغب في حفظ البيانات بها.</p>

                <div className="space-y-2">
                    {formatOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setFormat(option.id)}
                            className={`w-full text-right p-3 rounded-lg border-2 transition-all duration-200 ${
                                format === option.id
                                    ? 'bg-blue-50 border-blue-500 text-blue-800 font-semibold shadow-inner'
                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="flex justify-end space-x-2 space-x-reverse pt-6 mt-4 border-t">
                    <button
                        type="button"
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={handleExportClick}
                    >
                        تصدير
                    </button>
                </div>
            </div>
        </div>
    );
};

// Info Modal Component
interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    icon?: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message, icon }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse">
                    {icon && (
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                            {icon}
                        </div>
                    )}
                    <div className="mt-3 text-center sm:mt-0 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        حسنًا
                    </button>
                </div>
            </div>
        </div>
    );
};

// Confirm Row Delete Modal Component
interface ConfirmRowDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    rowData: DataRow | null;
    headers: string[];
}

const ConfirmRowDeleteModal: React.FC<ConfirmRowDeleteModalProps> = ({ isOpen, onClose, onConfirm, rowData, headers }) => {
    if (!isOpen || !rowData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                            حذف الصف
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 mb-4">
                                هل أنت متأكد من رغبتك في حذف هذا الصف؟ لا يمكن التراجع عن هذا الإجراء.
                            </p>
                            <div className="text-right text-xs bg-gray-50 p-3 rounded-md border max-h-40 overflow-y-auto">
                                {headers.slice(0, 5).map(header => (
                                    <div key={header} className="truncate">
                                        <span className="font-semibold">{header}:</span>
                                        <span className="text-gray-600 mr-2"> {String(rowData[header])}</span>
                                    </div>
                                ))}
                                {headers.length > 5 && <div className="text-gray-400">...</div>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        تأكيد الحذف
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Dashboard Export Preview Modal
interface DashboardExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrint: (orientation: 'portrait' | 'landscape') => void;
}

const DashboardExportPreviewModal: React.FC<DashboardExportPreviewModalProps> = ({ isOpen, onClose, onPrint }) => {
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">تصدير لوحة المعلومات (PDF)</h3>
                <p className="text-sm text-gray-600 mb-4">
                    سيتم فتح نافذة الطباعة الخاصة بالمتصفح. يمكنك حفظ الصفحة كملف PDF من هناك.
                    يرجى اختيار اتجاه الصفحة المفضل:
                </p>
                
                <div className="flex gap-4 mb-6">
                    <label className={`flex-1 border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 transition-all ${orientation === 'landscape' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name="orientation" value="landscape" checked={orientation === 'landscape'} onChange={() => setOrientation('landscape')} className="hidden" />
                        <div className="w-12 h-8 border-2 border-current border-dashed rounded bg-white"></div>
                        <span className="text-sm font-semibold">عرضي (Landscape)</span>
                    </label>
                    <label className={`flex-1 border-2 rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 transition-all ${orientation === 'portrait' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name="orientation" value="portrait" checked={orientation === 'portrait'} onChange={() => setOrientation('portrait')} className="hidden" />
                         <div className="w-8 h-12 border-2 border-current border-dashed rounded bg-white"></div>
                        <span className="text-sm font-semibold">طولي (Portrait)</span>
                    </label>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium">إلغاء</button>
                    <button 
                        onClick={() => { onPrint(orientation); onClose(); }} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center"
                    >
                        <DocumentTextIcon className="w-4 h-4 ml-2"/>
                        معاينة وطباعة
                    </button>
                </div>
             </div>
        </div>
    );
};

const DataView: React.FC<DataViewProps> = ({ initialData, initialHeaders, fileName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(true);

  // Undo/Redo state
  const [history, setHistory] = useState<{ data: DataRow[]; headers: string[] }[]>([{ data: initialData, headers: initialHeaders }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY_SIZE = 6; // 1 current state + 5 undo steps
  const { data, headers } = history[historyIndex];

  // Filter state
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, Filter | undefined>>({});
  const filterMenuRef = useRef<HTMLDivElement>(null);
  
  // Search State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // This holds the active search query

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  // Column Drag & Drop state
  const dragItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Column Resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  // Add reference to identify which table is being resized
  const resizingTargetRef = useRef<'main' | 'sample' | null>(null);

  // Preview State
  const [previewSize, setPreviewSize] = useState(10);
  const [previewType, setPreviewType] = useState<PreviewType>('first');
  const [appliedPreviewSize, setAppliedPreviewSize] = useState(10);
  const [appliedPreviewType, setAppliedPreviewType] = useState<PreviewType>('first');
  const [previewData, setPreviewData] = useState<DataRow[]>([]);

  // Stats State
  const [stats, setStats] = useState<Record<string, ColumnStat>>({});
  const [selectedStatColumn, setSelectedStatColumn] = useState<string>('');
  const [correlationMatrix, setCorrelationMatrix] = useState<{ labels: string[], matrix: number[][] } | null>(null);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ text: string[], charts: any[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Visualization State
  const [dashboardCharts, setDashboardCharts] = useState<ChartConfig[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280); // Default width approx 7.4cm, slightly wider than requested for usability
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const resizingSidebarRef = useRef(false);
  const sidebarStartXRef = useRef(0);
  const sidebarStartWidthRef = useRef(0);
  const resizingChartRef = useRef<string | null>(null);
  const dragChartIndex = useRef<number | null>(null);
  const [chartDragOverIndex, setChartDragOverIndex] = useState<number | null>(null);

  // Sampling State (Sidebar for Tab)
  const [isSamplingSettingsOpen, setIsSamplingSettingsOpen] = useState(true);
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('random');
  const [sampleSize, setSampleSize] = useState(10);
  const [isPercentage, setIsPercentage] = useState(false);
  const [systematicInterval, setSystematicInterval] = useState(5);
  const [stratificationLevels, setStratificationLevels] = useState<StratificationLevel[]>([]);
  const [sampledData, setSampledData] = useState<DataRow[] | null>(null);
  const [savedSamplingConfigs, setSavedSamplingConfigs] = useState<Record<string, SamplingConfig>>({});
  const [selectedConfigName, setSelectedConfigName] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [configToRename, setConfigToRename] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string>('');
  const [sampledDataHeaders, setSampledDataHeaders] = useState<string[]>(initialHeaders);
  const [sampledDataSortConfig, setSampledDataSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  // Sampled Data Filter State
  const [sampledFilters, setSampledFilters] = useState<Record<string, Filter | undefined>>({});
  const [sampledOpenFilter, setSampledOpenFilter] = useState<string | null>(null);
  const [sampledColumnWidths, setSampledColumnWidths] = useState<Record<string, number>>({});
  
  // Sampled Data History State (Snapshot based for Undo)
  const [sampledHistory, setSampledHistory] = useState<{ data: DataRow[]; headers: string[] }[]>([]);

  // Sample Export Modal State
  const [isSampleExportModalOpen, setIsSampleExportModalOpen] = useState(false);

  // Data cleaning state
  const [isCleanDataSelectionModalOpen, setIsCleanDataSelectionModalOpen] = useState(false);
  const [cleanDataStats, setCleanDataStats] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  // Duplicates state
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [duplicateRowsInfo, setDuplicateRowsInfo] = useState<{
      groups: { row: DataRow; count: number }[];
      totalDuplicatesToRemove: number;
  } | null>(null);

  // Info modal state
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string }>({ title: '', message: '' });

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Dashboard Export state
  const [isDashboardExportOpen, setIsDashboardExportOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  // Row deletion state
  const [rowToDelete, setRowToDelete] = useState<DataRow | null>(null);
  
  // AI Chat Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);


    const pushState = (newData: DataRow[], newHeaders: string[]) => {
        const newHistory = history.slice(0, historyIndex + 1); // Discard redo states
        const newState = { data: newData, headers: newHeaders };
        newHistory.push(newState);

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prevIndex => prevIndex - 1);
            // Reset derived states to force re-evaluation and avoid carrying over state from a "future" that was undone.
            setFilters({});
            setSortConfig(null);
            setSearchQuery('');
            setSearchInput('');
            setSampledData(null);
            setAiResponse(null);
        }
    };
    
    // Sampled Data Undo Logic
    const handleSampledUndo = () => {
        if (sampledHistory.length === 0) return;
        const previousState = sampledHistory[sampledHistory.length - 1];
        setSampledData(previousState.data);
        setSampledDataHeaders(previousState.headers);
        setSampledHistory(prev => prev.slice(0, -1));
    };

  // Load/Save sampling configs from localStorage
  useEffect(() => {
    try {
        const saved = localStorage.getItem('samplingConfigs');
        if (saved) {
            setSavedSamplingConfigs(JSON.parse(saved));
        }
    } catch (e) {
        console.error("Failed to load sampling configs from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('samplingConfigs', JSON.stringify(savedSamplingConfigs));
    } catch (e) {
        console.error("Failed to save sampling configs to localStorage", e);
    }
  }, [savedSamplingConfigs]);


  // Derived state for filtered data
    const filteredData = useMemo(() => {
        const activeFilters = Object.entries(filters).filter((entry): entry is [string, Filter] => entry[1] !== undefined);

        if (activeFilters.length === 0) {
            return data;
        }

        return data.filter(row => {
            return activeFilters.every(([header, filter]) => {
                const rowValue = row[header];

                if (filter.type === 'categorical') {
                    return filter.values.has(rowValue);
                }

                if (filter.type === 'numeric') {
                    const numValue = parseFloat(rowValue);
                    if (isNaN(numValue)) return false; // Exclude non-numeric rows from numeric filtering

                    const { condition, value1, value2 } = filter;

                    switch (condition) {
                        case 'equals':
                            return numValue === value1;
                        case 'notEquals':
                            return numValue !== value1;
                        case 'greaterThan':
                            return value1 !== null && numValue > value1;
                        case 'lessThan':
                             return value1 !== null && numValue < value1;
                        case 'between':
                            return value1 !== null && value2 !== null && numValue >= value1 && numValue <= value2;
                        default:
                            return true;
                    }
                }

                return true;
            });
        });
    }, [data, filters]);

    // Derived state for searched and filtered data
    const searchedAndFilteredData = useMemo(() => {
        if (!searchQuery.trim()) {
            return filteredData;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return filteredData.filter(row => {
            return headers.some(header =>
                String(row[header]).toLowerCase().includes(lowercasedQuery)
            );
        });
    }, [filteredData, searchQuery, headers]);


  // Derived state for sorted and filtered data
  const sortedFilteredData = useMemo(() => {
    let sortableItems = [...searchedAndFilteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        const aIsNumeric = valA !== null && valA !== '' && !isNaN(Number(valA));
        const bIsNumeric = valB !== null && valB !== '' && !isNaN(Number(valB));

        if (aIsNumeric && bIsNumeric) {
            if (Number(valA) < Number(valB)) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (Number(valA) > Number(valB)) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
        } else {
            if (String(valA).localeCompare(String(valB), undefined, { numeric: true }) < 0) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (String(valA).localeCompare(String(valB), undefined, { numeric: true }) > 0) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [searchedAndFilteredData, sortConfig]);
  
    // Derived state for FILTERED sampled data
    const filteredSampledData = useMemo(() => {
        if (!sampledData) return [];
        const activeFilters = Object.entries(sampledFilters).filter((entry): entry is [string, Filter] => entry[1] !== undefined);

        if (activeFilters.length === 0) {
            return sampledData;
        }

        return sampledData.filter(row => {
            return activeFilters.every(([header, filter]) => {
                const rowValue = row[header];

                if (filter.type === 'categorical') {
                    return filter.values.has(rowValue);
                }

                if (filter.type === 'numeric') {
                    const numValue = parseFloat(rowValue);
                    if (isNaN(numValue)) return false; 

                    const { condition, value1, value2 } = filter;

                    switch (condition) {
                        case 'equals':
                            return numValue === value1;
                        case 'notEquals':
                            return numValue !== value1;
                        case 'greaterThan':
                            return value1 !== null && numValue > value1;
                        case 'lessThan':
                             return value1 !== null && numValue < value1;
                        case 'between':
                            return value1 !== null && value2 !== null && numValue >= value1 && numValue <= value2;
                        default:
                            return true;
                    }
                }
                return true;
            });
        });
    }, [sampledData, sampledFilters]);

    // Derived state for SORTED sampled data
    const sortedSampledData = useMemo(() => {
        if (!filteredSampledData) return [];
        let sortableItems = [...filteredSampledData];
        if (sampledDataSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sampledDataSortConfig!.key];
                const valB = b[sampledDataSortConfig!.key];
                
                const aIsNumeric = valA !== null && valA !== '' && !isNaN(Number(valA));
                const bIsNumeric = valB !== null && valB !== '' && !isNaN(Number(valB));

                if (aIsNumeric && bIsNumeric) {
                    if (Number(valA) < Number(valB)) {
                        return sampledDataSortConfig!.direction === 'ascending' ? -1 : 1;
                    }
                    if (Number(valA) > Number(valB)) {
                        return sampledDataSortConfig!.direction === 'ascending' ? 1 : -1;
                    }
                } else {
                     if (String(valA).localeCompare(String(valB), undefined, { numeric: true }) < 0) {
                        return sampledDataSortConfig!.direction === 'ascending' ? -1 : 1;
                    }
                    if (String(valA).localeCompare(String(valB), undefined, { numeric: true }) > 0) {
                        return sampledDataSortConfig!.direction === 'ascending' ? 1 : -1;
                    }
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredSampledData, sampledDataSortConfig]);

  // Click outside handler for filter menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
        setSampledOpenFilter(null); // Also close sampled filter menu
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Default viz initialization
  useEffect(() => {
      if(activeTab === 'viz' && headers.length > 0 && dashboardCharts.length === 0) {
          // Initialize with one default chart if none exist
          const numericCol = headers.find(h => isColumnNumeric(h)) || headers[0];
          setDashboardCharts([{
              id: Date.now().toString(),
              type: 'bar',
              title: `توزيع ${numericCol}`,
              xCol: headers[0],
              yCol: numericCol === headers[0] ? '' : numericCol,
              agg: 'count',
              width: 500,
              height: 350
          }]);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, headers]);


  const isColumnNumeric = (header: string): boolean => {
      if (data.length === 0) return false;
      // Use original `data` for consistent type detection regardless of filters
      const columnData = data.map(row => row[header]);
      const validData = columnData.filter(d => d !== null && d !== undefined && d !== '');
      if (validData.length === 0) return false;
      const numericData = validData.map(val => {
        // Handle dates in common formats by converting to timestamp
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
            const date = new Date(val);
            return isNaN(date.getTime()) ? NaN : date.getTime();
        }
        return Number(val);
      }).filter(n => !isNaN(n));
      // Consider numeric if > 80% of non-empty values are numbers or parsable dates
      return (numericData.length / validData.length > 0.8);
  };
  
  // Helper function to calculate categorical strata for a given column based on filtered and searched data
  const calculateCategoricalStrata = (column: string): CategoricalStratum[] => {
      if (!column || !searchedAndFilteredData.length) return [];
      
      const counts: Record<string, number> = {};
      for (const row of searchedAndFilteredData) {
          const value = String(row[column]);
          counts[value] = (counts[value] || 0) + 1;
      }

      return Object.entries(counts).map(([value, count]) => ({
          value,
          count,
          sampleSize: 0,
      }));
  };

  const checkNumericCondition = (val: number, op: NumericConditionOperator, condVal: number): boolean => {
    switch (op) {
        case 'eq': return val === condVal;
        case 'neq': return val !== condVal;
        case 'gt': return val > condVal;
        case 'gte': return val >= condVal;
        case 'lt': return val < condVal;
        case 'lte': return val <= condVal;
        default: return false;
    }
  };

  const recalculateNumericLevelCounts = (level: StratificationLevel, baseData: DataRow[]): StratificationLevel => {
      let remainingData = [...baseData];
      const userRules = (level.strata as NumericStratum[]).filter(s => s.id !== 'other');

      const newStrata: NumericStratum[] = userRules.map(rule => {
          const group = remainingData.filter(row => {
              const val = parseFloat(row[level.column]);
              if (isNaN(val) || rule.operator === undefined || rule.value === undefined) return false;
              return checkNumericCondition(val, rule.operator, rule.value);
          });
          remainingData = remainingData.filter(row => !group.includes(row));
          return { ...rule, count: group.length };
      });
      
      const otherStratum = (level.strata as NumericStratum[]).find(s => s.id === 'other') || {
          id: 'other',
          label: 'الباقي',
          sampleSize: '',
          error: undefined
      };

      newStrata.push({ ...(otherStratum as NumericStratum), count: remainingData.length });
      
      return { ...level, strata: newStrata };
  };

  useEffect(() => {
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFilteredData, appliedPreviewSize, appliedPreviewType]);
  
  // Effect for Stats Tab
  useEffect(() => {
    if (activeTab === 'stats') {
      generateStats();
      const matrixData = generateCorrelationMatrix(searchedAndFilteredData, headers);
      setCorrelationMatrix(matrixData);
      // If the currently selected column is no longer valid (e.g., deleted),
      // or if no column is selected yet, pick the first one.
      if (!headers.includes(selectedStatColumn)) {
        setSelectedStatColumn(headers[0] || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchedAndFilteredData, headers]);

    // Effect to initialize or update stratification levels
    useEffect(() => {
        if (samplingMethod === 'stratified') {
            // Initialize if empty
            if (stratificationLevels.length === 0 && headers.length > 0) {
                const firstColumn = headers[0];
                const isNumeric = isColumnNumeric(firstColumn);
                 setStratificationLevels([{
                    id: Date.now(),
                    column: firstColumn,
                    columnType: isNumeric ? 'numeric' : 'categorical',
                    strata: isNumeric ? [{ id: 'other', label: 'الباقي', count: searchedAndFilteredData.length, sampleSize: '' }] : calculateCategoricalStrata(firstColumn)
                }]);
            } else {
                 // Recalculate counts if base data changes
                setStratificationLevels(prev => 
                    prev.map(level => {
                        if (!level.column) return level;
                        if (level.columnType === 'numeric') {
                            return recalculateNumericLevelCounts(level, searchedAndFilteredData);
                        } else if (level.columnType === 'categorical') {
                            // Re-evaluate categorical strata based on current filtered data
                             const currentStrata = calculateCategoricalStrata(level.column);
                             const savedSampleSizes = new Map<string, number | string>();
                             (level.strata as CategoricalStratum[]).forEach(s => {
                                 savedSampleSizes.set(s.value, s.sampleSize);
                             });
                             const mergedStrata = currentStrata.map(cs => ({
                                 ...cs,
                                 sampleSize: savedSampleSizes.get(cs.value) || 0,
                             }));
                             return { ...level, strata: mergedStrata };
                        }
                        return level;
                    })
                );
            }
        } else {
            setStratificationLevels([]); // Clear when switching away
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [samplingMethod, searchedAndFilteredData, headers]);


  const kpiStats = useMemo(() => {
    const dataToAnalyze = searchedAndFilteredData;
    let numericColumnsCount = 0;
    let totalMissingValues = 0;

    headers.forEach(header => {
        const columnData = dataToAnalyze.map(row => row[header]);
        const validData = columnData.filter(d => d !== null && d !== undefined && d !== '');
        totalMissingValues += (columnData.length - validData.length);
        
        if (isColumnNumeric(header)) {
            numericColumnsCount++;
        }
    });

    return {
        totalRecords: dataToAnalyze.length,
        totalColumns: headers.length,
        numericColumnsCount,
        totalMissingValues
    };
  }, [searchedAndFilteredData, headers]);

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, header: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent drag-and-drop

        const thElement = e.currentTarget.parentElement;
        if (!thElement) return;

        resizingColumnRef.current = header;
        resizingTargetRef.current = 'main'; // Target main table
        startXRef.current = e.clientX;
        startWidthRef.current = thElement.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleSampledResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, header: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent drag-and-drop

        const thElement = e.currentTarget.parentElement;
        if (!thElement) return;

        resizingColumnRef.current = header;
        resizingTargetRef.current = 'sample'; // Target sample table
        startXRef.current = e.clientX;
        startWidthRef.current = thElement.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingColumnRef.current) return;
        const newWidth = startWidthRef.current + (e.clientX - startXRef.current);
        if (newWidth > 50) { // Minimum column width of 50px
            if (resizingTargetRef.current === 'sample') {
                setSampledColumnWidths(prev => ({
                    ...prev,
                    [resizingColumnRef.current!]: newWidth
                }));
            } else {
                setColumnWidths(prev => ({
                    ...prev,
                    [resizingColumnRef.current!]: newWidth
                }));
            }
        }
    };
    
    const handleMouseUp = () => {
        document.body.style.cursor = 'default';
        resizingColumnRef.current = null;
        resizingTargetRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

  const handleDeleteColumn = (columnToDelete: string) => {
    if(headers.length <= 1) {
        alert("لا يمكن حذف آخر عمود متبقي.");
        return;
    }
    const newHeaders = headers.filter(h => h !== columnToDelete);
    const newData = data.map(row => {
      const newRow = { ...row };
      delete newRow[columnToDelete];
      return newRow;
    });
    pushState(newData, newHeaders);
    
    // Clear any filter associated with the deleted column
    setFilters(prev => {
        const newFilters = {...prev};
        delete newFilters[columnToDelete];
        return newFilters;
    });

    setStats({}); // Reset stats
    setAiResponse(null); // Reset AI analysis
  };

  const generatePreview = () => {
    let sample: DataRow[] = [];
    const dataToUse = sortedFilteredData;
    const size = Math.min(appliedPreviewSize, dataToUse.length);
    if (size <= 0) {
        setPreviewData([]);
        return;
    }

    switch (appliedPreviewType) {
      case 'first':
        sample = dataToUse.slice(0, size);
        break;
      case 'last':
        sample = dataToUse.slice(-size);
        break;
      case 'random':
        // Random preview ignores sorting, which is expected.
        sample = [...dataToUse].sort(() => 0.5 - Math.random()).slice(0, size);
        break;
    }
    setPreviewData(sample);
  };
  
  const generateStats = () => {
    const newStats: Record<string, ColumnStat> = {};
    for (const header of headers) {
        const columnData = searchedAndFilteredData.map(row => row[header]);
        newStats[header] = getColumnInfo(columnData, searchedAndFilteredData, header);
    }
    setStats(newStats);
  };
  
  const prepareVizData = (config: ChartConfig) => {
      if (!config.xCol) return [];
      
      const dataToViz = searchedAndFilteredData;

      if (config.type === 'bar' || config.type === 'bar-horizontal' || config.type === 'pie' || config.type === 'donut' || config.type === 'line') {
          // Group by X, aggregate Y
          const groups: Record<string, { sum: number, count: number, values: Set<any> }> = {};
          
          dataToViz.forEach(row => {
              const xVal = String(row[config.xCol] || 'N/A');
              if (!groups[xVal]) groups[xVal] = { sum: 0, count: 0, values: new Set() };
              
              groups[xVal].count += 1;
              
              if (config.yCol) {
                  const yVal = row[config.yCol];
                  // For distinct count, just track the value
                  groups[xVal].values.add(yVal);

                  // For sum/avg
                  const numVal = parseFloat(yVal);
                  if (!isNaN(numVal)) {
                      groups[xVal].sum += numVal;
                  }
              }
          });
          
          return Object.entries(groups).map(([name, vals]) => {
            let value = 0;
            if (config.yCol) {
                if (config.agg === 'sum') value = vals.sum;
                else if (config.agg === 'avg') value = vals.sum / vals.count;
                else if (config.agg === 'distinct') value = vals.values.size;
                else value = vals.count; // Fallback to count if nothing else
            } else {
                value = vals.count;
            }
            return {
                name,
                value: parseFloat(value.toFixed(2)) // Round for better display
            };
          }).sort((a, b) => b.value - a.value).slice(0, 20); // Limit bars/slices for performance/readability
      } 
      else if (config.type === 'ticket') {
          // Calculate single value
          let value = 0;
           if (config.yCol) {
               const validValues = dataToViz.map(r => r[config.yCol]).filter(v => v !== null && v !== undefined && v !== '');
               const numericValues = validValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
               
               if (config.agg === 'sum') value = numericValues.reduce((a, b) => a + b, 0);
               else if (config.agg === 'avg') value = numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
               else if (config.agg === 'distinct') value = new Set(validValues).size;
               else value = validValues.length;
           } else {
               value = dataToViz.length;
           }
           return [{ name: config.title, value: parseFloat(value.toFixed(2)) }];
      }
      return [];
  };

  const handleExportChart = (chartId: string) => {
        const chartDiv = document.getElementById(`chart-container-${chartId}`);
        if(!chartDiv) return;

        const svg = chartDiv.querySelector('svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const svgSize = svg.getBoundingClientRect();
            canvas.width = svgSize.width;
            canvas.height = svgSize.height;
            const ctx = canvas.getContext("2d");
            const img = new Image();
            const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            img.onload = function() {
                if(ctx) {
                    ctx.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL("image/png");
                    const downloadLink = document.createElement("a");
                    downloadLink.href = pngUrl;
                    downloadLink.download = `chart_${chartId}.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
                URL.revokeObjectURL(url);
            };
            img.src = url;
        }
    };
    
    // Sidebar Resize Logic
    const startSidebarResize = (e: React.MouseEvent) => {
        e.preventDefault();
        resizingSidebarRef.current = true;
        sidebarStartXRef.current = e.clientX;
        sidebarStartWidthRef.current = sidebarWidth;
        document.addEventListener('mousemove', handleSidebarResize);
        document.addEventListener('mouseup', stopSidebarResize);
        document.body.style.cursor = 'col-resize';
    };

    const handleSidebarResize = (e: MouseEvent) => {
        if (!resizingSidebarRef.current) return;
        
        // Calculate new width: Dragging LEFT (smaller X) should INCREASE width in RTL
        const deltaX = sidebarStartXRef.current - e.clientX;
        const newWidth = sidebarStartWidthRef.current + deltaX;

        // Clamp width: min 132px (approx 3.5cm) to max 600px
        if (newWidth > 132 && newWidth < 600) {
            setSidebarWidth(newWidth);
        }
    };

    const stopSidebarResize = () => {
        resizingSidebarRef.current = false;
        document.removeEventListener('mousemove', handleSidebarResize);
        document.removeEventListener('mouseup', stopSidebarResize);
        document.body.style.cursor = 'default';
    };
    
    // Chart Resize Logic
    const startChartResize = (e: React.MouseEvent, chartId: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingChartRef.current = chartId;
        document.addEventListener('mousemove', handleChartResize);
        document.addEventListener('mouseup', stopChartResize);
        document.body.style.cursor = 'se-resize';
    };

    const handleChartResize = (e: MouseEvent) => {
        if (!resizingChartRef.current) return;
        const chartElement = document.getElementById(`chart-card-${resizingChartRef.current}`);
        if (chartElement) {
            const rect = chartElement.getBoundingClientRect();
            // In RTL, dragging bottom-left (if that's where the handle is) increases width as mouseX decreases.
            // Current handle is bottom-left.
            const newWidth = rect.right - e.clientX;
            const newHeight = e.clientY - rect.top;

            // Smaller min width for Tickets
            const currentChart = dashboardCharts.find(c => c.id === resizingChartRef.current);
            const minWidth = currentChart?.type === 'ticket' ? 150 : 300;
            const minHeight = currentChart?.type === 'ticket' ? 100 : 200;

            setDashboardCharts(prev => prev.map(c => 
                c.id === resizingChartRef.current ? { 
                    ...c, 
                    width: Math.max(minWidth, newWidth), 
                    height: Math.max(minHeight, newHeight) 
                } : c
            ));
        }
    };
    
    const stopChartResize = () => {
        resizingChartRef.current = null;
        document.removeEventListener('mousemove', handleChartResize);
        document.removeEventListener('mouseup', stopChartResize);
        document.body.style.cursor = 'default';
    };

    // Chart Drag & Drop Logic
    const handleChartDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        // Only allow dragging if the target is specifically the grip handle
        const target = e.target as HTMLElement;
        if (!target.closest('.chart-drag-handle')) {
            e.preventDefault();
            return;
        }

        dragChartIndex.current = index;
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setData('text/plain', index.toString()); // Not strictly needed for react reorder but good practice
        
        // Optional: Set a custom drag image or style
        e.currentTarget.style.opacity = '0.5';
    };

    const handleChartDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.style.opacity = '1';
        dragChartIndex.current = null;
        setChartDragOverIndex(null);
    };

    const handleChartDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault(); // Essential to allow dropping
        e.dataTransfer.dropEffect = 'move';
        
        if (chartDragOverIndex !== index) {
            setChartDragOverIndex(index);
        }
    };

    const handleChartDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragChartIndex.current;
        
        if (dragIndex === null || dragIndex === dropIndex) {
            setChartDragOverIndex(null);
            return;
        }

        const newCharts = [...dashboardCharts];
        const [movedChart] = newCharts.splice(dragIndex, 1);
        newCharts.splice(dropIndex, 0, movedChart);
        
        setDashboardCharts(newCharts);
        setChartDragOverIndex(null);
    };


    const updateChartConfig = (key: keyof ChartConfig, value: any) => {
        if (!selectedChartId) return;
        setDashboardCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, [key]: value } : c));
    };
    
    const deleteChart = (id: string) => {
        setDashboardCharts(prev => prev.filter(c => c.id !== id));
        if (selectedChartId === id) setSelectedChartId(null);
    };
    
    const handlePrintDashboard = (orientation: 'portrait' | 'landscape') => {
        setPrintOrientation(orientation);
        // Timeout allows React to re-render the style block with the new orientation
        setTimeout(() => {
            window.print();
        }, 500);
    };
    
    const addNewChart = () => {
          const newId = Date.now().toString();
          setDashboardCharts(prev => [...prev, {
              id: newId,
              type: 'bar',
              title: 'رسم بياني جديد',
              xCol: headers[0],
              yCol: '',
              agg: 'count',
              width: 400,
              height: 300
          }]);
          setSelectedChartId(newId);
          if(!isSettingsOpen) setIsSettingsOpen(true);
    };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    try {
      const sampleForAI = searchedAndFilteredData.slice(0, 50); // Send a sample to avoid large payloads
      const result = await analyzeDataWithGemini(headers, sampleForAI);
      
      const parts = result.split('```json');
      const textPart = parts[0];
      let chartsPart: any[] = [];
      if(parts[1]) {
          try {
             const jsonString = parts[1].replace('```','').trim();
             chartsPart = JSON.parse(jsonString);
          } catch(e) {
              console.error("Failed to parse AI charts JSON", e);
          }
      }

      setAiResponse({ text: textPart.split('\n').filter(line => line.trim() !== ''), charts: chartsPart });
    } catch (error) {
      console.error(error);
      setAiError('حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
    } finally {
      setAiLoading(false);
    }
  };

    const generateSampleFromConfig = (
        config: SamplingConfig,
        dataForSampling: DataRow[],
        currentHeaders: string[]
    ): DataRow[] => {
        let finalSample: DataRow[] = [];
        const totalRows = dataForSampling.length;

        if (config.method === 'random') {
            const size = config.isPercentage ? Math.round((config.sampleSize / 100) * totalRows) : config.sampleSize;
            finalSample = [...dataForSampling].sort(() => 0.5 - Math.random()).slice(0, Math.min(size, totalRows));
        } else if (config.method === 'systematic') {
            if (config.systematicInterval <= 0) return [];
            for (let i = 0; i < totalRows; i += config.systematicInterval) {
                finalSample.push(dataForSampling[i]);
            }
        } else if (config.method === 'stratified') {
            const allSamples: DataRow[] = [];

            const getSampleSize = (stratum: CategoricalStratum | NumericStratum, groupLength: number) => {
                let stratumSampleSize = 0;
                const sampleSizeStr = String(stratum.sampleSize);
                if (sampleSizeStr.trim().endsWith('%')) {
                    const percentage = parseFloat(sampleSizeStr.slice(0, -1));
                    if (!isNaN(percentage)) stratumSampleSize = Math.round((percentage / 100) * groupLength);
                } else {
                    const parsedSize = parseInt(sampleSizeStr, 10);
                    if (!isNaN(parsedSize)) stratumSampleSize = parsedSize;
                }
                return stratumSampleSize;
            };

            config.stratificationLevels.forEach(level => {
                if (!level.column) return;

                if (level.columnType === 'categorical') {
                    const groupedData = dataForSampling.reduce((acc, row) => {
                        const key = String(row[level.column]);
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(row);
                        return acc;
                    }, {} as Record<string, DataRow[]>);

                    (level.strata as CategoricalStratum[]).forEach(stratum => {
                        const group = groupedData[stratum.value];
                        if (!group) return;
                        const stratumSampleSize = getSampleSize(stratum, group.length);
                        if (stratumSampleSize > 0) {
                            const stratumSample = [...group].sort(() => 0.5 - Math.random()).slice(0, Math.min(stratumSampleSize, group.length));
                            allSamples.push(...stratumSample);
                        }
                    });
                } else { // Numeric rule-based
                    const userRules = (level.strata as NumericStratum[]).filter(s => s.id !== 'other');
                    let remainingDataForLevel = [...dataForSampling];

                    userRules.forEach(rule => {
                        const group = remainingDataForLevel.filter(row => {
                            const val = parseFloat(row[level.column]);
                            if (isNaN(val) || rule.operator === undefined || rule.value === undefined) return false;
                            return checkNumericCondition(val, rule.operator, rule.value);
                        });
                        
                        if (group.length > 0) {
                            const stratumSampleSize = getSampleSize(rule, group.length);
                            if (stratumSampleSize > 0) {
                                const stratumSample = [...group].sort(() => 0.5 - Math.random()).slice(0, Math.min(stratumSampleSize, group.length));
                                allSamples.push(...stratumSample);
                            }
                        }
                        remainingDataForLevel = remainingDataForLevel.filter(row => !group.includes(row));
                    });
                    
                    const otherStratum = (level.strata as NumericStratum[]).find(s => s.id === 'other');
                    if (otherStratum && remainingDataForLevel.length > 0) {
                        const stratumSampleSize = getSampleSize(otherStratum, remainingDataForLevel.length);
                        if (stratumSampleSize > 0) {
                            const stratumSample = [...remainingDataForLevel].sort(() => 0.5 - Math.random()).slice(0, Math.min(stratumSampleSize, remainingDataForLevel.length));
                            allSamples.push(...stratumSample);
                        }
                    }
                }
            });

            const uniqueSamplesMap = new Map<string, DataRow>();
            allSamples.forEach(row => {
                uniqueSamplesMap.set(JSON.stringify(currentHeaders.map(h => row[h])), row);
            });
            finalSample = Array.from(uniqueSamplesMap.values());
        }
        return finalSample;
    };


    const handleGenerateSample = () => {
        const currentConfig: SamplingConfig = {
          method: samplingMethod,
          sampleSize: sampleSize,
          isPercentage: isPercentage,
          systematicInterval: systematicInterval,
          stratificationLevels: stratificationLevels,
        };
        const newSample = generateSampleFromConfig(currentConfig, searchedAndFilteredData, headers);
        setSampledData(newSample);
        setSampledDataHeaders(headers); // Reset headers on new sample generation
        setSampledDataSortConfig(null); // Reset sort on new sample generation
        setSampledHistory([]); // Reset history on new sample generation
    };

    // Updated handleConfirmSampleExport to handle export with format
    const handleConfirmSampleExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (!sortedSampledData || sortedSampledData.length === 0) return;
        const filename = `sample_${fileName.replace(/\.csv$/, '')}`;
        switch (format) {
            case 'csv':
                exportToCSV(sortedSampledData, sampledDataHeaders, filename);
                break;
            case 'excel':
                exportToExcel(sortedSampledData, sampledDataHeaders, filename);
                break;
            case 'pdf':
                exportToPDF(sortedSampledData, sampledDataHeaders, filename);
                break;
        }
        setIsSampleExportModalOpen(false);
    };
    
    const handleConfirmExport = (format: 'csv' | 'excel' | 'pdf') => {
        if (!searchedAndFilteredData || searchedAndFilteredData.length === 0) {
            alert("لا توجد بيانات للتصدير.");
            return;
        }
        const filename = `filtered_${fileName.replace(/\.[^/.]+$/, "")}`;
        switch (format) {
            case 'csv':
                exportToCSV(searchedAndFilteredData, headers, filename);
                break;
            case 'excel':
                exportToExcel(searchedAndFilteredData, headers, filename);
                break;
            case 'pdf':
                exportToPDF(searchedAndFilteredData, headers, filename);
                break;
        }
        setIsExportModalOpen(false);
    };

    const handleExportConfig = () => {
        const currentConfig: SamplingConfig = {
          method: samplingMethod,
          sampleSize: sampleSize,
          isPercentage: isPercentage,
          systematicInterval: systematicInterval,
          stratificationLevels: stratificationLevels,
        };
        const filename = `sampling_config_${fileName.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().slice(0, 10)}`;
        exportConfigToExcel(currentConfig, filename);
    };

    const handleAddStratificationLevel = () => {
        if (stratificationLevels.length < 4) {
            const usedColumns = new Set(stratificationLevels.map(l => l.column));
            const nextColumn = headers.find(h => !usedColumns.has(h)) || '';
            const isNumeric = isColumnNumeric(nextColumn);
            
            setStratificationLevels(prev => [...prev, {
                id: Date.now(),
                column: nextColumn,
                columnType: isNumeric ? 'numeric' : 'categorical',
                strata: isNumeric ? [{ id: 'other', label: 'الباقي', count: searchedAndFilteredData.length, sampleSize: '' }] : calculateCategoricalStrata(nextColumn),
            }]);
        }
    };

    const handleRemoveStratificationLevel = (levelIdToRemove: number) => {
        setStratificationLevels(prev => prev.filter(level => level.id !== levelIdToRemove));
    };

    const handleStratificationColumnChange = (levelId: number, newColumn: string) => {
        setStratificationLevels(prev => prev.map(level => {
            if (level.id !== levelId) return level;
            
            const isNumeric = isColumnNumeric(newColumn);
            const newColumnType = isNumeric ? 'numeric' : 'categorical';
            const newStrata = newColumnType === 'categorical' 
                ? calculateCategoricalStrata(newColumn) 
                : [{ id: 'other', label: 'الباقي', count: searchedAndFilteredData.length, sampleSize: '' }];

            return { ...level, column: newColumn, columnType: newColumnType, strata: newStrata };
        }));
    };

    const validateStratumSampleSize = (sizeInput: string | number, maxCount: number): string | null => {
        const sizeStr = String(sizeInput).trim();
        if (sizeStr === '') return null; // Empty is OK

        let requestedSize: number;

        if (sizeStr.endsWith('%')) {
            const percentage = parseFloat(sizeStr.slice(0, -1));
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                return 'النسبة يجب أن تكون بين 0 و 100.';
            }
            requestedSize = Math.round((percentage / 100) * maxCount);
        } else {
            const num = parseFloat(sizeStr);
            if (isNaN(num) || num < 0) {
                return 'الرجاء إدخال عدد موجب.';
            }
            if (num !== Math.floor(num)) {
                 return 'الرجاء إدخال عدد صحيح.';
            }
            requestedSize = num;
        }

        if (requestedSize > maxCount) {
            return `الحجم يتجاوز العدد المتاح (${maxCount}).`;
        }

        return null; // No error
    };

    const handleCategoricalStratumSizeChange = (levelId: number, stratumValue: string, newSize: string) => {
        setStratificationLevels(prev => prev.map(level =>
            level.id === levelId
            ? {
                ...level,
                strata: (level.strata as CategoricalStratum[]).map(s => {
                    if (s.value === stratumValue) {
                        const error = validateStratumSampleSize(newSize, s.count);
                        return { ...s, sampleSize: newSize, error };
                    }
                    return s;
                })
              }
            : level
        ));
    };
    
    // Helper to auto-fill sample sizes for categorical strata
    const handleAutoFillCategorical = (levelId: number, percentage: number) => {
        setStratificationLevels(prev => prev.map(level => 
            level.id === levelId
            ? {
                ...level,
                strata: (level.strata as CategoricalStratum[]).map(s => {
                    // Just set the percentage string, the logic handles it
                    return { ...s, sampleSize: `${percentage}%`, error: null };
                })
            }
            : level
        ));
    };
    
    const handleAddNumericRule = (levelId: number, operator: NumericConditionOperator, value: number) => {
        setStratificationLevels(prev => {
            const newLevels = prev.map(level => {
                if (level.id !== levelId) return level;

                const labelMap = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' };
                const newRule: NumericStratum = {
                    id: Date.now().toString(),
                    operator,
                    value,
                    label: `${labelMap[operator]} ${value}`,
                    count: 0, // Will be calculated
                    sampleSize: '',
                };
                
                const existingStrata = (level.strata as NumericStratum[]);
                const otherStratumIndex = existingStrata.findIndex(s => s.id === 'other');
                const newStrata = (otherStratumIndex > -1)
                    ? [...existingStrata.slice(0, otherStratumIndex), newRule, ...existingStrata.slice(otherStratumIndex)]
                    : [...existingStrata, newRule];
                    
                const levelWithNewRule = { ...level, strata: newStrata };
                return recalculateNumericLevelCounts(levelWithNewRule, searchedAndFilteredData);
            });
            return newLevels;
        });
    };

    const handleRemoveNumericStratum = (levelId: number, stratumId: string) => {
        setStratificationLevels(prev => prev.map(level => {
            if (level.id !== levelId) return level;
            
            const newStrata = (level.strata as NumericStratum[]).filter(s => s.id !== stratumId);
            const levelWithRemovedRule = { ...level, strata: newStrata };
            return recalculateNumericLevelCounts(levelWithRemovedRule, searchedAndFilteredData);
        }));
    };

    const handleNumericStratumSizeChange = (levelId: number, stratumId: string, newSize: string) => {
        setStratificationLevels(prev => prev.map(level =>
            level.id === levelId
            ? {
                ...level,
                strata: level.strata.map(s => {
                    const stratum = s as NumericStratum;
                    if (stratum.id === stratumId) {
                        const error = validateStratumSampleSize(newSize, stratum.count);
                        return { ...stratum, sampleSize: newSize, error };
                    }
                    return s;
                })
              }
            : level
        ));
    };

  const handleSaveConfig = (configName: string) => {
    const currentConfig: SamplingConfig = {
      method: samplingMethod,
      sampleSize: sampleSize,
      isPercentage: isPercentage,
      systematicInterval: systematicInterval,
      stratificationLevels: stratificationLevels,
    };
    setSavedSamplingConfigs(prev => ({ ...prev, [configName]: currentConfig }));
    setSelectedConfigName(configName);
    setIsSaveModalOpen(false); // Close modal on success
  };
  
    const requestDeleteConfig = (configNameToDelete: string) => {
        if (!configNameToDelete) return;
        setConfigToDelete(configNameToDelete);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteConfig = () => {
        if (!configToDelete) return;
        setSavedSamplingConfigs(prev => {
            const newConfigs = { ...prev };
            delete newConfigs[configToDelete];
            return newConfigs;
        });

        if (selectedConfigName === configToDelete) {
            setSelectedConfigName('');
        }
        setIsDeleteModalOpen(false);
        setConfigToDelete('');
    };


  const handleRenameConfig = (newName: string) => {
    if (!configToRename || configToRename === newName.trim()) {
        setIsRenameModalOpen(false);
        setConfigToRename('');
        return;
    }

    const finalNewName = newName.trim();

    setSavedSamplingConfigs(prev => {
        const newConfigs = { ...prev };
        const configData = newConfigs[configToRename];
        delete newConfigs[configToRename];
        newConfigs[finalNewName] = configData;
        return newConfigs;
    });

    if (selectedConfigName === configToRename) {
        setSelectedConfigName(finalNewName);
    }

    setIsRenameModalOpen(false);
    setConfigToRename('');
  };

  const handleLoadConfig = () => {
    if (!selectedConfigName || !savedSamplingConfigs[selectedConfigName]) return;

    const config = savedSamplingConfigs[selectedConfigName];

    setSamplingMethod(config.method);
    setSampleSize(config.sampleSize);
    setIsPercentage(config.isPercentage);
    setSystematicInterval(config.systematicInterval);

    let configForSampling: SamplingConfig = { ...config, stratificationLevels: [] };

    if (config.method === 'stratified') {
      const rehydratedLevels = config.stratificationLevels.map(savedLevel => {
        if (!headers.includes(savedLevel.column)) {
          return { ...savedLevel, column: '', strata: [] };
        }
        if (savedLevel.columnType === 'categorical') {
          const currentStrata = calculateCategoricalStrata(savedLevel.column);
          const savedSampleSizes = new Map<string, number | string>();
          (savedLevel.strata as CategoricalStratum[]).forEach(s => {
            savedSampleSizes.set(s.value, s.sampleSize);
          });
          const mergedStrata = currentStrata.map(currentStratum => ({
            ...currentStratum,
            sampleSize: savedSampleSizes.get(currentStratum.value) || 0,
          }));
          return { ...savedLevel, strata: mergedStrata };
        } else { // numeric
          const levelWithRules = {
              ...savedLevel,
              strata: (savedLevel.strata as NumericStratum[]).filter(s => s.id !== 'other')
          };
          return recalculateNumericLevelCounts(levelWithRules, searchedAndFilteredData);
        }
      });
      setStratificationLevels(rehydratedLevels);
      configForSampling = { ...config, stratificationLevels: rehydratedLevels };
    } else {
      setStratificationLevels([]);
    }
    
    const newSample = generateSampleFromConfig(configForSampling, searchedAndFilteredData, headers);
    setSampledData(newSample);
    setSampledDataHeaders(headers); // Reset headers on load
    setSampledDataSortConfig(null); // Reset sort on load
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
    const requestSampledDataSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sampledDataSortConfig && sampledDataSortConfig.key === key && sampledDataSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSampledDataSortConfig({ key, direction });
    };

    const handleDeleteSampledDataColumn = (columnToDelete: string) => {
        if (sampledDataHeaders.length <= 1) {
            alert("لا يمكن حذف آخر عمود متبقي.");
            return;
        }
        
        // Push current state to history before modification
        if (sampledData) {
            setSampledHistory(prev => {
                const newHist = [...prev, { data: sampledData, headers: sampledDataHeaders }];
                // Keep only last 4 states
                return newHist.slice(-4);
            });
        }

        setSampledDataHeaders(prev => prev.filter(h => h !== columnToDelete));
        // Also remove filter for this column if exists
        setSampledFilters(prev => {
            const newFilters = {...prev};
            delete newFilters[columnToDelete];
            return newFilters;
        });
    };

  const isFilterActive = (header: string) => {
    return !!filters[header];
  };

    const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.currentTarget.style.opacity = '0.5';
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>, index: number) => {
        e.preventDefault(); 
        if (dragItem.current !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLTableCellElement>) => {
        e.preventDefault();
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, dropIndex: number) => {
        e.preventDefault();
        if (dragItem.current === null || dragItem.current === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const newHeaders = [...headers];
        const draggedItemContent = newHeaders.splice(dragItem.current, 1)[0];
        newHeaders.splice(dropIndex, 0, draggedItemContent);

        dragItem.current = null;
        setDragOverIndex(null);
        pushState(data, newHeaders);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableCellElement>) => {
        e.currentTarget.style.opacity = '1';
        dragItem.current = null;
        setDragOverIndex(null);
    };

    const hasSamplingErrors = useMemo(() => {
        if (samplingMethod !== 'stratified') {
            return false;
        }
        for (const level of stratificationLevels) {
            for (const stratum of level.strata) {
                if ((stratum as CategoricalStratum | NumericStratum).error) {
                    return true;
                }
            }
        }
        return false;
    }, [samplingMethod, stratificationLevels]);

    const handleModalSearch = (query: string) => {
        setSearchInput(query);
        setSearchQuery(query);
        setIsSearchVisible(false); // Close modal
    };
    
    const handleModalClear = () => {
        setSearchInput('');
        setSearchQuery('');
        setIsSearchVisible(false); // Close modal
    };
    
    const requestCleanData = () => {
        // Calculate empty columns
        const emptyColumns = headers.filter(header =>
            data.every(row => row[header] === null || row[header] === undefined || String(row[header]).trim() === '')
        );

        // Calculate empty rows
        const emptyRowsCount = data.filter(row =>
            headers.every(header => row[header] === null || row[header] === undefined || String(row[header]).trim() === '')
        ).length;

        if (emptyColumns.length === 0 && emptyRowsCount === 0) {
            setInfoModalContent({
                title: "لا توجد بيانات لتنظيفها",
                message: "لم يتم العثور على أي صفوف أو أعمدة فارغة بالكامل في مجموعة البيانات الحالية."
            });
            setIsInfoModalOpen(true);
            return;
        }

        setCleanDataStats({ rows: emptyRowsCount, cols: emptyColumns.length });
        setIsCleanDataSelectionModalOpen(true);
    };

    const confirmCleanData = (selection: { rows: boolean; cols: boolean }) => {
        let currentData = [...data];
        let currentHeaders = [...headers];

        if (selection.cols) {
            const emptyColumns = new Set(currentHeaders.filter(header =>
                currentData.every(row => row[header] === null || row[header] === undefined || String(row[header]).trim() === '')
            ));

            if (emptyColumns.size > 0) {
                currentHeaders = currentHeaders.filter(h => !emptyColumns.has(h));
                currentData = currentData.map(row => {
                    const newRow: DataRow = {};
                    currentHeaders.forEach(header => {
                        newRow[header] = row[header];
                    });
                    return newRow;
                });
            }
        }

        if (selection.rows) {
            currentData = currentData.filter(row =>
                currentHeaders.some(header => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== '')
            );
        }

        pushState(currentData, currentHeaders);
        
        // Reset related states
        setFilters({});
        setSortConfig(null);
        setStats({});
        setAiResponse(null);
        setSampledData(null);

        setIsCleanDataSelectionModalOpen(false);
    };

    const handleFindDuplicates = () => {
        const rowCounts = new Map<string, { row: DataRow, count: number }>();
        
        data.forEach(row => {
            const rowString = JSON.stringify(headers.map(h => row[h] ?? ''));
            if (rowCounts.has(rowString)) {
                rowCounts.get(rowString)!.count++;
            } else {
                rowCounts.set(rowString, { row, count: 1 });
            }
        });

        const duplicateGroups = Array.from(rowCounts.values()).filter(group => group.count > 1);
        
        if (duplicateGroups.length === 0) {
            setInfoModalContent({
                title: "لا توجد تكرارات",
                message: "لم يتم العثور على أي صفوف مكررة بالكامل في مجموعة البيانات الحالية."
            });
            setIsInfoModalOpen(true);
            return;
        }

        const totalDuplicatesToRemove = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0);
        
        setDuplicateRowsInfo({
            groups: duplicateGroups,
            totalDuplicatesToRemove: totalDuplicatesToRemove,
        });
        setIsDuplicatesModalOpen(true);
    };

    const confirmDeleteDuplicates = () => {
        const seen = new Set<string>();
        const newData = data.filter(row => {
            const rowString = JSON.stringify(headers.map(h => row[h] ?? ''));
            if (seen.has(rowString)) {
                return false;
            } else {
                seen.add(rowString);
                return true;
            }
        });

        pushState(newData, headers);

        // Reset related states
        setFilters({});
        setSortConfig(null);
        setStats({});
        setAiResponse(null);
        setSampledData(null);

        setIsDuplicatesModalOpen(false);
    };

    const handleExportDuplicates = () => {
        if (!duplicateRowsInfo) return;

        const duplicateRowStrings = new Set(
            duplicateRowsInfo.groups.map(group => 
                JSON.stringify(headers.map(h => group.row[h] ?? ''))
            )
        );

        const allDuplicateRows = data.filter(row => {
            const rowString = JSON.stringify(headers.map(h => row[h] ?? ''));
            return duplicateRowStrings.has(rowString);
        });

        if (allDuplicateRows.length > 0) {
            const filename = `duplicates_${fileName.replace(/\.[^/.]+$/, "")}`;
            exportToExcel(allDuplicateRows, headers, filename);
        }
        
        setIsDuplicatesModalOpen(false);
    };
    
    const handleConfirmDeleteRow = () => {
        if (!rowToDelete) return;
        
        // Using object reference to find and remove the item.
        // This is safer than index if data is sorted/filtered.
        const newData = data.filter(row => row !== rowToDelete);

        pushState(newData, headers);
        setRowToDelete(null);
    };
    
    const handleApplyPreviewSettings = () => {
        setAppliedPreviewSize(previewSize);
        setAppliedPreviewType(previewType);
    };

    const handlePreviewTypeChange = (type: PreviewType) => {
        setPreviewType(type);
        setAppliedPreviewType(type);
    };


  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'preview', label: 'معاينة وتعديل البيانات', icon: <TableCellsIcon className="w-6 h-6" /> },
    { id: 'stats', label: 'التحليل الإحصائي', icon: <ChartBarSquareIcon className="w-6 h-6" /> },
    { id: 'viz', label: 'تمثيل البيانات', icon: <PresentationChartLineIcon className="w-6 h-6" /> },
    { id: 'ai', label: 'تحليل بالذكاء الاصطناعي', icon: <SparklesIcon className="w-6 h-6" /> },
    { id: 'sampling', label: 'استخراج العينات', icon: <BeakerIcon className="w-6 h-6" /> },
  ];
  
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

  const getCorrelationColor = (value: number | undefined | null) => {
    if (value === null || typeof value === 'undefined') {
        return 'bg-gray-50 text-gray-300';
    }
    const val = value;
    if (val === 1) return 'bg-blue-800 text-white font-bold'; // Diagonal / Perfect
    if (val > 0.7) return 'bg-blue-600 text-white'; // Strong Positive
    if (val > 0.4) return 'bg-blue-400 text-white'; // Medium Positive
    if (val > 0.2) return 'bg-blue-200 text-blue-900'; // Weak Positive
    if (val > -0.2) return 'bg-white text-gray-800 border border-gray-100'; // Neutral
    if (val > -0.4) return 'bg-red-100 text-red-900'; // Weak Negative
    if (val > -0.7) return 'bg-red-300 text-red-900'; // Medium Negative
    return 'bg-red-500 text-white'; // Strong Negative
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className="space-y-4 h-full flex flex-col">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
                <KpiCard title="السجلات المعروضة" value={kpiStats.totalRecords.toLocaleString()} icon={<DatabaseIcon className="w-6 h-6"/>} />
                <KpiCard title="عدد الأعمدة" value={kpiStats.totalColumns} icon={<ColumnsIcon className="w-6 h-6"/>} />
                <KpiCard title="الأعمدة الرقمية" value={kpiStats.numericColumnsCount} icon={<HashIcon className="w-6 h-6"/>} />
                <KpiCard title="القيم المفقودة" value={kpiStats.totalMissingValues.toLocaleString()} icon={<AlertTriangleIcon className="w-6 h-6"/>} />
             </div>
            
            {/* Top Controls Area */}
            <div className="flex flex-col xl:flex-row gap-4 items-end justify-between flex-shrink-0">
                
                {/* Preview Settings Section */}
                <div className="flex flex-col gap-2 w-full xl:w-auto">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 pr-1">
                        <TableCellsIcon className="w-4 h-4 text-blue-500"/>
                        معاينة البيانات
                    </h3>
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 shadow-sm w-fit">
                        {/* Preview Type Buttons */}
                        <div className="inline-flex bg-white rounded-lg shadow-sm border border-gray-200 p-0.5" role="group">
                            <button
                                onClick={() => handlePreviewTypeChange('first')}
                                className={`flex items-center px-3 py-1.5 text-xs font-medium transition-all rounded-r-md ${
                                    previewType === 'first' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <ArrowUpIcon className="w-3 h-3 ml-1.5" />
                                الأول
                            </button>
                            <div className="w-px bg-gray-200 self-stretch my-1"></div>
                            <button
                                onClick={() => handlePreviewTypeChange('last')}
                                className={`flex items-center px-3 py-1.5 text-xs font-medium transition-all ${
                                    previewType === 'last' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <ArrowDownIcon className="w-3 h-3 ml-1.5" />
                                الأخير
                            </button>
                            <div className="w-px bg-gray-200 self-stretch my-1"></div>
                            <button
                                onClick={() => handlePreviewTypeChange('random')}
                                className={`flex items-center px-3 py-1.5 text-xs font-medium transition-all rounded-l-md ${
                                    previewType === 'random' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <ShuffleIcon className="w-3 h-3 ml-1.5" />
                                عشوائي
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                        {/* Count Input */}
                        <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-lg border border-gray-200 shadow-sm h-full">
                             <span className="text-xs font-medium text-gray-600 whitespace-nowrap">عدد الصفوف:</span>
                             <div className="flex items-center border-r border-gray-200 pr-2">
                                <input
                                    type="number"
                                    value={previewSize}
                                    onChange={(e) => setPreviewSize(Math.max(0, parseInt(e.target.value, 10)) || 0)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleApplyPreviewSettings();
                                        }
                                    }}
                                    className="w-12 text-center text-xs outline-none"
                                />
                                <button
                                    onClick={handleApplyPreviewSettings}
                                    className="bg-gray-50 hover:bg-gray-100 p-1.5 rounded-l-md border-r border-gray-200 transition-colors"
                                    title="تطبيق"
                                >
                                    <PlayIcon className="w-3 h-3 text-gray-600" />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2 items-end w-full xl:w-auto">
                     <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                        <button
                            onClick={() => setIsSearchVisible(true)}
                            className={`bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all ${searchQuery ? 'ring-2 ring-blue-500 border-blue-500 text-blue-600 bg-blue-50' : ''}`}
                            title={searchQuery ? "تعديل البحث" : "بحث"}
                        >
                            <SearchIcon className="w-4 h-4"/>
                        </button>
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="تراجع (Undo)"
                        >
                            <UndoIcon className="w-4 h-4"/>
                        </button>
                        
                        <div className="h-8 w-px bg-gray-300 mx-1"></div>

                        <button 
                            onClick={handleFindDuplicates}
                            className="bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all"
                            title="البحث عن الصفوف المكررة"
                        >
                            <CopyIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={requestCleanData} 
                            className="bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all"
                            title="تنظيف البيانات"
                        >
                            <BroomIcon className="w-4 h-4"/>
                        </button>
                        
                        <div className="h-8 w-px bg-gray-300 mx-1"></div>

                        <button 
                            onClick={() => setIsExportModalOpen(true)}
                            className="bg-white border border-gray-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all"
                            title="حفظ البيانات"
                        >
                            <DownloadIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>

             {searchQuery && (
                <div className="text-sm text-gray-600 text-center animate-fadeIn bg-yellow-50 border border-yellow-200 p-2 rounded-lg flex justify-center items-center gap-2">
                    <SearchIcon className="w-4 h-4 text-yellow-600"/>
                    <span>نتائج البحث عن "<span className="font-bold">{searchQuery}</span>": <span className="font-bold">{searchedAndFilteredData.length}</span> سجل</span>
                    <button onClick={handleModalClear} className="text-xs text-blue-600 hover:underline mr-2">مسح البحث</button>
                </div>
            )}
            
            <div className="h-px bg-gray-200 my-1"></div>
            
            <h3 className="text-sm font-semibold text-gray-500 flex-shrink-0">
                جدول البيانات <span className="text-gray-400 font-normal">({previewData.length} من {searchedAndFilteredData.length} سجلات)</span>
            </h3>

            <div className="overflow-auto bg-white rounded-lg shadow border border-gray-200 flex-1 min-h-0">
              <table className="min-w-full text-sm text-right text-gray-800 table-fixed">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b-2 border-gray-200 sticky top-0 z-20 shadow-sm">
                  <tr>
                    {headers.map((header, index) => (
                      <th 
                        key={header} 
                        scope="col" 
                        style={{ 
                            width: columnWidths[header] ? `${columnWidths[header]}px` : '75px', 
                            minWidth: '75px', 
                            maxWidth: columnWidths[header] ? undefined : '75px' 
                        }}
                        className={`px-2 py-2 relative group cursor-grab transition-colors align-top ${dragOverIndex === index ? 'bg-blue-100' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                         <div className="flex flex-col gap-2 h-full w-full">
                            {/* Title Row */}
                            <div className="flex items-center justify-between w-full pb-2 mb-1 border-b border-gray-200/50 cursor-pointer hover:text-blue-600" onClick={() => requestSort(header)}>
                                <span className="font-bold text-gray-800 text-sm truncate block" title={header}>{header}</span>
                                <span className="flex-shrink-0 ml-1">
                                    {sortConfig?.key === header ? (
                                        sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4 text-blue-600" /> : <ArrowDownIcon className="w-4 h-4 text-blue-600" />
                                    ) : <ArrowUpDownIcon className="w-3 h-3 text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />}
                                </span>
                            </div>

                            {/* Icons Row - Organized underneath */}
                            <div className="flex items-center justify-end gap-1 w-full">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === header ? null : header); }}
                                    title={`فلترة عمود ${header}`}
                                    className={`p-1 rounded-md transition-colors ${isFilterActive(header) ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'}`}
                                >
                                    <FilterIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteColumn(header); }}
                                    title={`حذف عمود ${header}`}
                                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, header)}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-400"
                        />
                        {openFilter === header && (
                            <FilterMenu
                                ref={filterMenuRef}
                                column={header}
                                allData={data}
                                currentFilter={filters[header]}
                                isNumeric={isColumnNumeric(header)}
                                onApply={(newFilter) => {
                                    setFilters(prev => {
                                        const newFilters = { ...prev };
                                        if (newFilter) {
                                            newFilters[header] = newFilter;
                                        } else {
                                            delete newFilters[header];
                                        }
                                        return newFilters;
                                    });
                                    setOpenFilter(null);
                                }}
                                onClose={() => setOpenFilter(null)}
                            />
                        )}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-2 text-center sticky right-0 bg-gray-100 z-30 border-l border-gray-300 w-[60px] min-w-[60px]">
                        الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="bg-white border-b hover:bg-blue-50 even:bg-gray-50/50 group">
                      {headers.map((header) => (
                        <td 
                           key={`${rowIndex}-${header}`} 
                           className="px-2 py-2 align-middle truncate border-l border-gray-100 last:border-l-0" 
                           style={{ 
                                width: columnWidths[header] ? `${columnWidths[header]}px` : '75px', 
                                minWidth: '75px', 
                                maxWidth: columnWidths[header] ? undefined : '75px' 
                           }}
                           title={String(row[header])}>
                             {String(row[header])}
                        </td>
                      ))}
                      <td className="px-2 py-2 align-middle text-center sticky right-0 bg-white group-hover:bg-blue-50 border-l border-gray-200 z-10 w-[60px]">
                          <button
                              onClick={() => setRowToDelete(row)}
                              title="حذف الصف"
                              className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                          >
                              <TrashIcon className="w-4 h-4" />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'stats':
         const stat = selectedStatColumn ? stats[selectedStatColumn] : null;
         return (
            <div className="space-y-4 overflow-y-auto h-full pr-2">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <label htmlFor="stat-column-select" className="block text-sm font-semibold text-gray-700 mb-2">
                        اختر عمودًا لعرض تحليله الإحصائي:
                    </label>
                    <select
                        id="stat-column-select"
                        value={selectedStatColumn}
                        onChange={(e) => setSelectedStatColumn(e.target.value)}
                        className="w-full max-w-xs p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        {headers.map(header => (
                            <option key={header} value={header}>
                                {header}
                            </option>
                        ))}
                    </select>
                </div>
                
                {selectedStatColumn && stat ? (
                    <div className="max-w-full mx-auto space-y-4">
                        <div className="p-4 bg-white rounded-lg shadow border-t-4 border-blue-500">
                           <div className="flex flex-wrap justify-between items-start border-b pb-4 mb-4 gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{selectedStatColumn}</h3>
                                    <p className="text-sm text-blue-600">{stat.type === 'numeric' ? 'بيانات رقمية (Quantitative)' : 'بيانات فئوية/نصية (Categorical)'}</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${stat.missingCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {stat.missingCount > 0 ? <XCircleIcon className="w-4 h-4 ml-1"/> : <CheckCircleIcon className="w-4 h-4 ml-1"/>}
                                        بيانات مفقودة: {stat.missingCount}
                                    </div>
                                    {stat.outliers.length > 0 && (
                                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 flex items-center">
                                            <AlertTriangleIcon className="w-4 h-4 ml-1" />
                                            قيم متطرفة: {stat.outliers.length}
                                        </div>
                                    )}
                                </div>
                           </div>

                            {stat.type === 'numeric' && stat.stats && (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px] text-sm text-center">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600">
                                                <th className="p-2 border rounded-tr-md">المتوسط (Mean)</th>
                                                <th className="p-2 border">الوسيط (Median)</th>
                                                <th className="p-2 border">المنوال (Mode)</th>
                                                <th className="p-2 border">الانحراف المعياري (StdDev)</th>
                                                <th className="p-2 border">أقل قيمة (Min)</th>
                                                <th className="p-2 border">أعلى قيمة (Max)</th>
                                                <th className="p-2 border">Q1</th>
                                                <th className="p-2 border">Q3</th>
                                                <th className="p-2 border rounded-tl-md">IQR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="text-gray-800 font-medium">
                                                <td className="p-3 border">{stat.stats.mean.toFixed(2)}</td>
                                                <td className="p-3 border">{stat.stats.median.toFixed(2)}</td>
                                                <td className="p-3 border">{stat.stats.mode.join(', ') || '-'}</td>
                                                <td className="p-3 border">{stat.stats.stdDev.toFixed(2)}</td>
                                                <td className="p-3 border">{stat.stats.min}</td>
                                                <td className="p-3 border">{stat.stats.max}</td>
                                                <td className="p-3 border">{stat.stats.q1}</td>
                                                <td className="p-3 border">{stat.stats.q3}</td>
                                                <td className="p-3 border">{stat.stats.iqr}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {stat.outliers.length > 0 && (
                                 <div className="mt-4 pt-2 border-t bg-orange-50/50 p-2 rounded">
                                     <div className="flex justify-between items-center mb-1">
                                         <h4 className="font-semibold text-orange-800 text-sm">عينة من القيم المتطرفة:</h4>
                                         <button
                                             onClick={() => exportToCSV(stat.outliers, headers, `outliers_${selectedStatColumn}_${fileName}`)}
                                             className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center bg-white px-2 py-1 rounded shadow-sm border border-blue-200"
                                         >
                                             <DownloadIcon className="w-3 h-3 ml-1" />
                                             تصدير القائمة الكاملة
                                         </button>
                                     </div>
                                     <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                                        {stat.outliers.slice(0, 5).map((o, i) => (
                                            <span key={i} className="bg-white border border-orange-200 px-2 py-1 rounded text-orange-800 font-mono">
                                                {String(o[selectedStatColumn])}
                                            </span>
                                        ))}
                                        {stat.outliers.length > 5 && <span className="text-gray-400 self-center">...و {stat.outliers.length - 5} آخرين</span>}
                                     </div>
                                 </div>
                            )}
                        </div>
                    </div>
                ) : headers.length > 0 ? (
                     <div className="p-4 bg-white rounded-lg shadow animate-pulse text-center">جاري تحميل التحليلات...</div>
                ) : (
                    <p className="text-center text-gray-500 py-10">لا توجد أعمدة لعرضها.</p>
                )}

                <div className="mt-6">
                    {correlationMatrix && correlationMatrix.labels.length > 1 ? (
                        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-2">
                                مصفوفة الارتباط (Heatmap)
                            </h3>
                            <div className="overflow-x-auto pb-2">
                                <div className="inline-block min-w-full align-middle">
                                    <div className="text-center text-xs font-semibold">
                                        <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${correlationMatrix.labels.length}, minmax(80px, 1fr))` }}>
                                            {/* Top-left empty cell */}
                                            <div className="sticky top-0 left-0 z-10 bg-white"></div>
                                            {/* Top header */}
                                            {correlationMatrix.labels.map((label, index) => (
                                                <div key={`top-header-${index}`} className="p-2 bg-gray-50 border-b border-gray-200 truncate text-gray-600" title={label}>
                                                    {label}
                                                </div>
                                            ))}

                                            {/* Matrix rows */}
                                            {correlationMatrix.labels.map((rowLabel, rowIndex) => (
                                                <React.Fragment key={`row-${rowIndex}`}>
                                                    {/* Left header */}
                                                    <div className="p-2 bg-gray-50 border-r border-gray-200 sticky left-0 truncate text-gray-600 text-left pl-4" title={rowLabel}>
                                                        {rowLabel}
                                                    </div>
                                                    {/* Data cells */}
                                                    {correlationMatrix.matrix[rowIndex].map((cellValue, colIndex) => (
                                                        <div 
                                                            key={`cell-${rowIndex}-${colIndex}`} 
                                                            className={`p-3 border border-white flex items-center justify-center font-mono transition-colors hover:opacity-80 ${getCorrelationColor(cellValue)}`}
                                                            title={`${rowLabel} vs ${correlationMatrix.labels[colIndex]}: ${cellValue.toFixed(3)}`}
                                                        >
                                                            {cellValue.toFixed(2)}
                                                        </div>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 text-xs text-gray-500 mt-2 px-2">
                                <span className="flex items-center"><span className="w-3 h-3 bg-blue-800 inline-block mr-1 rounded-sm"></span>ارتباط قوي جداً</span>
                                <span className="flex items-center"><span className="w-3 h-3 bg-blue-600 inline-block mr-1 rounded-sm"></span>قوي</span>
                                <span className="flex items-center"><span className="w-3 h-3 bg-blue-400 inline-block mr-1 rounded-sm"></span>متوسط</span>
                                <span className="flex items-center"><span className="w-3 h-3 bg-red-500 inline-block mr-1 rounded-sm"></span>عكسي قوي</span>
                            </div>
                        </div>
                    ) : activeTab === 'stats' && headers.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                            <p>لا يوجد عدد كافٍ من الأعمدة الرقمية (2 على الأقل) لإنشاء خريطة حرارية.</p>
                        </div>
                    )}
                </div>
            </div>
        );
      case 'viz':
          const selectedChart = dashboardCharts.find(c => c.id === selectedChartId);
          return (
              <div className="flex flex-row h-full overflow-hidden">
                  {/* Settings Sidebar - RTL aware: Left visually in this structure but flex-row means it's first */}
                  <div 
                    className={`bg-white border-l border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative no-print`}
                    style={{ width: isSettingsOpen ? `${sidebarWidth}px` : '48px' }}
                  >
                       
                       {isSettingsOpen ? (
                           <>
                               <div className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startSidebarResize}></div>
                               
                               <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                                   <h3 className="font-bold text-gray-800">إعدادات الرسم</h3>
                                   <div className="flex gap-2">
                                       <button onClick={addNewChart} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100" title="إضافة رسم جديد">
                                           <PlusIcon className="w-5 h-5"/>
                                       </button>
                                       <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-200" title="تصغير">
                                           <ChevronRightIcon className="w-5 h-5"/>
                                       </button>
                                   </div>
                               </div>

                               <div className="p-4 overflow-y-auto flex-1 space-y-6">
                                   {selectedChart ? (
                                       <>
                                           <div>
                                              <label className="font-semibold block mb-2 text-sm text-gray-700">نوع الرسم:</label>
                                              <div className="grid grid-cols-6 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                  {[
                                                      { type: 'bar', icon: <BarChartIcon className="w-5 h-5"/>, label: 'أعمدة' },
                                                      { type: 'bar-horizontal', icon: <ChartBarHorizontalIcon className="w-5 h-5"/>, label: 'أفقي' },
                                                      { type: 'line', icon: <LineChartIcon className="w-5 h-5"/>, label: 'خطي (Trend)' },
                                                      { type: 'pie', icon: <PieChartIcon className="w-5 h-5"/>, label: 'دائري' },
                                                      { type: 'donut', icon: <DonutChartIcon className="w-5 h-5"/>, label: 'حلقي' },
                                                      { type: 'ticket', icon: <TicketIcon className="w-5 h-5"/>, label: 'مؤشر (KPI)' },
                                                  ].map((item) => (
                                                       <button
                                                          key={item.type}
                                                          onClick={() => updateChartConfig('type', item.type)}
                                                          title={item.label}
                                                          className={`p-2 rounded transition-all flex justify-center items-center ${
                                                              selectedChart.type === item.type
                                                              ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-400'
                                                              : 'text-gray-500 hover:bg-gray-200'
                                                          }`}
                                                      >
                                                          {item.icon}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>

                                          <div>
                                               <label className="font-semibold block mb-2 text-sm text-gray-700">العنوان:</label>
                                               <input 
                                                    type="text" 
                                                    value={selectedChart.title} 
                                                    onChange={e => updateChartConfig('title', e.target.value)}
                                                    className="w-full p-2 border rounded-md text-sm"
                                               />
                                          </div>

                                          {selectedChart.type !== 'ticket' && (
                                            <div>
                                                <label className="font-semibold block mb-2 text-sm text-gray-700">المحور السيني (X-Axis):</label>
                                                <select value={selectedChart.xCol} onChange={e => updateChartConfig('xCol', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                                                    <option value="" disabled>اختر عمودًا...</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                          )}

                                          <div>
                                              <label className="font-semibold block mb-2 text-sm text-gray-700">
                                                  {selectedChart.type === 'ticket' ? 'العمود (للحساب):' : 'المحور الصادي (Value):'}
                                              </label>
                                              <select value={selectedChart.yCol} onChange={e => updateChartConfig('yCol', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                                                  <option value="">{selectedChart.type === 'ticket' ? 'الكل (عدد السجلات)' : 'بدون (عدد التكرار فقط)'}</option>
                                                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                              </select>
                                          </div>

                                          {selectedChart.yCol && (
                                              <div>
                                                  <label className="font-semibold block mb-2 text-sm text-gray-700">دالة التجميع:</label>
                                                  <select value={selectedChart.agg} onChange={e => updateChartConfig('agg', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                                                      <option value="sum">مجموع (Sum)</option>
                                                      <option value="avg">متوسط (Average)</option>
                                                      <option value="count">عدد (Count)</option>
                                                      <option value="distinct">عد القيم الفريدة (Distinct)</option>
                                                  </select>
                                              </div>
                                          )}
                                          
                                          <div className="pt-4 border-t flex flex-col gap-2">
                                            <button 
                                                onClick={() => handleExportChart(selectedChart.id)} 
                                                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 flex items-center justify-center text-sm"
                                            >
                                                <DownloadIcon className="w-4 h-4 ml-2" />
                                                تصدير كصورة
                                            </button>
                                            <button 
                                                onClick={() => deleteChart(selectedChart.id)} 
                                                className="w-full bg-red-50 text-red-600 py-2 px-4 rounded-md hover:bg-red-100 flex items-center justify-center text-sm"
                                            >
                                                <TrashIcon className="w-4 h-4 ml-2" />
                                                حذف الرسم البياني
                                            </button>
                                          </div>
                                       </>
                                   ) : (
                                       <div className="text-center py-10 text-gray-500">
                                           <p className="mb-4">لم يتم تحديد رسم بياني.</p>
                                           <button 
                                              onClick={addNewChart}
                                              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-full"
                                           >
                                               + إضافة رسم بياني
                                           </button>
                                       </div>
                                   )}
                               </div>
                           </>
                       ) : (
                           <div className="flex flex-col items-center py-4 h-full bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                               <div className="flex flex-col items-center gap-4 mb-6">
                                   <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 p-1 rounded hover:bg-gray-200" title="توسيع">
                                       <ChevronLeftIcon className="w-5 h-5"/>
                                   </button>
                                   <button onClick={addNewChart} className="text-blue-600 p-1 rounded hover:bg-blue-100" title="إضافة رسم جديد">
                                       <PlusIcon className="w-5 h-5"/>
                                   </button>
                               </div>
                               <div 
                                    className="flex-1 flex items-center justify-center"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                   <span className="text-gray-600 font-bold tracking-wider whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                       إعدادات الرسم البياني
                                   </span>
                               </div>
                           </div>
                       )}
                  </div>

                  {/* Dashboard Area */}
                  <div className="flex-1 overflow-auto bg-gray-100 p-6 relative dashboard-container">
                      {/* Dashboard Toolbar */}
                      <div className="absolute top-4 left-6 z-10 no-print">
                            <button
                                onClick={() => setIsDashboardExportOpen(true)}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md shadow-sm text-sm font-medium flex items-center"
                            >
                                <PrinterIcon className="w-4 h-4 ml-2"/>
                                تصدير اللوحة
                            </button>
                      </div>

                      <div className="flex flex-wrap content-start gap-4 pb-20 dashboard-print-wrapper w-full">
                          <style>
                              {`
                                @media print {
                                    @page {
                                        size: ${printOrientation} !important;
                                        margin: 0.5cm;
                                    }
                                    body, #root {
                                        height: auto;
                                        overflow: visible;
                                        background-color: #fff;
                                    }
                                    /* Hide everything by default */
                                    body * {
                                        visibility: hidden;
                                    }
                                    /* Show only dashboard wrapper and its children */
                                    .dashboard-print-wrapper, .dashboard-print-wrapper * {
                                        visibility: visible;
                                    }
                                    .dashboard-print-wrapper {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100% !important;
                                        height: auto !important;
                                        overflow: visible !important;
                                        display: flex;
                                        flex-wrap: wrap;
                                        gap: 20px;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                        background: transparent !important;
                                    }
                                    .dashboard-print-wrapper > div {
                                        break-inside: avoid;
                                        page-break-inside: avoid;
                                        border: 1px solid #ddd;
                                        box-shadow: none;
                                    }
                                    .no-print {
                                        display: none !important;
                                    }
                                }
                              `}
                          </style>
                          {dashboardCharts.map((chart, index) => {
                              const vizData = prepareVizData(chart);
                              const isSelected = selectedChartId === chart.id;
                              const isDragOver = chartDragOverIndex === index;

                              return (
                                  <div 
                                      key={chart.id}
                                      id={`chart-card-${chart.id}`}
                                      className={`
                                        bg-white rounded-lg shadow-sm border-2 relative group flex flex-col max-w-full transition-all duration-200
                                        ${isDragOver ? 'border-blue-500 border-dashed bg-blue-50 ring-2 ring-blue-300 transform scale-[1.02]' : isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'}
                                      `}
                                      style={{ width: `${chart.width}px`, height: `${chart.height}px` }}
                                      onClick={(e) => { e.stopPropagation(); setSelectedChartId(chart.id); if(!isSettingsOpen) setIsSettingsOpen(true); }}
                                      draggable={true}
                                      onDragStart={(e) => handleChartDragStart(e, index)}
                                      onDragEnd={handleChartDragEnd}
                                      onDragOver={(e) => handleChartDragOver(e, index)}
                                      onDrop={(e) => handleChartDrop(e, index)}
                                  >
                                      <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                                          <div 
                                              className="cursor-move p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 chart-drag-handle"
                                              onMouseDown={(e) => e.stopPropagation()} 
                                          >
                                              <GripVerticalIcon className="w-5 h-5" />
                                          </div>
                                          <input 
                                            value={chart.title} 
                                            onChange={(e) => setDashboardCharts(prev => prev.map(c => c.id === chart.id ? {...c, title: e.target.value} : c))}
                                            className="font-bold text-gray-800 bg-transparent border-none focus:ring-0 w-full text-center px-2"
                                          />
                                          <div className="w-6"></div> {/* Spacer for symmetry */}
                                      </div>
                                      {/* Print-only Title */}
                                      <div className="hidden print:block p-3 border-b font-bold text-gray-800 text-center">
                                          {chart.title}
                                      </div>
                                      
                                      <div id={`chart-container-${chart.id}`} className="flex-1 p-2 min-h-0 relative">
                                          {vizData.length > 0 ? (
                                              <ResponsiveContainer width="100%" height="100%">
                                                  {chart.type === 'bar' ? (
                                                      <BarChart data={vizData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                                                          <YAxis tick={false} width={1} />
                                                          <Tooltip />
                                                          <Bar dataKey="value" name={chart.yCol ? `${chart.agg} of ${chart.yCol}` : 'Count'} fill="#3B82F6" radius={[4, 4, 0, 0]}>
                                                              <LabelList dataKey="value" position="top" style={{fontSize: 10}} />
                                                          </Bar>
                                                      </BarChart>
                                                  ) : chart.type === 'bar-horizontal' ? (
                                                        <BarChart layout="vertical" data={vizData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                            <XAxis type="number" tick={{fontSize: 10}} />
                                                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                                                            <Tooltip />
                                                            <Bar dataKey="value" name={chart.yCol ? `${chart.agg} of ${chart.yCol}` : 'Count'} fill="#3B82F6" radius={[0, 4, 4, 0]}>
                                                                <LabelList dataKey="value" position="right" style={{fontSize: 10}} />
                                                            </Bar>
                                                        </BarChart>
                                                  ) : chart.type === 'line' ? (
                                                      <LineChart data={vizData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                                                          <CartesianGrid strokeDasharray="3 3" />
                                                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                                                          <YAxis tick={false} width={1} />
                                                          <Tooltip />
                                                          <Legend />
                                                          <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}}>
                                                              <LabelList dataKey="value" position="top" style={{fontSize: 10}} />
                                                          </Line>
                                                      </LineChart>
                                                  ) : chart.type === 'pie' || chart.type === 'donut' ? (
                                                      <PieChart>
                                                          <Pie 
                                                              data={vizData} 
                                                              dataKey="value" 
                                                              nameKey="name" 
                                                              cx="50%" 
                                                              cy="50%" 
                                                              outerRadius={Math.min(chart.width, chart.height) / 3.5} 
                                                              innerRadius={chart.type === 'donut' ? Math.min(chart.width, chart.height) / 6 : 0}
                                                              fill="#8884d8" 
                                                              label={({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
                                                                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                                  // Simple label logic
                                                                  return `${(percent * 100).toFixed(0)}%`;
                                                              }}
                                                          >
                                                              {vizData.map((entry: any, idx: number) => (
                                                                  <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                              ))}
                                                          </Pie>
                                                          <Tooltip />
                                                          <Legend verticalAlign="bottom" height={36}/>
                                                      </PieChart>
                                                  ) : chart.type === 'ticket' ? (
                                                      <div className="flex flex-col items-center justify-center h-full w-full text-center absolute inset-0">
                                                          <div className="flex flex-col items-center justify-center flex-1">
                                                            <div className="text-4xl font-bold text-blue-600 leading-tight">{vizData[0].value.toLocaleString()}</div>
                                                            <div className="text-gray-500 mt-2 text-sm">{chart.yCol ? `${chart.agg} of ${chart.yCol}` : 'إجمالي السجلات'}</div>
                                                          </div>
                                                      </div>
                                                  ) : null}
                                              </ResponsiveContainer>
                                          ) : (
                                              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                                  No Data
                                              </div>
                                          )}
                                      </div>

                                      {/* Resize Handle */}
                                      <div 
                                        className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize flex items-center justify-center text-gray-500 bg-gray-100 hover:bg-blue-600 hover:text-white transition-all duration-200 z-20 rounded-tr-lg border-t border-r border-gray-200 hover:border-blue-600 shadow-sm no-print"
                                        onMouseDown={(e) => startChartResize(e, chart.id)}
                                        title="تغيير الحجم"
                                      >
                                          <ArrowsPointingOutIcon className="w-5 h-5 transform rotate-90" />
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {/* Empty State / Add First Chart */}
                          {dashboardCharts.length === 0 && (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <ChartBarSquareIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>لا توجد رسوم بيانية. اضغط على علامة (+) في الشريط الجانبي لإضافة رسم جديد.</p>
                                </div>
                             </div>
                          )}
                      </div>
                  </div>
              </div>
          );
      case 'ai':
        return (
             <div className="text-center overflow-y-auto h-full pr-2">
                 <button onClick={handleAiAnalysis} disabled={aiLoading} className="mb-6 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center mx-auto transition-transform transform hover:scale-105">
                     <SparklesIcon className="w-5 h-5 ml-2"/>
                     {aiLoading ? 'جاري التحليل...' : 'بدء التحليل بالذكاء الاصطناعي'}
                 </button>
                 {aiLoading && <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>}
                 {aiError && <p className="text-red-500">{aiError}</p>}
                 {aiResponse && (
                     <div className="text-right bg-white p-6 rounded-lg shadow space-y-8">
                         <div className="prose max-w-none">
                            {aiResponse.text.map((line, index) => {
                                const trimmedLine = line.trim();
                                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                                    return <h3 key={index} className="font-bold text-xl text-gray-800 mt-6 mb-3 border-b pb-2">{trimmedLine.slice(2, -2)}</h3>
                                }
                                return <p key={index} className="text-gray-700 leading-relaxed">{line}</p>
                            })}
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t">
                             {aiResponse.charts.map((chart, index) => (
                                 <div key={index}>
                                     <h3 className="text-center font-semibold mb-4">{chart.title}</h3>
                                     <ResponsiveContainer width="100%" height={300}>
                                        {chart.type === 'bar' ? (
                                             <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                 <XAxis dataKey="name" />
                                                 <YAxis tick={false} width={1} />
                                                 <Tooltip />
                                                 <Legend />
                                                 <Bar dataKey="value" fill="#3B82F6">
                                                     <LabelList dataKey="value" position="top" />
                                                 </Bar>
                                             </BarChart>
                                        ) : chart.type === 'pie' ? (
                                            <PieChart>
                                                <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                                     {chart.data.map((entry: any, idx: number) => <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        ) : null}
                                     </ResponsiveContainer>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
        );
      case 'sampling':
         return (
            <div className="overflow-y-auto h-full pr-2">
                {/* Sampling Content Wrapper */}
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* Collapsible Sampling Settings Sidebar */}
                    <div 
                        className={`bg-white rounded-lg shadow border border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out relative flex flex-col ${isSamplingSettingsOpen ? 'w-full lg:w-80' : 'w-full lg:w-[3cm]'}`}
                    >
                        {/* Toggle Button */}
                        <button 
                            onClick={() => setIsSamplingSettingsOpen(!isSamplingSettingsOpen)}
                            className="absolute top-2 left-2 bg-gray-50 border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-100 z-20"
                            title={isSamplingSettingsOpen ? "تصغير الإعدادات" : "توسيع الإعدادات"}
                        >
                            {isSamplingSettingsOpen ? <ChevronRightIcon className="w-4 h-4 text-gray-600" /> : <ChevronLeftIcon className="w-4 h-4 text-gray-600" />}
                        </button>

                        {isSamplingSettingsOpen ? (
                             <div className="p-4 space-y-6 overflow-y-auto flex-1">
                                <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                    <h4 className="font-semibold text-gray-700 text-sm">الإعدادات المحفوظة</h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto border-t border-b py-2 pr-1">
                                        {Object.keys(savedSamplingConfigs).length > 0 ? (
                                            Object.keys(savedSamplingConfigs).map(name => (
                                                <div 
                                                    key={name} 
                                                    className={`group flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors ${selectedConfigName === name ? 'bg-blue-100 border-r-4 border-blue-500' : 'hover:bg-gray-100'}`}
                                                    onClick={() => setSelectedConfigName(name)}
                                                >
                                                    <span className={`font-medium text-xs truncate ${selectedConfigName === name ? 'text-blue-800' : 'text-gray-700'}`}>{name}</span>
                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setConfigToRename(name); setIsRenameModalOpen(true); }} 
                                                            title={`إعادة تسمية "${name}"`} 
                                                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                                        >
                                                            <PencilIcon className="w-3 h-3"/>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); requestDeleteConfig(name); }} 
                                                            title={`حذف "${name}"`} 
                                                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                                        >
                                                            <TrashIcon className="w-3 h-3"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-xs text-gray-500 py-2">لا توجد إعدادات.</p>
                                        )}
                                    </div>
                                    <button onClick={handleLoadConfig} disabled={!selectedConfigName} className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-md disabled:bg-gray-400 transition-colors">
                                        تطبيق
                                    </button>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">إعدادات العينة</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="font-semibold block mb-1 text-sm">نوع العينة:</label>
                                            <select value={samplingMethod} onChange={e => setSamplingMethod(e.target.value as SamplingMethod)} className="w-full p-2 border rounded-md text-sm">
                                                <option value="random">عشوائية بسيطة</option>
                                                <option value="systematic">عشوائية منتظمة</option>
                                                <option value="stratified">عينة طبقية</option>
                                            </select>
                                        </div>

                                        {samplingMethod === 'random' && (
                                            <div>
                                                <label className="font-semibold block mb-1 text-sm">حجم العينة:</label>
                                                <div className="flex items-center">
                                                    <input type="number" value={sampleSize} onChange={e => setSampleSize(parseInt(e.target.value))} className="w-full p-2 border rounded-md text-sm" />
                                                    <select onChange={e => setIsPercentage(e.target.value === 'percent')} className="p-2 border rounded-md mr-2 bg-gray-100 text-sm">
                                                        <option value="count">عدد</option>
                                                        <option value="percent">%</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        {samplingMethod === 'systematic' && (
                                            <div>
                                                <label className="font-semibold block mb-1 text-sm">استخراج عينة كل:</label>
                                                <div className="flex items-center">
                                                    <input type="number" value={systematicInterval} onChange={e => setSystematicInterval(parseInt(e.target.value))} className="w-full p-2 border rounded-md text-sm" />
                                                    <span className="mr-2 text-sm">سجلات</span>
                                                </div>
                                            </div>
                                        )}
                                        {samplingMethod === 'stratified' && (
                                            <div className="space-y-4">
                                                {stratificationLevels.map((level, index) => (
                                                    <div key={level.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="font-semibold block text-sm">مستوى #{index + 1}</label>
                                                            {stratificationLevels.length > 1 && (
                                                                <button onClick={() => handleRemoveStratificationLevel(level.id)} className="text-red-500 hover:text-red-700">
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <select 
                                                            value={level.column} 
                                                            onChange={e => handleStratificationColumnChange(level.id, e.target.value)} 
                                                            className="w-full p-1.5 border rounded-md text-sm"
                                                        >
                                                            <option value="" disabled>اختر عمودًا...</option>
                                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                                                            {level.columnType === 'categorical' ? (
                                                                <>
                                                                    <div className="flex justify-end mb-2">
                                                                        <button 
                                                                            onClick={() => handleAutoFillCategorical(level.id, 10)}
                                                                            className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100"
                                                                        >
                                                                            تعبئة 10% للكل
                                                                        </button>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {(level.strata as CategoricalStratum[]).map(s => (
                                                                            <div key={s.value} className="grid grid-cols-12 items-center gap-2 p-1.5 border-b last:border-0 border-gray-100">
                                                                                <div className="col-span-5 truncate text-xs font-medium" title={s.value}>
                                                                                    {s.value}
                                                                                </div>
                                                                                <div className="col-span-3 text-xs text-gray-500 text-center bg-gray-50 rounded">
                                                                                    {s.count}
                                                                                </div>
                                                                                <div className="col-span-4">
                                                                                    <input 
                                                                                        type="text" 
                                                                                        placeholder="العينة" 
                                                                                        value={s.sampleSize} 
                                                                                        onChange={e => handleCategoricalStratumSizeChange(level.id, s.value, e.target.value)} 
                                                                                        className={`w-full p-1 border rounded-md text-xs text-center ${s.error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                            <div className="space-y-3 pt-2">
                                                                <NumericStratumRuleCreator onAdd={(op, val) => handleAddNumericRule(level.id, op, val)} />
                                                                
                                                                <div className="space-y-2">
                                                                    {(level.strata as NumericStratum[]).map(s => (
                                                                        <div key={s.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm relative group hover:border-blue-300 transition-colors">
                                                                            <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100">
                                                                                 <div className="font-bold text-gray-800 text-sm truncate pr-6">{s.label}</div>
                                                                                 {s.id !== 'other' && (
                                                                                    <button onClick={() => handleRemoveNumericStratum(level.id, s.id)} className="absolute top-2 left-2 text-gray-400 hover:text-red-500 bg-white rounded-full p-1 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                                                                        <XCircleIcon className="w-4 h-4" />
                                                                                    </button>
                                                                                 )}
                                                                            </div>
                                                                            
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="text-center bg-gray-50 p-1.5 rounded border border-gray-100">
                                                                                    <div className="text-[10px] text-gray-500">العدد المتوفر</div>
                                                                                    <div className="font-bold text-gray-800 text-sm">{s.count}</div>
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    <div className="text-[10px] text-blue-600 mb-0.5">حجم العينة</div>
                                                                                    <input 
                                                                                        type="text" 
                                                                                        placeholder="مثال: 10%" 
                                                                                        value={s.sampleSize} 
                                                                                        onChange={e => handleNumericStratumSizeChange(level.id, s.id, e.target.value)} 
                                                                                        className={`w-full p-1 border rounded-md text-sm text-center ${s.error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} 
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {stratificationLevels.length < 4 && (
                                                    <button onClick={handleAddStratificationLevel} className="w-full text-blue-600 text-xs font-semibold py-1.5 px-3 rounded-lg border-2 border-dashed border-blue-400 hover:bg-blue-50">
                                                        + مستوى تقسيم
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t mt-auto">
                                     <button 
                                        onClick={handleGenerateSample} 
                                        disabled={hasSamplingErrors} 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                                    >
                                        استخراج العينة
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setIsSaveModalOpen(true)} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 text-sm rounded-lg transition-colors">
                                            حفظ
                                        </button>
                                        <button onClick={handleExportConfig} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-3 text-sm rounded-lg transition-colors flex items-center justify-center">
                                            <DownloadIcon className="w-3.5 h-3.5 ml-1"/>
                                            تصدير
                                        </button>
                                    </div>
                                </div>
                             </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center py-10 cursor-pointer hover:bg-gray-50" onClick={() => setIsSamplingSettingsOpen(true)}>
                                 <div className="transform -rotate-90 whitespace-nowrap mt-10 font-bold text-gray-600 tracking-wider">
                                     إعدادات المعاينة
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 bg-white p-6 rounded-lg shadow min-w-0">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">البيانات المستخرجة</h3>
                            {sampledData && sampledData.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSampledUndo}
                                        disabled={sampledHistory.length === 0}
                                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="تراجع"
                                    >
                                        <UndoIcon className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => setIsSampleExportModalOpen(true)}
                                        className="bg-white border border-gray-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 text-gray-600 p-2.5 rounded-lg shadow-sm transition-all"
                                        title="حفظ البيانات"
                                    >
                                        <DownloadIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>
                        {sampledData ? (
                            <div className="overflow-auto max-h-[calc(100vh-250px)] border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                                <table className="w-full text-sm text-right text-gray-800 table-fixed">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {sampledDataHeaders.map(header => (
                                            <th 
                                                key={header} 
                                                scope="col" 
                                                style={{ 
                                                    width: sampledColumnWidths[header] ? `${sampledColumnWidths[header]}px` : '75px', 
                                                    minWidth: '75px', 
                                                    maxWidth: sampledColumnWidths[header] ? undefined : '75px' 
                                                }}
                                                className={`px-2 py-2 relative group cursor-pointer hover:bg-gray-200 transition-colors align-top`}
                                            >
                                                <div className="flex flex-col gap-2 h-full w-full">
                                                    {/* Title Row */}
                                                    <div className="flex items-center justify-between w-full pb-2 mb-1 border-b border-gray-200/50" onClick={() => requestSampledDataSort(header)}>
                                                        <span className="font-bold text-gray-800 text-sm truncate block" title={header}>{header}</span>
                                                        <span className="flex-shrink-0 ml-1">
                                                            {sampledDataSortConfig?.key === header ? (
                                                                sampledDataSortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4 text-blue-600" /> : <ArrowDownIcon className="w-4 h-4 text-blue-600" />
                                                            ) : <ArrowUpDownIcon className="w-3 h-3 text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />}
                                                        </span>
                                                    </div>

                                                    {/* Icons Row - Organized underneath */}
                                                    <div className="flex items-center justify-end gap-1 w-full">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSampledOpenFilter(sampledOpenFilter === header ? null : header); }}
                                                            title={`فلترة عمود ${header}`}
                                                            className={`p-1 rounded-md transition-colors ${sampledFilters[header] ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'}`}
                                                        >
                                                            <FilterIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSampledDataColumn(header); }}
                                                            title={`حذف عمود ${header}`}
                                                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div
                                                  onMouseDown={(e) => handleSampledResizeMouseDown(e, header)}
                                                  className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-400"
                                                />
                                                {sampledOpenFilter === header && (
                                                    <FilterMenu
                                                        ref={filterMenuRef}
                                                        column={header}
                                                        allData={sampledData} // Use base sample data for filter options
                                                        currentFilter={sampledFilters[header]}
                                                        isNumeric={isColumnNumeric(header)}
                                                        onApply={(newFilter) => {
                                                            setSampledFilters(prev => {
                                                                const newFilters = { ...prev };
                                                                if (newFilter) {
                                                                    newFilters[header] = newFilter;
                                                                } else {
                                                                    delete newFilters[header];
                                                                }
                                                                return newFilters;
                                                            });
                                                            setSampledOpenFilter(null);
                                                        }}
                                                        onClose={() => setSampledOpenFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {sortedSampledData.map((row, i) => (
                                            <tr key={i} className="hover:bg-blue-50 even:bg-gray-50/50">
                                                {sampledDataHeaders.map(h => (
                                                    <td 
                                                        key={`${i}-${h}`} 
                                                        className="px-2 py-2 align-middle truncate border-l border-gray-100 last:border-l-0" 
                                                        style={{ 
                                                            width: sampledColumnWidths[h] ? `${sampledColumnWidths[h]}px` : '75px', 
                                                            minWidth: '75px', 
                                                            maxWidth: sampledColumnWidths[h] ? undefined : '75px' 
                                                        }}
                                                        title={String(row[h])}
                                                    >
                                                        {String(row[h])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-3 bg-blue-50 text-center font-semibold text-blue-800 sticky bottom-0 border-t border-blue-200">
                                        صافي عدد العينة المعروضة: {sortedSampledData.length} سجل
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                                <BeakerIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">لم يتم استخراج العينة بعد</p>
                                <p className="text-sm">قم بتحديد إعدادات المعاينة من القائمة الجانبية ثم اضغط على "استخراج العينة"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-row h-full w-full bg-gray-50 text-right overflow-hidden" dir="rtl">
        {/* Sidebar */}
        <aside 
            className={`
                bg-white border-l border-gray-200 flex flex-col flex-shrink-0 
                transition-all duration-300 ease-in-out z-30 shadow-sm
                ${isMainSidebarOpen ? 'w-[200px]' : 'w-[64px]'}
            `}
        >
            <div className="h-14 flex items-center justify-center border-b border-gray-100 mb-2">
                 <button 
                    onClick={() => setIsMainSidebarOpen(!isMainSidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    title={isMainSidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
                 >
                    {isMainSidebarOpen ? <ArrowCircleRightIcon className="w-6 h-6 text-blue-600"/> : <ArrowCircleLeftIcon className="w-6 h-6 text-blue-600"/>} 
                 </button>
            </div>

            <nav className="flex-1 space-y-2 p-2 overflow-y-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        title={!isMainSidebarOpen ? tab.label : ''}
                        className={`
                            w-full flex items-center transition-all duration-200 relative group rounded-xl
                            ${isMainSidebarOpen 
                                ? 'flex-row justify-start px-3 py-3 gap-3' 
                                : 'flex-col justify-center px-1 py-3 gap-1'}
                            ${activeTab === tab.id 
                                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
                        `}
                    >
                        <div className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {tab.icon}
                        </div>
                        
                        {isMainSidebarOpen && (
                            <span className="text-sm font-bold leading-tight animate-fadeIn whitespace-nowrap overflow-hidden text-right">
                                {tab.label}
                            </span>
                        )}
                        
                        {/* Active Indicator Line */}
                        {activeTab === tab.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-l-full"></div>
                        )}
                    </button>
                ))}
            </nav>
            
            <div className="p-2 border-t border-gray-100 mt-auto">
                 <button
                    onClick={() => setIsMainSidebarOpen(!isMainSidebarOpen)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors hover:text-blue-600"
                    title={isMainSidebarOpen ? "تصغير القائمة" : "توسيع القائمة"}
                 >
                     {isMainSidebarOpen ? <ArrowCircleRightIcon className="w-6 h-6"/> : <ArrowCircleLeftIcon className="w-6 h-6"/>}
                 </button>
            </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50 p-4 relative">
             {renderContent()}
        </div>

        {/* Global Modals */}
        <SearchModal isOpen={isSearchVisible} onClose={() => setIsSearchVisible(false)} onSearch={handleModalSearch} onClear={handleModalClear} initialValue={searchInput} />
        <SaveConfigModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveConfig} existingNames={Object.keys(savedSamplingConfigs)} />
        <RenameConfigModal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} onRename={handleRenameConfig} currentName={configToRename} existingNames={Object.keys(savedSamplingConfigs)} />
        <ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteConfig} configName={configToDelete} />
        <CleanDataSelectionModal isOpen={isCleanDataSelectionModalOpen} onClose={() => setIsCleanDataSelectionModalOpen(false)} onConfirm={confirmCleanData} stats={cleanDataStats} />
        <ConfirmDuplicatesModal isOpen={isDuplicatesModalOpen} onClose={() => setIsDuplicatesModalOpen(false)} onConfirmDelete={confirmDeleteDuplicates} onExport={handleExportDuplicates} info={duplicateRowsInfo} headers={headers} />
        <ExportDataModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirmExport={handleConfirmExport} />
        <ExportDataModal isOpen={isSampleExportModalOpen} onClose={() => setIsSampleExportModalOpen(false)} onConfirmExport={handleConfirmSampleExport} />
        <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title={infoModalContent.title} message={infoModalContent.message} />
        <ConfirmRowDeleteModal isOpen={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDeleteRow} rowData={rowToDelete} headers={headers} />
        <DashboardExportPreviewModal isOpen={isDashboardExportOpen} onClose={() => setIsDashboardExportOpen(false)} onPrint={handlePrintDashboard} />

        {/* Chat Assistant */}
        <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-40 transition-transform transform hover:scale-110"
            title="المساعد الذكي"
        >
            <BotIcon className="w-6 h-6" />
        </button>
        <AIChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} data={data} headers={headers} />

    </div>
  );
};

export { DataView };
