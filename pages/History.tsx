import React, { useState, useEffect } from 'react';
import { ConsumptionLog, ReceivingLog, InventoryItem, Segmento } from '../types';
import { getConsumptionHistory, getReceivingHistory, getInventory, updateReceivingLogMetadata, updateReceivingLogItem } from '../services/storageService';
import { Calendar, Filter, FileText, Search, Download, Users, PackagePlus, BarChart3, TrendingDown, TrendingUp, Truck, AlertTriangle, CalendarClock, Pencil, X, Save, RefreshCw } from 'lucide-react';

type TabType = 'consumption' | 'receiving' | 'balance' | 'suppliers' | 'expiration';

interface BalanceRow {
  itemId: string;
  name: string;
  unit: string;
  initialStock: number;
  totalIn: number;
  totalOut: number;
  currentStock: number;
}

interface ExpirationRow {
  itemId: string;
  name: string;
  supplier: string;
  dateIn: string;
  dateExp: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'ok';
}

const History: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('consumption');
  
  // Data State
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);
  const [receivingLogs, setReceivingLogs] = useState<ReceivingLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Filtered State
  const [filteredConsumption, setFilteredConsumption] = useState<ConsumptionLog[]>([]);
  const [filteredReceiving, setFilteredReceiving] = useState<ReceivingLog[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceRow[]>([]);
  
  // New States for Features
  const [supplierData, setSupplierData] = useState<ReceivingLog[]>([]); // To group by supplier
  const [expirationData, setExpirationData] = useState<ExpirationRow[]>([]);

  // Filters Inputs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(''); // For Supplier Filter

  // Editing State (Receiving Log)
  const [editingLog, setEditingLog] = useState<ReceivingLog | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    supplier: '',
    invoiceNumber: '',
    packagingOk: true,
    temperatureOk: true,
    notes: ''
  });
  
  // Editing Items within Log
  const [itemEdits, setItemEdits] = useState<{ [key: number]: { qty: number; expirationDate: string } }>({});

  // Initial Data Load
  useEffect(() => {
    refreshData();
    // Default filters to current month
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const refreshData = () => {
    setConsumptionLogs(getConsumptionHistory());
    setReceivingLogs(getReceivingHistory());
    setInventory(getInventory());
  };

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

    // Initialize item edits state
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
       // Don't close modal, just show feedback or simple update
       alert("Dados da nota atualizados!");
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
    
    // Update local editing log state to reflect changes immediately without closing
    const updatedLogs = getReceivingHistory(); // Fetch fresh
    const updatedLog = updatedLogs.find(l => l.id === editingLog.id);
    if (updatedLog) {
      setEditingLog(updatedLog);
      // Re-init edits for this row specifically or all
      setItemEdits(prev => ({
        ...prev,
        [index]: { qty: updatedLog.items[index].quantityAdded, expirationDate: updatedLog.items[index].expirationDate || '' }
      }));
    }
  };

  // Filter Logic
  useEffect(() => {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date(8640000000000000);
    end.setHours(23, 59, 59, 999);

    // 1. Filter Consumption
    const fConsumption = consumptionLogs.filter(log => {
      const logDate = new Date(log.date);
      const matchesDate = logDate >= start && logDate <= end;
      const matchesSegment = segmentFilter ? log.segment === segmentFilter : true;
      const matchesSearch = searchTerm 
        ? log.menuName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          log.consumedItems.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      return matchesDate && matchesSegment && matchesSearch;
    });
    setFilteredConsumption(fConsumption);

    // 2. Filter Receiving (Generic)
    const fReceiving = receivingLogs.filter(log => {
      const logDate = new Date(log.date);
      const matchesDate = logDate >= start && logDate <= end;
      const matchesSearch = searchTerm
        ? log.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.invoiceNumber.includes(searchTerm) ||
          log.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      return matchesDate && matchesSearch;
    });
    setFilteredReceiving(fReceiving);

    // 3. Supplier Report Logic
    let sData = receivingLogs.filter(log => {
      // Apply date filter for suppliers too
      const logDate = new Date(log.date);
      return logDate >= start && logDate <= end;
    });
    if (selectedSupplier) {
      sData = sData.filter(log => log.supplier === selectedSupplier);
    }
    setSupplierData(sData);

    // 4. Expiration Alarm Logic
    const today = new Date();
    const flatExpiration: ExpirationRow[] = [];
    
    // Look back 6 months for relevant batches to show validity
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    receivingLogs.forEach(log => {
      if (new Date(log.date) < sixMonthsAgo) return; // Skip very old logs

      log.items.forEach(item => {
        if (item.expirationDate) {
          const expDate = new Date(item.expirationDate);
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let status: 'expired' | 'critical' | 'ok' = 'ok';
          if (diffDays < 0) status = 'expired';
          else if (diffDays <= 30) status = 'critical';

          flatExpiration.push({
            itemId: item.itemId,
            name: item.name,
            supplier: log.supplier,
            dateIn: log.date,
            dateExp: item.expirationDate,
            daysRemaining: diffDays,
            status
          });
        }
      });
    });
    // Sort: Expired first, then Critical, then OK
    flatExpiration.sort((a, b) => a.daysRemaining - b.daysRemaining);
    setExpirationData(flatExpiration);

    // 5. Calculate Balance (Inventory Flow) - OPTIMIZED O(N)
    // Map to store aggregated data for each item
    const itemStats = new Map<string, { inSinceStart: number, outSinceStart: number, inPeriod: number, outPeriod: number }>();
    
    // Helper to get or init stats
    const getStats = (id: string) => {
      if (!itemStats.has(id)) itemStats.set(id, { inSinceStart: 0, outSinceStart: 0, inPeriod: 0, outPeriod: 0 });
      return itemStats.get(id)!;
    };

    // Single pass through Receiving Logs
    receivingLogs.forEach(log => {
      const logDate = new Date(log.date);
      const isAfterStart = logDate >= start;
      const isInPeriod = isAfterStart && logDate <= end;
      
      if (isAfterStart) {
        log.items.forEach(item => {
          const stats = getStats(item.itemId);
          stats.inSinceStart += item.quantityAdded;
          if (isInPeriod) stats.inPeriod += item.quantityAdded;
        });
      }
    });

    // Single pass through Consumption Logs
    consumptionLogs.forEach(log => {
      const logDate = new Date(log.date);
      const isAfterStart = logDate >= start;
      const isInPeriod = isAfterStart && logDate <= end;

      if (isAfterStart) {
        log.consumedItems.forEach(item => {
          const stats = getStats(item.itemId);
          stats.outSinceStart += item.quantityConsumed;
          if (isInPeriod) stats.outPeriod += item.quantityConsumed;
        });
      }
    });

    // Generate Rows
    const balanceRows: BalanceRow[] = inventory.map(item => {
      const stats = itemStats.get(item.id) || { inSinceStart: 0, outSinceStart: 0, inPeriod: 0, outPeriod: 0 };
      
      // Initial Stock Calculation (Reverse Engineering from Current Stock)
      // Current Stock = Initial Stock + In(SinceStart) - Out(SinceStart)
      // Therefore: Initial Stock = Current Stock - In(SinceStart) + Out(SinceStart)
      const initialStock = item.quantity - stats.inSinceStart + stats.outSinceStart;

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        initialStock: Math.max(0, initialStock), // Avoid negative float precision errors
        totalIn: stats.inPeriod,
        totalOut: stats.outPeriod,
        currentStock: item.quantity
      };
    });

    const finalBalance = searchTerm 
      ? balanceRows.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : balanceRows;

    setBalanceData(finalBalance);

  }, [startDate, endDate, segmentFilter, searchTerm, selectedSupplier, consumptionLogs, receivingLogs, inventory]);

  const uniqueSuppliers = Array.from(new Set(receivingLogs.map(l => l.supplier))).sort();

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[] = [];
    let filename = '';

    if (activeTab === 'consumption') {
      headers = ['Data', 'Segmento', 'Cardápio', 'Alunos', 'Itens'];
      rows = filteredConsumption.map(log => [
        new Date(log.date).toLocaleDateString('pt-BR'),
        log.segment,
        `"${log.menuName}"`,
        log.studentCount.toString(),
        `"${log.consumedItems.map(i => `${i.name} (${i.quantityConsumed})`).join(', ')}"`
      ].join(','));
      filename = 'historico_consumo';
    } else if (activeTab === 'receiving') {
      headers = ['Data', 'Fornecedor', 'NF', 'Itens', 'QC'];
      rows = filteredReceiving.map(log => [
        new Date(log.date).toLocaleDateString('pt-BR'),
        `"${log.supplier}"`,
        log.invoiceNumber,
        `"${log.items.map(i => `${i.name} (${i.quantityAdded}) ${i.expirationDate ? `[Val: ${new Date(i.expirationDate).toLocaleDateString('pt-BR')}]` : ''}`).join(', ')}"`,
        log.qcCheck.packagingOk && log.qcCheck.temperatureOk ? 'OK' : 'Irregular'
      ].join(','));
      filename = 'historico_entradas';
    } else if (activeTab === 'balance') {
      headers = ['Item', 'Unidade', 'Estoque Inicial (Período)', 'Entradas', 'Saídas', 'Estoque Atual'];
      rows = balanceData.map(r => [
        `"${r.name}"`,
        r.unit,
        r.initialStock.toFixed(2),
        r.totalIn.toFixed(2),
        r.totalOut.toFixed(2),
        r.currentStock.toFixed(2)
      ].join(','));
      filename = 'balanco_estoque';
    } else if (activeTab === 'suppliers') {
      headers = ['Fornecedor', 'Data', 'NF', 'Item', 'Quantidade', 'Validade'];
      supplierData.forEach(log => {
        log.items.forEach(item => {
          rows.push([
            `"${log.supplier}"`,
            new Date(log.date).toLocaleDateString('pt-BR'),
            log.invoiceNumber,
            `"${item.name}"`,
            item.quantityAdded.toString(),
            item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('pt-BR') : '-'
          ].join(','))
        })
      });
      filename = 'relatorio_itens_detalhado';
    } else if (activeTab === 'expiration') {
      headers = ['Item', 'Fornecedor', 'Entrada', 'Validade', 'Dias Restantes', 'Status'];
      rows = expirationData.map(r => [
        `"${r.name}"`,
        `"${r.supplier}"`,
        new Date(r.dateIn).toLocaleDateString('pt-BR'),
        new Date(r.dateExp).toLocaleDateString('pt-BR'),
        r.daysRemaining.toString(),
        r.status
      ].join(','));
      filename = 'relatorio_validade';
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${filename}_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios e Histórico</h1>
          <p className="text-slate-500">Controle total de movimentações, fornecedores e validades</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button onClick={() => setActiveTab('consumption')} className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'consumption' ? 'bg-white text-blue-700 border border-b-0 border-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
          <TrendingDown className="w-4 h-4" /> Saídas (Consumo)
        </button>
        <button onClick={() => setActiveTab('receiving')} className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'receiving' ? 'bg-white text-green-700 border border-b-0 border-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
          <PackagePlus className="w-4 h-4" /> Entradas (NF)
        </button>
        <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'suppliers' ? 'bg-white text-orange-700 border border-b-0 border-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
          <Truck className="w-4 h-4" /> Itens Recebidos (Detalhado)
        </button>
        <button onClick={() => setActiveTab('balance')} className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'balance' ? 'bg-white text-purple-700 border border-b-0 border-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
          <BarChart3 className="w-4 h-4" /> Balanço Estoque
        </button>
        <button onClick={() => setActiveTab('expiration')} className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'expiration' ? 'bg-white text-red-700 border border-b-0 border-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
          <CalendarClock className="w-4 h-4" /> Alarme Validade
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg rounded-tl-none shadow border border-slate-100">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold border-b pb-2">
          <Filter className="w-4 h-4" />
          Filtros {activeTab === 'expiration' && <span className="text-xs font-normal text-slate-400 ml-2">(Não aplicável para aba Validade)</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500"
              disabled={activeTab === 'expiration'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Fim</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500"
              disabled={activeTab === 'expiration'}
            />
          </div>
          
          {/* Dynamic Filter */}
          {activeTab === 'suppliers' ? (
             <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Filtrar Fornecedor</label>
               <select 
                 value={selectedSupplier}
                 onChange={e => setSelectedSupplier(e.target.value)}
                 className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white"
               >
                 <option value="">Todos os Fornecedores</option>
                 {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
             </div>
          ) : activeTab === 'consumption' ? (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Segmento</label>
              <select 
                value={segmentFilter}
                onChange={e => setSegmentFilter(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white"
              >
                <option value="">Todos</option>
                {Object.values(Segmento).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <div className="hidden md:block"></div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Buscar Texto</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Item, Nota ou Menu..."
                className="w-full p-2 pl-8 border border-slate-300 rounded text-sm outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 
            {activeTab === 'consumption' && 'Registros de Saída'}
            {activeTab === 'receiving' && 'Entradas Fiscais (Resumo)'}
            {activeTab === 'balance' && 'Fluxo de Estoque'}
            {activeTab === 'suppliers' && 'Detalhado: Itens, Validade e Fornecedor'}
            {activeTab === 'expiration' && 'Monitoramento de Validade (Lotes)'}
          </h2>
          <button 
            onClick={exportCSV}
            className="text-xs flex items-center text-green-700 hover:text-green-800 font-medium transition-colors"
          >
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {/* TABLE: CONSUMPTION */}
          {activeTab === 'consumption' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Segmento</th>
                  <th className="px-4 py-3">Cardápio</th>
                  <th className="px-4 py-3 text-center">Alunos</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumption.length === 0 ? (
                   <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  filteredConsumption.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{new Date(log.date).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-slate-400">{new Date(log.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{log.segment}</span></td>
                      <td className="px-4 py-3 text-slate-700">{log.menuName}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{log.studentCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                         {log.consumedItems.map(i => `${i.name}: ${i.quantityConsumed.toFixed(2)}`).join(' | ')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABLE: RECEIVING */}
          {activeTab === 'receiving' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Data Entrada</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Nota Fiscal</th>
                  <th className="px-4 py-3">Itens Recebidos</th>
                  <th className="px-4 py-3 text-center">RDC 216</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReceiving.length === 0 ? (
                   <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  filteredReceiving.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{new Date(log.date).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{log.supplier}</td>
                      <td className="px-4 py-3 text-slate-600">{log.invoiceNumber}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {log.items.map((i, idx) => (
                            <span key={idx} className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 flex items-center">
                              {i.name}: <b>{i.quantityAdded}</b>
                              {i.expirationDate && (
                                <span className="ml-1 text-[10px] text-green-600 bg-white px-1 rounded border border-green-200">
                                   Val: {new Date(i.expirationDate).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.qcCheck.packagingOk && log.qcCheck.temperatureOk ? (
                          <span className="text-green-600 font-bold text-xs">OK</span>
                        ) : (
                          <span className="text-red-600 font-bold text-xs cursor-help" title={log.qcCheck.notes}>⚠️ Ver Obs</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => handleEditLog(log)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar Nota"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABLE: SUPPLIERS (DETAILED ITEMS) */}
          {activeTab === 'suppliers' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Nota Fiscal</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Item Entregue</th>
                  <th className="px-4 py-3 text-right">Quantidade</th>
                  <th className="px-4 py-3 text-center">Validade (Lote)</th>
                </tr>
              </thead>
              <tbody>
                {supplierData.length === 0 ? (
                   <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro para o período/fornecedor selecionado.</td></tr>
                ) : (
                  supplierData.flatMap(log => 
                    log.items.map((item, idx) => ({ ...item, log, uniqueKey: `${log.id}-${idx}` }))
                  ).map((row) => (
                    <tr key={row.uniqueKey} className="border-b border-slate-100 hover:bg-slate-50">
                       <td className="px-4 py-3 font-bold text-slate-700">{row.log.supplier}</td>
                       <td className="px-4 py-3 text-slate-600 font-mono text-xs">{row.log.invoiceNumber}</td>
                       <td className="px-4 py-3 text-slate-500">{new Date(row.log.date).toLocaleDateString('pt-BR')}</td>
                       <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                       <td className="px-4 py-3 text-right font-bold text-green-700">{row.quantityAdded}</td>
                       <td className="px-4 py-3 text-center text-xs text-slate-500">
                         {row.expirationDate ? new Date(row.expirationDate).toLocaleDateString('pt-BR') : '-'}
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABLE: EXPIRATION (ALARM) */}
          {activeTab === 'expiration' && (
             <div className="flex flex-col">
               {expirationData.some(d => d.status === 'expired') && (
                 <div className="bg-red-100 p-3 text-red-800 font-bold text-center border-b border-red-200 flex items-center justify-center animate-pulse">
                   <AlertTriangle className="w-5 h-5 mr-2" />
                   ATENÇÃO: Existem itens vencidos no histórico de recebimento recente!
                 </div>
               )}
               <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Data Entrada</th>
                    <th className="px-4 py-3">Data Validade</th>
                    <th className="px-4 py-3 text-center">Dias Restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {expirationData.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum lote com data de validade cadastrada nos últimos 6 meses.</td></tr>
                  ) : (
                    expirationData.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${row.status === 'expired' ? 'bg-red-50' : row.status === 'critical' ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'expired' && <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">VENCIDO</span>}
                          {row.status === 'critical' && <span className="px-2 py-1 bg-amber-500 text-white rounded text-xs font-bold">CRÍTICO</span>}
                          {row.status === 'ok' && <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">OK</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{row.supplier}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(row.dateIn).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 font-mono font-medium">{new Date(row.dateExp).toLocaleDateString('pt-BR')}</td>
                        <td className={`px-4 py-3 text-center font-bold ${row.daysRemaining < 0 ? 'text-red-600' : row.daysRemaining < 30 ? 'text-amber-600' : 'text-green-600'}`}>
                          {row.daysRemaining} dias
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE: BALANCE (STOCK FLOW) */}
          {activeTab === 'balance' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-center bg-slate-100 border-r border-slate-200">Estoque Inicial<br/><span className="text-[10px] normal-case">(Data Início)</span></th>
                  <th className="px-4 py-3 text-center text-green-700 bg-green-50 border-r border-green-100">Entradas<br/><span className="text-[10px] normal-case">(No Período)</span></th>
                  <th className="px-4 py-3 text-center text-red-700 bg-red-50 border-r border-red-100">Saídas<br/><span className="text-[10px] normal-case">(No Período)</span></th>
                  <th className="px-4 py-3 text-center font-bold bg-slate-100">Estoque Atual<br/><span className="text-[10px] normal-case font-normal">(Hoje)</span></th>
                </tr>
              </thead>
              <tbody>
                {balanceData.map((row) => (
                  <tr key={row.itemId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.name} <span className="text-xs text-slate-400 font-normal">({row.unit})</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 bg-slate-50/50 border-r border-slate-100">
                      {row.initialStock.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium bg-green-50/30 border-r border-green-50">
                      {row.totalIn > 0 ? `+${row.totalIn.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-red-700 font-medium bg-red-50/30 border-r border-red-50">
                      {row.totalOut > 0 ? `-${row.totalOut.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">
                      {row.currentStock.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                         <div className="w-full md:w-32">
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

export default History;