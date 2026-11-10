import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f2f8ff] text-[#0b5aa8]">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-[#b8d8ff] py-8 px-6 sm:px-[64px] bg-[#f2f8ff] text-[13px] text-[#5f7288] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-[#0b5aa8]">Appliety</span> — Seu talento. Novos caminhos.
        </div>
        <div className="flex gap-6">
          <span>Oportunidades e talentos conectados</span>
          <span>•</span>
          <span>Plataforma Inteligente de Recrutamento</span>
        </div>
      </footer>
    </div>
  );
};
