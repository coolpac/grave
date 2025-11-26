import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Categories from './pages/Categories';
import Banners from './pages/Banners';
import Newsletters from './pages/Newsletters';
import AbandonedCarts from './pages/AbandonedCarts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Determine base path for production
const basename = import.meta.env.PROD ? '/admin' : '';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        basename={basename}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<AdminHome />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/new" element={<ProductForm />} />
                  <Route path="/products/:id/edit" element={<ProductForm />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/banners" element={<Banners />} />
                  <Route path="/newsletters" element={<Newsletters />} />
                  <Route path="/abandoned-carts" element={<AbandonedCarts />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

