import React, { useRef } from 'react';
import { clearAllData, exportDatabase, importDatabase } from '../services/storageService';
import { Save, Upload, Trash2, AlertTriangle, Database, ShieldAlert } from 'lucide-react';

const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (window.confirm("PERIGO: Você está prestes a apagar TODOS os dados do sistema (Histórico de Entradas e Saídas).\n\nO estoque retornará ao padrão inicial com quantidade ZERO.\n\nDeseja realmente continuar?")) {
       if (window.confirm("Esta ação é IRREVERSÍVEL.\n\nTodos os registros serão perdidos e o estoque será ZERADO.\n\nTem certeza absoluta?")) {
         clearAllData();
         alert("Sistema resetado. Histórico apagado e estoque zerado.");
         window.location.reload();
       }
    }
  };

  const handleBackup = () => {
    const json = exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_merenda_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Atenção: Restaurar um backup substituirá TODOS os dados atuais.\nDeseja continuar?")) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importDatabase(content)) {
        alert("Dados restaurados com sucesso! A página será recarregada.");
        window.location.reload();
      } else {
        alert("Erro: O arquivo selecionado não é um backup válido ou está corrompido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 pb-20 md:pb-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-8 h-8 text-slate-600" />
          Administração de Dados
        </h1>
        <p className="text-slate-500">Gerencie o banco de dados local do sistema</p>
      </header>

      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Save className="w-5 h-5 text-blue-700" />
          <h2 className="font-bold text-blue-900">Backup e Restauração</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Salve uma cópia segura de todos os seus dados ou restaure de um arquivo anterior.
            Recomendamos fazer backups semanais.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleBackup}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Save className="w-5 h-5" />
              Baixar Backup (JSON)
            </button>
            
            <button 
              onClick={handleRestoreClick}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-4 py-3 rounded-lg font-medium transition-all shadow-sm"
            >
              <Upload className="w-5 h-5" />
              Carregar Backup
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-red-200 overflow-hidden">
        <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-700" />
          <h2 className="font-bold text-red-900">Zona de Perigo</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Ações nesta área são destrutivas. Tenha certeza antes de prosseguir.
          </p>
          
          <button 
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-bold transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            ZERAR ESTOQUE E HISTÓRICO
          </button>
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Isso apagará permanentemente o histórico e restaurará os itens padrão com estoque ZERADO.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;