import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/shared/Navbar';

export const CandidateLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f8ff] text-[#0b5aa8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#0b5aa8] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium text-[15px]">Carregando ambiente do candidato...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'candidato') {
    return <Navigate to="/empresa/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f8ff] text-[#0b5aa8]">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-[#b8d8ff] py-6 px-6 sm:px-[64px] bg-[#f2f8ff] text-[13px] text-[#5f7288] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-[#0b5aa8]">Appliety</span> — Área do Candidato
        </div>
        <p>Seus dados e currículo são mantidos privados e protegidos.</p>
      </footer>
    </div>
  );
};
