import React, { useState } from 'react';
import { LockIcon, UserIcon, BotIcon } from './icons';

interface LoginProps {
  onLogin: (success: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    // محاكاة لعملية التحقق (يمكن استبدالها بطلب API مستقبلاً)
    setTimeout(() => {
      if (username === 'ICMISTEAM' && password === 'ICMISTEAM_2026') {
        onLogin(true);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-[#0C2B4E] p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <LockIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">IC - Sampling Tool</h2>
          <p className="text-blue-100 mt-2 text-sm">نظام استخراج وتحليل العينات الذكي</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 p-3 text-red-700 text-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 block">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C2B4E] focus:border-transparent outline-none transition-all"
                placeholder="أدخل اسم المستخدم"
                required
              />
              <UserIcon className="absolute top-1/2 right-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400">تجريبي</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 block">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C2B4E] focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
              <LockIcon className="absolute top-1/2 right-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400">تجريبي</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0C2B4E] hover:bg-[#0a1f38] text-white font-bold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center disabled:bg-[#0C2B4E]/80"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        <div className="p-4 bg-gray-50 border-t text-center text-[10px] text-gray-400">
          <p>© جميع الحقوق محفوظة - MY | نظام الرقابة الداخلية الذكي | Ve 1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
