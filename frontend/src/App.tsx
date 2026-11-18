import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FirstLoginModal } from './components/FirstLoginModal';
import { LoginView } from './views/LoginView';
import { FuncionarioPipeline } from './views/FuncionarioPipeline';
import { AdminDashboard } from './views/AdminDashboard';
import { CreateTaskView } from './views/CreateTaskView';
import { UsersView } from './views/UsersView';
import { WhatsappView } from './views/WhatsappView';
import { InstallPwaPrompt } from './components/InstallPwaPrompt';

const MainLayout: React.FC = () => {
  const { user, token, isLoading, isFirstLoginRequired } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <img
          src="/logo.png"
          alt="TaskGood"
          className="w-16 h-16 rounded-2xl animate-pulse object-contain mb-4"
        />
        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
          Cargando TaskGood...
        </span>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <LoginView />
        <Footer />
      </div>
    );
  }

  // Renderizar la vista correspondiente según el rol y la pestaña activa
  const renderContent = () => {
    if (user.role === UserRole.FUNCIONARIO) {
      return <FuncionarioPipeline />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'create-task':
        return <CreateTaskView onTaskCreated={() => setActiveTab('dashboard')} />;
      case 'my-tasks':
        return <FuncionarioPipeline />;
      case 'users':
        return <UsersView />;
      case 'whatsapp':
        return <WhatsappView />;
      default:
        return <AdminDashboard />;
    }
  };

  if (isFirstLoginRequired) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
        <FirstLoginModal />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 pb-12">{renderContent()}</main>
      <InstallPwaPrompt />
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
