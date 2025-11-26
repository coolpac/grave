import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, Image, Mail, ShoppingCart, Menu, X, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard },
  { name: 'Категории', href: '/categories', icon: FolderTree },
  { name: 'Товары', href: '/products', icon: Package },
  { name: 'Баннеры', href: '/banners', icon: Image },
  { name: 'Рассылки', href: '/newsletters', icon: Mail },
  { name: 'Брошенные корзины', href: '/abandoned-carts', icon: ShoppingCart },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Premium Animated Background 2025 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_70%)]" />
        {/* Animated grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Premium Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 glass-strong transform transition-transform duration-300 ease-out md:translate-x-0',
          'border-r border-white/10',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand Section */}
          <div className="flex items-center justify-between px-6 h-20 border-b border-white/10 md:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
              <h1 className="text-xl font-bold gradient-text">Админ-панель</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="hidden md:flex items-center px-6 h-20 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 shadow-lg">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Админ-панель</h1>
                <p className="text-xs text-white/50 font-medium">Premium Dashboard</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto">
            <div className="space-y-1.5">
              {navigation.map((item, index) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative',
                      'animate-fade-in',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg shadow-blue-500/10 border border-white/20'
                        : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
                    )}
                    <item.icon
                      className={clsx(
                        'h-5 w-5 flex-shrink-0 transition-transform',
                        isActive 
                          ? 'text-blue-400' 
                          : 'text-white/60 group-hover:text-white group-hover:scale-110'
                      )}
                    />
                    <span className="font-semibold">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="px-4 py-3 rounded-xl glass-subtle border border-white/5">
              <p className="text-xs text-white/50 font-medium">Версия 2.0</p>
              <p className="text-xs text-white/30 mt-1">Premium Edition</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col w-0 flex-1 md:ml-72 relative z-10">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 glass backdrop-blur-xl md:hidden px-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <h1 className="text-lg font-bold gradient-text">Админ-панель</h1>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
