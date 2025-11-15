import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Image, Mail, ShoppingCart } from 'lucide-react';
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-border">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold">Админ-панель</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
      <div className="flex flex-col w-0 flex-1 md:ml-64">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}





