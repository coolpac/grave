import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [initData, setInitData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      console.log('📱 Telegram WebApp detected');
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      console.log('📱 Telegram WebApp initData:', window.Telegram.WebApp.initData ? 'present' : 'missing');
      console.log('📱 Telegram WebApp user:', window.Telegram.WebApp.initDataUnsafe?.user);
    } else {
      console.log('⚠️ Telegram WebApp not available (opening in browser?)');
    }

    // Проверяем, есть ли уже токен
    const token = localStorage.getItem('authToken');
    if (token) {
      console.log('✅ Token found in localStorage, navigating to dashboard');
      navigate('/');
      return;
    }

    // Автоматическая авторизация через Telegram WebApp
    if (!autoLoginAttempted && window.Telegram?.WebApp?.initData) {
      console.log('🚀 Starting auto-login with Telegram initData');
      setAutoLoginAttempted(true);
      handleAutoLogin(window.Telegram.WebApp.initData);
    } else if (!autoLoginAttempted) {
      console.log('⏳ Waiting for Telegram WebApp initData...');
      // Даём время Telegram WebApp загрузиться
      const timer = setTimeout(() => {
        if (window.Telegram?.WebApp?.initData && !autoLoginAttempted) {
          console.log('🚀 Retrying auto-login after delay');
          setAutoLoginAttempted(true);
          handleAutoLogin(window.Telegram.WebApp.initData);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [navigate, autoLoginAttempted]);

  const handleAutoLogin = async (telegramInitData: string) => {
    setIsLoading(true);
    console.log('🔐 Auto-login attempt with Telegram initData');
    
    try {
      const response = await api.post('/auth/validate', { initData: telegramInitData });
      console.log('✅ Auth response:', { 
        hasToken: !!(response.data?.accessToken || response.data?.token),
        userRole: response.data?.user?.role,
        userId: response.data?.user?.id,
        telegramId: response.data?.user?.telegramId,
      });
      
      const token = response.data?.accessToken || response.data?.token;
      
      if (token) {
        // Проверяем что пользователь админ
        const user = response.data?.user;
        console.log('👤 User data:', user);
        
        if (user?.role === 'ADMIN') {
          console.log('✅ User is ADMIN, saving token and navigating');
          localStorage.setItem('authToken', token);
          navigate('/');
        } else {
          console.warn('❌ User is not ADMIN, role:', user?.role);
          setError(`Доступ запрещён. Ваша роль: ${user?.role || 'не определена'}. Обратитесь к администратору.`);
        }
      } else {
        console.error('❌ No token in response');
        setError('Токен не получен от сервера');
      }
    } catch (err: any) {
      console.error('❌ Auth error:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        error: err.message,
      });
      
      // Если ошибка - показываем форму для ручного ввода
      if (err.response?.status === 401) {
        setError('Ошибка авторизации: ' + (err.response?.data?.message || 'Неверные данные'));
      } else if (err.response?.status === 403) {
        setError('Доступ запрещён. Вы не являетесь администратором.');
      } else {
        setError(err.response?.data?.message || err.message || 'Ошибка авторизации');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/validate', { initData });
      const token = response.data?.accessToken || response.data?.token;
      
      if (token) {
        // Проверяем что пользователь админ
        const user = response.data?.user;
        if (user?.role === 'ADMIN') {
          localStorage.setItem('authToken', token);
          navigate('/');
        } else {
          setError('Доступ запрещён. Вы не являетесь администратором.');
        }
      } else {
        setError('Токен не получен от сервера');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка авторизации. Проверьте данные.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.1),transparent_70%)]" />
      </div>

      <Card className="glass-strong border-white/20 shadow-2xl max-w-md w-full relative z-10 animate-fade-in">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-lg">
            <Sparkles className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold gradient-text mb-2">
            Вход в админ-панель
          </CardTitle>
          <p className="text-white/60 text-sm font-medium">
            {window.Telegram?.WebApp?.initData 
              ? 'Авторизация через Telegram...' 
              : 'Введите данные для авторизации'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Lock className="h-4 w-4 text-white/60" />
                Telegram InitData
              </label>
              <textarea
                value={initData}
                onChange={(e) => setInitData(e.target.value)}
                placeholder="Вставьте initData из Telegram..."
                className="w-full px-4 py-3 border border-white/20 rounded-xl bg-white/8 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm resize-none min-h-[120px] font-mono text-sm [color-scheme:dark]"
                required
              />
              <p className="text-xs text-white/50">
                {window.Telegram?.WebApp?.initData 
                  ? 'Если вы открыли админку из Telegram, авторизация произойдёт автоматически'
                  : 'Вставьте initData из Telegram или используйте тестовый токен для разработки'}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !initData}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                  Авторизация...
                </>
              ) : (
                <>
                  Войти
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <p className="text-xs text-white/50 mb-2 font-medium">Режим разработки:</p>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/dev-token`);
                    const data = await response.json();
                    if (data.token) {
                      localStorage.setItem('authToken', data.token);
                      navigate('/');
                    } else {
                      setError('Не удалось получить токен');
                    }
                  } catch (err: any) {
                    setError(err.message || 'Ошибка получения dev токена');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full text-white/70 hover:text-white hover:bg-white/10 text-sm border border-white/10"
              >
                {isLoading ? 'Получение токена...' : 'Получить dev токен'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const token = prompt('Введите токен вручную:');
                  if (token) {
                    localStorage.setItem('authToken', token);
                    navigate('/');
                  }
                }}
                className="w-full text-white/50 hover:text-white/70 hover:bg-white/5 text-xs border border-white/5"
              >
                Ввести токен вручную
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

