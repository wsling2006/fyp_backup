import '@/app/globals.css';
import ClientProviders from '@/components/ClientProviders';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientProviders>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              <main style={{ flex: 1 }}>{children}</main>
            </div>
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
