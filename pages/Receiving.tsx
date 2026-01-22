import React, { useState, useEffect } from 'react';
import { InventoryItem, ReceivingLog } from '../types';
import { getInventory, saveReceivingLog, addInventoryItem, getCategories, addCategory, removeCategory, updateCategory, getReceivingHistory, updateReceivingLogMetadata, updateReceivingLogItem } from '../services/storageService';
import { Plus, Trash2, CheckCircle, AlertTriangle, X, Settings, List, CalendarClock, Pencil, Check, Clock, Save, RefreshCw, PackagePlus } from 'lucide-react';

const Receiving: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [supplier, setSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
  // Added expirationDate to item state
  const [items, setItems] = useState<{ id: string; qty: number; expirationDate: string }[]>([]);
  const [qcCheck, setQcCheck] = useState({ packagingOk: true, temperatureOk: true, notes: '' });
  const [successMsg, setSuccessMsg] = useState('');
  
  // Recent Logs State
  const [recentLogs, setRecentLogs] = useState<ReceivingLog[]>([]);

  // Modal State for New Item
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [pendingRowIndex, setPendingRowIndex] = useState<number | null>(null);
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    minStock: 5,
    initialQty: 0,
    initialExpirationDate: ''
  });

  // Modal State for Category Management
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Modal State for Editing Log
  const [editingLog, setEditingLog] = useState<ReceivingLog | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    supplier: '',
    invoiceNumber: '',
    packagingOk: true,
    temperatureOk: true,
    notes: ''
  });
  const [itemEdits, setItemEdits] = useState<{ [key: number]: { qty: number; expirationDate: string } }>({});

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setInventory(getInventory());
    const loadedCats = getCategories();
    setCategories(loadedCats);
    // Set default category for new item form if available
    if (loadedCats.length > 0) {
      setNewItemData(prev => ({ ...prev, category: loadedCats[0] }));
    }
    // Load recent history (Top 5)
    setRecentLogs(getReceivingHistory().slice(0, 5));
  };

  const handleAddItem = () => {
    // Default to first item if exists
    const defaultId = inventory.length > 0 ? inventory[0].id : ''; 
    setItems([...items, { id: defaultId, qty: 0, expirationDate: '' }]);
  };

  const updateItemRow = (index: number, field: 'id' | 'qty' | 'expirationDate', value: string | number) => {
    if (field === 'id' && value === 'NEW_ITEM') {
      setPendingRowIndex(index);
      // Reset new item data with a default category if possible
      setNewItemData({ 
        name: '', 
        category: categories.length > 0 ? categories[0] : '', 
        unit: 'kg', 
        minStock: 5,
        initialQty: 0,
        initialExpirationDate: ''
      });
      setIsNewItemModalOpen(true);
      return;
    }

    const newItems = [...items];
    if (field === 'id') newItems[index].id = value as string;
    if (field === 'qty') newItems[index].qty = Number(value);
    if (field === 'expirationDate') newItems[index].expirationDate = value as string;
    setItems(newItems);
  };

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.name || !newItemData.category) return;

    // Create the definition in inventory (starts with 0 stock until receiving is processed)
    const newItem = addInventoryItem({
      name: newItemData.name,
      category: newItemData.category,
      unit: newItemData.unit,
      minStock: newItemData.minStock,
      quantity: 0 
    });

    // Update local inventory state
    const updatedInventory = [...inventory, newItem];
    setInventory(updatedInventory);

    // Update the pending row to select this new item AND fill the values provided
    if (pendingRowIndex !== null) {
      const newItemsRows = [...items];
      newItemsRows[pendingRowIndex].id = newItem.id;
      
      // Auto-fill quantity and expiration if provided in the modal
      if (newItemData.initialQty > 0) {
        newItemsRows[pendingRowIndex].qty = newItemData.initialQty;
      }
      if (newItemData.initialExpirationDate) {
        newItemsRows[pendingRowIndex].expirationDate = newItemData.initialExpirationDate;
      }
      
      setItems(newItemsRows);
    }

    setIsNewItemModalOpen(false);
    setPendingRowIndex(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const updated = addCategory(newCategoryName.trim());
    setCategories(updated);
    setNewCategoryName('');
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const handleSaveCategoryEdit = () => {
    if (editingCategory && editCategoryName.trim()) {
      const updated = updateCategory(editingCategory, editCategoryName.trim());
      setCategories(updated);
      
      // Also update local inventory state to reflect the change immediately in dropdowns
      const updatedInventory = getInventory();
      setInventory(updatedInventory);

      setEditingCategory(null);
      setEditCategoryName('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (window.confirm(`Deseja remover a categoria "${cat}"? Itens existentes manterão esta categoria, mas ela não aparecerá para novos itens.`)) {
      const updated = removeCategory(cat);
      setCategories(updated);
      // Update new item form if current category was deleted
      if (newItemData.category === cat && updated.length > 0) {
        setNewItemData(prev => ({ ...prev, category: updated[0] }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !invoice || items.length === 0 || items.some(i => i.qty <= 0)) {
      alert("Preencha todos os campos obrigatórios e certifique-se que as quantidades são maiores que zero.");
      return;
    }

    const validItems = items.filter(i => i.id && i.id !== 'NEW_ITEM');

    if (validItems.length === 0) {
      alert("Adicione pelo menos um item válido.");
      return;
    }

    const log = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplier,
      invoiceNumber: invoice,
      items: validItems.map(i => {
        const invItem = inventory.find(inv => inv.id === i.id);
        return { 
          itemId: i.id, 
          name: invItem?.name || '?', 
          quantityAdded: i.qty,
          expirationDate: i.expirationDate || undefined
        };
      }),
      qcCheck
    };

    saveReceivingLog(log);
    
    // Reset Form
    setSupplier('');
    setInvoice('');
    setItems([]);
    setQcCheck({ packagingOk: true, temperatureOk: true, notes: '' });
    setSuccessMsg('Recebimento registrado com sucesso!');
    refreshData(); // Updates Recent Logs
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- EDITING EXISTING LOG LOGIC ---

  const handleEditLog = (log: ReceivingLog) => {
    setEditingLog(log);
    setEditForm({
      date: new Date(log.date).toISOString().split('T')[0],
      supplier: log.supplier,
      invoiceNumber: log.invoiceNumber,
      packagingOk: log.qcCheck.packagingOk,
      temperatureOk: log.qcCheck.temperatureOk,
      notes: log.qcCheck.notes || ''
    });

    const edits: any = {};
    log.items.forEach((item, idx) => {
      edits[idx] = { qty: item.quantityAdded, expirationDate: item.expirationDate || '' };
    });
    setItemEdits(edits);
  };

  const handleSaveLogHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLog) {
       updateReceivingLogMetadata(editingLog.id, {
         date: new Date(editForm.date).toISOString(),
         supplier: editForm.supplier,
         invoiceNumber: editForm.invoiceNumber,
         qcCheck: {
           packagingOk: editForm.packagingOk,
           temperatureOk: editForm.temperatureOk,
           notes: editForm.notes
         }
       });
       refreshData();
       alert("Cabeçalho da nota atualizado!");
    }
  };

  const handleUpdateItem = (index: number) => {
    if (!editingLog) return;
    const item = editingLog.items[index];
    const edit = itemEdits[index];
    const diff = edit.qty - item.quantityAdded;

    if (diff !== 0) {
      if (!window.confirm(`Atenção! Você alterou a quantidade de ${item.quantityAdded} para ${edit.qty}.\n\nIsso ajustará o saldo atual do estoque em ${diff > 0 ? '+' : ''}${diff}.\n\nDeseja confirmar?`)) {
        return;
      }
    }

    updateReceivingLogItem(editingLog.id, index, edit.qty, edit.expirationDate);
    refreshData();
    
    // Update local editing log state to reflect changes immediately
    const updatedLogs = getReceivingHistory();
    const updatedLog = updatedLogs.find(l => l.id === editingLog.id);
    if (updatedLog) {
      setEditingLog(updatedLog);
      setItemEdits(prev => ({
        ...prev,
        [index]: { qty: updatedLog.items[index].quantityAdded, expirationDate: updatedLog.items[index].expirationDate || '' }
      }));
    }
  };

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-4xl mx-auto space-y-8">
      
      {/* SECTION: NEW ENTRY FORM */}
      <div>
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Recebimento Fiscal</h1>
            <p className="text-slate-500">Entrada de mercadorias e RDC 216</p>
          </div>
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs flex items-center bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Categorias
          </button>
        </header>

        {successMsg && (
          <div className="p-4 mb-4 text-green-700 bg-green-100 rounded-lg flex items-center animate-fade-in">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <h2 className="font-semibold text-slate-700 border-b pb-2">Dados da Nota</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor</label>
                <input 
                  type="text" 
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:outline-none" 
                  placeholder="Ex: Distribuidora Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nº Nota Fiscal</label>
                <input 
                  type="text" 
                  value={invoice}
                  onChange={e => setInvoice(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:outline-none" 
                  placeholder="Ex: 0012345"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-semibold text-slate-700">Itens</h2>
              <button 
                type="button" 
                onClick={handleAddItem}
                className="flex items-center text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Linha
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex-1 w-full md:w-auto">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5 md:hidden">Produto</label>
                    <select 
                      value={item.id} 
                      onChange={e => updateItemRow(index, 'id', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="" disabled>Selecione um item...</option>
                      {inventory.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                      ))}
                      <option value="NEW_ITEM" className="font-bold text-green-700 bg-green-50">
                        ➕ Cadastrar Novo Item...
                      </option>
                    </select>
                  </div>
                  
                  <div className="w-full md:w-24">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5 md:hidden">Qtd</label>
                    <input 
                      type="number" 
                      value={item.qty}
                      onChange={e => updateItemRow(index, 'qty', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                      placeholder="Qtd"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div className="w-full md:w-36">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5 md:hidden">Validade</label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={item.expirationDate}
                        onChange={e => updateItemRow(index, 'expirationDate', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                      />
                      {!item.expirationDate && (
                        <CalendarClock className="w-4 h-4 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => removeRow(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remover linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm italic mb-2">Nenhum item adicionado à nota.</p>
                  <button type="button" onClick={handleAddItem} className="text-sm text-green-600 font-medium hover:underline">
                    Clique aqui para adicionar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <h2 className="font-semibold text-slate-700 border-b pb-2 flex items-center">
              Controle de Qualidade <span className="text-xs font-normal ml-2 text-slate-500">(RDC 216)</span>
            </h2>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qcCheck.packagingOk} 
                  onChange={e => setQcCheck({...qcCheck, packagingOk: e.target.checked})}
                  className="rounded text-green-600 focus:ring-green-500 w-5 h-5"
                />
                <span className="text-slate-700">Embalagens íntegras e limpas?</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qcCheck.temperatureOk} 
                  onChange={e => setQcCheck({...qcCheck, temperatureOk: e.target.checked})}
                  className="rounded text-green-600 focus:ring-green-500 w-5 h-5"
                />
                <span className="text-slate-700">Temperatura dos perecíveis adequada?</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <input 
                  type="text" 
                  value={qcCheck.notes}
                  onChange={e => setQcCheck({...qcCheck, notes: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" 
                  placeholder="Ocorrências..."
                />
              </div>
            </div>
            {(!qcCheck.packagingOk || !qcCheck.temperatureOk) && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-start animate-pulse">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>Atenção: Recebimento com não-conformidades deve ser avaliado pela Nutricionista.</span>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-all hover:scale-[1.01] active:scale-[0.99] text-lg"
          >
            CONFIRMAR RECEBIMENTO
          </button>
        </form>
      </div>

      {/* SECTION: RECENT ENTRIES (For quick edits) */}
      <div className="border-t border-slate-200 pt-8">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          Últimas Entradas Registradas
        </h3>
        
        <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">Nenhum recebimento recente.</td></tr>
              ) : (
                recentLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                       {new Date(log.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                       {log.supplier} <span className="text-xs text-slate-400 font-normal block">NF: {log.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                          {log.items.slice(0, 3).map((item, i) => (
                             <span key={i} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                               {item.name} ({item.quantityAdded})
                             </span>
                          ))}
                          {log.items.length > 3 && <span className="text-xs text-slate-400">+{log.items.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                       <button 
                         onClick={() => handleEditLog(log)}
                         className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                         title="Editar / Corrigir"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVO ITEM */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Cadastrar Novo Item</h3>
              <button 
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveNewItem} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newItemData.name}
                  onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ex: Detergente, Batata Doce..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select 
                    value={newItemData.category}
                    onChange={e => setNewItemData({...newItemData, category: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                  <select
                    value={newItemData.unit}
                    onChange={e => setNewItemData({...newItemData, unit: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    <option value="kg">Quilo (kg)</option>
                    <option value="L">Litro (L)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="pct">Pacote (pct)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="g">Grama (g)</option>
                    <option value="ml">Mililitro (ml)</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Dados para a Entrada Atual</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                    <input 
                      type="number" 
                      value={newItemData.initialQty}
                      onChange={e => setNewItemData({...newItemData, initialQty: Number(e.target.value)})}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Validade (Lote)</label>
                    <input 
                      type="date"
                      value={newItemData.initialExpirationDate}
                      onChange={e => setNewItemData({...newItemData, initialExpirationDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo (Alerta)</label>
                <input 
                  type="number" 
                  value={newItemData.minStock}
                  onChange={e => setNewItemData({...newItemData, minStock: Number(e.target.value)})}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                  min="0"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition-colors"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE CATEGORIAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <List className="w-5 h-5 text-slate-500" />
                Gerenciar Categorias
              </h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Form to add category */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Nova categoria..."
                  className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button 
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>

              {/* List */}
              <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                 {categories.map(cat => (
                   <div key={cat} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 group">
                     {editingCategory === cat ? (
                       <div className="flex-1 flex gap-2 mr-2">
                         <input 
                            type="text" 
                            value={editCategoryName}
                            onChange={e => setEditCategoryName(e.target.value)}
                            className="flex-1 p-1 px-2 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                         />
                         <button 
                           onClick={handleSaveCategoryEdit}
                           className="text-green-600 hover:bg-green-50 p-1 rounded"
                         >
                            <Check className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => setEditingCategory(null)}
                           className="text-red-500 hover:bg-red-50 p-1 rounded"
                         >
                            <X className="w-4 h-4" />
                         </button>
                       </div>
                     ) : (
                       <>
                        <span className="text-slate-700 text-sm font-medium">{cat}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleStartEditCategory(cat)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                            title="Renomear categoria"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleRemoveCategory(cat)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Remover categoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                       </>
                     )}
                   </div>
                 ))}
                 {categories.length === 0 && (
                   <p className="text-center text-slate-400 text-sm py-4">Nenhuma categoria cadastrada.</p>
                 )}
              </div>
            </div>
            
            <div className="bg-slate-50 px-4 py-3 text-right">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded shadow-sm hover:bg-slate-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RECEIVING LOG (CORRECTION) */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
             <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Corrigir Entrada
                </h3>
                <button 
                  onClick={() => setEditingLog(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="overflow-y-auto p-4 space-y-6">
               {/* Metadata Form */}
               <form onSubmit={handleSaveLogHeader} className="space-y-4 border-b pb-6 border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                        <input 
                          type="date" 
                          value={editForm.date}
                          onChange={e => setEditForm({...editForm, date: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor</label>
                        <input 
                          type="text" 
                          value={editForm.supplier}
                          onChange={e => setEditForm({...editForm, supplier: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NF</label>
                        <input 
                          type="text" 
                          value={editForm.invoiceNumber}
                          onChange={e => setEditForm({...editForm, invoiceNumber: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Conferência (RDC 216)</label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editForm.packagingOk} 
                            onChange={e => setEditForm({...editForm, packagingOk: e.target.checked})}
                            className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">Embalagem</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editForm.temperatureOk} 
                            onChange={e => setEditForm({...editForm, temperatureOk: e.target.checked})}
                            className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">Temperatura</span>
                        </label>
                      </div>
                      <input 
                          type="text"
                          value={editForm.notes}
                          onChange={e => setEditForm({...editForm, notes: e.target.value})}
                          placeholder="Observações de qualidade..."
                          className="w-full mt-2 p-2 text-sm border border-slate-300 rounded focus:outline-none"
                      />
                  </div>

                  <div className="flex justify-end">
                     <button type="submit" className="text-sm text-blue-600 font-medium hover:underline flex items-center">
                       <Save className="w-3 h-3 mr-1" /> Salvar Cabeçalho
                     </button>
                  </div>
               </form>

               {/* Items List */}
               <div>
                 <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                   <PackagePlus className="w-4 h-4" /> Itens da Nota
                 </h4>
                 
                 <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-200 mb-2">
                    <span className="font-bold">Atenção:</span> Alterar a quantidade aqui atualizará automaticamente o saldo atual do estoque.
                 </div>

                 <div className="space-y-2">
                   {editingLog.items.map((item, index) => {
                     const edit = itemEdits[index] || { qty: item.quantityAdded, expirationDate: item.expirationDate || '' };
                     const isChanged = edit.qty !== item.quantityAdded || edit.expirationDate !== (item.expirationDate || '');
                     
                     return (
                       <div key={index} className="flex flex-col md:flex-row items-center gap-2 p-2 border border-slate-100 rounded bg-slate-50">
                         <div className="flex-1 font-medium text-slate-800 text-sm">
                           {item.name}
                         </div>
                         <div className="w-full md:w-24">
                            <label className="text-[10px] text-slate-400 block md:hidden">Qtd</label>
                            <input 
                              type="number"
                              value={edit.qty}
                              onChange={e => setItemEdits({...itemEdits, [index]: { ...edit, qty: Number(e.target.value) }})}
                              className="w-full p-1 border border-slate-300 rounded text-sm text-center"
                            />
                         </div>
                         <div className="w-full md:w-36">
                            <label className="text-[10px] text-slate-400 block md:hidden">Validade</label>
                            <input 
                              type="date"
                              value={edit.expirationDate}
                              onChange={e => setItemEdits({...itemEdits, [index]: { ...edit, expirationDate: e.target.value }})}
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            />
                         </div>
                         <div className="w-full md:w-auto flex justify-end">
                           <button 
                             onClick={() => handleUpdateItem(index)}
                             disabled={!isChanged}
                             className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold ${
                               isChanged 
                               ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                               : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                             }`}
                           >
                             <RefreshCw className="w-3 h-3" /> Atualizar
                           </button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>

             <div className="p-3 bg-slate-50 border-t flex justify-end flex-shrink-0">
               <button 
                  type="button" 
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Fechar
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Receiving;