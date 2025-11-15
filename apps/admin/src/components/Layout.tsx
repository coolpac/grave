import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Image, Mail, ShoppingCart, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard },
  { name: 'Товары', href: '/products', icon: Package },
  { name: 'Баннеры', href: '/banners', icon: Image },
  { name: 'Рассылки', href: '/newsletters', icon: Mail },
  { name: 'Брошенные корзины', href: '/abandoned-carts', icon: ShoppingCart },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background relative">
      {/* Premium background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />
      
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 glass-strong transform transition-transform duration-300 ease-in-out md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/5 md:hidden">
            <h1 className="text-xl font-bold gradient-text">Админ-панель</h1>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-white/5 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="hidden md:flex items-center flex-shrink-0 px-4 mb-6">
              <h1 className="text-xl font-bold gradient-text">Админ-панель</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-white/15 text-white shadow-lg shadow-black/30 border border-white/20'
                        : 'text-white/80 hover:bg-white/10 hover:text-white border border-transparent'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 md:ml-64 relative z-10">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 glass px-4 md:hidden backdrop-blur-xl">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-white/5 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold gradient-text">Админ-панель</h1>
        </div>
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}





