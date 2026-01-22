import React, { useEffect, useState } from 'react';
import { getInventory, getConsumptionHistory, getCategories, updateItemDefinition } from '../services/storageService';
import { InventoryItem, ConsumptionLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import StockStatusBadge from '../components/StockStatusBadge';
import { Pencil, X, Save } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<ConsumptionLog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Edit Modal State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    unit: '',
    minStock: 0
  });

  useEffect(() => {
    refreshData();
    setCategories(getCategories());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const refreshData = () => {
    setInventory(getInventory());
    setHistory(getConsumptionHistory());
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItemDefinition(editingItem.id, {
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        minStock: Number(editForm.minStock)
      });
      refreshData();
      setEditingItem(null);
    }
  };

  // Prepare Data for Charts
  const lowStockItems = inventory.filter(i => i.quantity <= i.minStock);
  
  // Aggregate consumption by date for the last 7 entries
  const consumptionChartData = history.slice(0, 7).reverse().map(log => ({
    date: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    alunos: log.studentCount
  }));

  return (
    <div className="p-4 space-y-6 pb-20 md:pb-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <p className="text-slate-500">Gestão Merenda V6</p>
      </header>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 bg-white rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-slate-500">Total de Itens</h3>
          <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-slate-500">Estoque Crítico</h3>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-slate-500">Refeições Registradas</h3>
          <p className="text-2xl font-bold text-blue-600">{history.length}</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700">Situação do Estoque</h2>
          <span className="text-xs text-slate-500">Visualizando todos os itens</span>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-sm text-left relative">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 bg-slate-50">Item</th>
                <th className="px-4 py-3 text-right bg-slate-50">Saldo</th>
                <th className="px-4 py-3 text-center bg-slate-50">Status</th>
                <th className="px-4 py-3 text-center bg-slate-50 w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>{item.name}</div>
                    <div className="text-xs text-slate-400 font-normal">{item.category}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity.toFixed(1)} {item.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <StockStatusBadge current={item.quantity} min={item.minStock} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => handleEditClick(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar Item"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                 <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum item cadastrado. Vá em "Entrada" para adicionar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inventory Levels */}
        <div className="p-4 bg-white rounded-lg shadow flex flex-col min-w-0">
          <h3 className="mb-4 text-base font-semibold text-slate-700">Níveis de Estoque (Top 5)</h3>
          <div className="w-full h-[300px] min-h-[300px]">
            {inventory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventory.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados de estoque</div>
            )}
          </div>
        </div>

        {/* Student Consumption Trend */}
        <div className="p-4 bg-white rounded-lg shadow flex flex-col min-w-0">
          <h3 className="mb-4 text-base font-semibold text-slate-700">Histórico de Alunos Atendidos</h3>
          <div className="w-full h-[300px] min-h-[300px]">
            {consumptionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alunos" stroke="#3b82f6" strokeWidth={2} name="Alunos" dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados de consumo</div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Editar Item
                </h3>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Item</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                    <select 
                      value={editForm.category}
                      onChange={e => setEditForm({...editForm, category: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidade</label>
                    <select
                      value={editForm.unit}
                      onChange={e => setEditForm({...editForm, unit: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                      <option value="cx">cx</option>
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                    </select>
                 </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estoque Mínimo (Alerta)</label>
                  <input 
                    type="number" 
                    value={editForm.minStock}
                    onChange={e => setEditForm({...editForm, minStock: Number(e.target.value)})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">O item ficará vermelho no painel se o estoque for menor que este valor.</p>
               </div>

               <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar
                  </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;