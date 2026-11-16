import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { CandidateLayout } from '../layouts/CandidateLayout';
import { CompanyLayout } from '../layouts/CompanyLayout';

// Public Pages
import { Home } from '../pages/public/Home';
import { Login } from '../pages/public/Login';
import { Cadastro } from '../pages/public/Cadastro';
import { Vagas } from '../pages/public/Vagas';
import { DetalhesVaga } from '../pages/public/DetalhesVaga';
import { RecuperarSenha } from '../pages/public/RecuperarSenha';

// Candidate Pages
import { CandidateDashboard } from '../pages/candidate/Dashboard';
import { CandidatePerfil } from '../pages/candidate/Perfil';
import { CandidateCurriculo } from '../pages/candidate/Curriculo';
import { CandidateCandidaturas } from '../pages/candidate/Candidaturas';
import { CandidateRecomendacoes } from '../pages/candidate/Recomendacoes';

// Company Pages
import { CompanyDashboard } from '../pages/company/Dashboard';
import { CompanyPerfil } from '../pages/company/Perfil';
import { CompanyVagas } from '../pages/company/Vagas';
import { CompanyNovaVaga } from '../pages/company/NovaVaga';
import { CompanyCandidatosMatching } from '../pages/company/CandidatosMatching';
import { CompanyCandidaturas } from '../pages/company/Candidaturas';

export const router = createBrowserRouter([
  // Rotas Públicas
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'vagas', element: <Vagas /> },
      { path: 'vagas/:id', element: <DetalhesVaga /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/cadastro',
    element: <Cadastro />,
  },
  {
    path: '/recuperar-senha',
    element: <RecuperarSenha />,
  },

  // Rotas Protegidas — Candidato
  {
    path: '/candidato',
    element: <CandidateLayout />,
    children: [
      { index: true, element: <Navigate to="/candidato/dashboard" replace /> },
      { path: 'dashboard', element: <CandidateDashboard /> },
      { path: 'perfil', element: <CandidatePerfil /> },
      { path: 'curriculo', element: <CandidateCurriculo /> },
      { path: 'candidaturas', element: <CandidateCandidaturas /> },
      { path: 'recomendacoes', element: <CandidateRecomendacoes /> },
    ],
  },

  // Rotas Protegidas — Empresa
  {
    path: '/empresa',
    element: <CompanyLayout />,
    children: [
      { index: true, element: <Navigate to="/empresa/dashboard" replace /> },
      { path: 'dashboard', element: <CompanyDashboard /> },
      { path: 'perfil', element: <CompanyPerfil /> },
      { path: 'vagas', element: <CompanyVagas /> },
      { path: 'vagas/nova', element: <CompanyNovaVaga /> },
      { path: 'vagas/:id', element: <CompanyNovaVaga /> },
      { path: 'candidatos', element: <CompanyCandidatosMatching /> },
      { path: 'candidaturas', element: <CompanyCandidaturas /> },
    ],
  },

  // Fallback 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
