import '@/app/globals.css';
import ClientProviders from '@/components/ClientProviders';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ClientProviders>
              <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1 }}>{children}</main>
              </div>
            </ClientProviders>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
