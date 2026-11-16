import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isCandidate = user?.role === 'candidato';
  const isCompany = user?.role === 'empresa';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="border-b border-[#b8d8ff] bg-[#f2f8ff] h-[88px] px-6 sm:px-[64px] flex items-center justify-between sticky top-0 z-50">
      {/* Logo */}
      <Link 
        to={isCandidate ? '/candidato/dashboard' : isCompany ? '/empresa/dashboard' : '/'}
        className="font-medium text-[#0b5aa8] text-[28px] sm:text-[34px] tracking-[-1.8px] select-none hover:opacity-90 transition-opacity"
      >
        Appliety
      </Link>

      {/* Nav Links */}
      <nav className="flex items-center gap-4 sm:gap-8 h-full">
        {/* Links públicos */}
        {!user && (
          <>
            <Link
              to="/vagas"
              className={`relative h-[88px] flex items-center justify-center font-normal text-[14px] transition-colors ${
                isActive('/vagas') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] hover:text-[#0b5aa8]'
              }`}
            >
              Buscar vagas
              {isActive('/vagas') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
            <Link
              to="/cadastro"
              className="text-[#0b5aa8] font-normal text-[14px] hover:underline hidden sm:block"
            >
              Para empresas ↗
            </Link>
            <Link
              to="/login"
              className="border border-[#0b5aa8] text-[#0b5aa8] hover:bg-[#e5f0fd] px-[20px] h-[44px] flex items-center rounded-[2px] text-[14px] font-medium transition-colors"
            >
              Entrar
            </Link>
          </>
        )}

        {/* Links do Candidato */}
        {isCandidate && (
          <>
            <Link
              to="/vagas"
              className={`relative h-[88px] hidden md:flex items-center justify-center font-normal text-[14px] transition-colors ${
                location.pathname === '/vagas' ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] hover:text-[#0b5aa8]'
              }`}
            >
              Buscar vagas
              {location.pathname === '/vagas' && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
            <Link
              to="/candidato/candidaturas"
              className={`relative h-[88px] flex items-center justify-center text-[14px] transition-colors ${
                isActive('/candidato/candidaturas') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] font-normal hover:text-[#0b5aa8]'
              }`}
            >
              Minhas candidaturas
              {isActive('/candidato/candidaturas') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
            <Link
              to="/candidato/recomendacoes"
              className={`relative h-[88px] hidden sm:flex items-center justify-center text-[14px] transition-colors ${
                isActive('/candidato/recomendacoes') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] font-normal hover:text-[#0b5aa8]'
              }`}
            >
              Vagas para meu perfil
              {isActive('/candidato/recomendacoes') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
          </>
        )}

        {/* Links da Empresa */}
        {isCompany && (
          <>
            <Link
              to="/empresa/vagas"
              className={`relative h-[88px] flex items-center justify-center text-[14px] transition-colors ${
                isActive('/empresa/vagas') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] font-normal hover:text-[#0b5aa8]'
              }`}
            >
              Painel de vagas
              {isActive('/empresa/vagas') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
            <Link
              to="/empresa/candidaturas"
              className={`relative h-[88px] hidden sm:flex items-center justify-center text-[14px] transition-colors ${
                isActive('/empresa/candidaturas') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] font-normal hover:text-[#0b5aa8]'
              }`}
            >
              Candidaturas
              {isActive('/empresa/candidaturas') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
            <Link
              to="/empresa/candidatos"
              className={`relative h-[88px] hidden md:flex items-center justify-center text-[14px] transition-colors ${
                isActive('/empresa/candidatos') ? 'text-[#0b5aa8] font-bold' : 'text-[#5f7288] font-normal hover:text-[#0b5aa8]'
              }`}
            >
              Matching
              {isActive('/empresa/candidatos') && (
                <div className="absolute bg-[#0b5aa8] bottom-0 h-[2px] left-0 right-0" />
              )}
            </Link>
          </>
        )}

        {/* Botão de Conta com Menu Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="border border-[#0b5aa8] text-[#0b5aa8] hover:bg-[#e5f0fd] h-[44px] px-[18px] flex items-center gap-[12px] rounded-[2px] text-[14px] font-normal transition-colors cursor-pointer select-none"
            >
              <span className="font-medium truncate max-w-[150px]">
                {isCompany ? (company?.name || user.full_name) : user.full_name}
              </span>
              <span className="text-[14px] leading-none transform translate-y-[-1px]">
                {dropdownOpen ? '⌃' : '⌄'}
              </span>
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-[#f8fbff] border border-[#b8d8ff] shadow-lg rounded-[2px] py-2 z-50 text-[14px]"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-[#b8d8ff]/50">
                  <p className="font-medium text-[#0b5aa8] text-[13px] truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[#5f7288] text-[12px] truncate">
                    {user.email}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider text-[#0b5aa8] bg-[#e5f0fd] px-2 py-0.5 rounded-full">
                    {user.role === 'candidato' ? 'Candidato' : 'Empresa'}
                  </span>
                </div>

                {isCandidate && (
                  <>
                    <Link
                      to="/candidato/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] transition-colors"
                    >
                      Painel Geral
                    </Link>
                    <Link
                      to="/candidato/perfil"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] transition-colors"
                    >
                      Editar Perfil
                    </Link>
                    <Link
                      to="/candidato/curriculo"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] transition-colors"
                    >
                      Meu Currículo (PDF)
                    </Link>
                  </>
                )}

                {isCompany && (
                  <>
                    <Link
                      to="/empresa/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] transition-colors"
                    >
                      Visão Geral da Empresa
                    </Link>
                    <Link
                      to="/empresa/perfil"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] transition-colors"
                    >
                      Perfil da Organização
                    </Link>
                    <Link
                      to="/empresa/vagas/nova"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-[#0b5aa8] hover:bg-[#e5f0fd] font-medium transition-colors"
                    >
                      + Publicar Nova Vaga
                    </Link>
                  </>
                )}

                <div className="border-t border-[#b8d8ff]/50 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
