import React from 'react';
import { NavLink } from 'react-router-dom';
import { PackagePlus, Calculator, Bot, LayoutDashboard, History, Settings } from 'lucide-react';

const Navigation: React.FC = () => {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full text-xs md:text-sm font-medium transition-colors ${
      isActive ? 'text-green-700 bg-green-50 border-t-2 border-green-700 md:border-t-0 md:border-r-4 md:bg-transparent' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <>
      {/* MOBILE TOP HEADER: Visible only on small screens */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-40 flex items-center px-4 shadow-sm justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-slate-200 p-0.5 overflow-hidden bg-white shadow-sm flex-shrink-0">
            <img 
              src="AIRAM.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback se a imagem não carregar
                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Escola+Airam&background=0D8ABC&color=fff&size=128';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 uppercase leading-tight">Escola de Cidadania</span>
            <span className="text-xs text-slate-500 font-medium">Airam Veras</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION BAR: Bottom on Mobile, Sidebar on Desktop */}
      <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:relative md:h-screen md:w-28 md:flex-col md:border-r md:border-t-0 md:justify-start md:shadow-none">
        
        {/* DESKTOP LOGO SECTION: Hidden on mobile */}
        <div className="hidden md:flex flex-col items-center justify-center py-6 border-b border-slate-100 w-full bg-white mb-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 p-1 bg-white mb-2 shadow-sm transition-transform hover:scale-105">
            <img 
              src="AIRAM.jpg" 
              alt="Escola Airam Veras" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Escola+Airam&background=0D8ABC&color=fff&size=128';
              }}
            />
          </div>
          <div className="text-center leading-tight px-1">
            <span className="block text-[11px] font-bold text-slate-700 uppercase">Escola de</span>
            <span className="block text-[11px] font-bold text-slate-700 uppercase">Cidadania</span>
            <span className="block text-[10px] text-slate-500 mt-1">Airam Veras</span>
          </div>
        </div>

        <div className="flex w-full h-full md:flex-col md:h-auto md:gap-2 md:mt-2">
          <NavLink to="/" className={getLinkClass}>
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span>Painel</span>
          </NavLink>
          <NavLink to="/receiving" className={getLinkClass}>
            <PackagePlus className="w-6 h-6 mb-1" />
            <span>Entrada</span>
          </NavLink>
          <NavLink to="/planning" className={getLinkClass}>
            <Calculator className="w-6 h-6 mb-1" />
            <span>Consumo</span>
          </NavLink>
          <NavLink to="/history" className={getLinkClass}>
            <History className="w-6 h-6 mb-1" />
            <span>Histórico</span>
          </NavLink>
          <NavLink to="/assistant" className={getLinkClass}>
            <Bot className="w-6 h-6 mb-1" />
            <span>Nutri IA</span>
          </NavLink>
          <NavLink to="/settings" className={getLinkClass}>
            <Settings className="w-6 h-6 mb-1" />
            <span>Config</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default Navigation;