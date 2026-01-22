import { InventoryItem, ReceivingLog, ConsumptionLog } from '../types';
import { INITIAL_INVENTORY } from '../constants';

const KEYS = {
  INVENTORY: 'merenda_v6_inventory',
  RECEIVING: 'merenda_v6_receiving',
  CONSUMPTION: 'merenda_v6_consumption',
  CATEGORIES: 'merenda_v6_categories',
};

const DEFAULT_CATEGORIES = ['Perecível', 'Não Perecível', 'Limpeza'];

// In-memory cache (Memoization)
let inventoryCache: InventoryItem[] | null = null;
let consumptionCache: ConsumptionLog[] | null = null;
let receivingCache: ReceivingLog[] | null = null;
let categoriesCache: string[] | null = null;

// Helper for Deep Copy to avoid reference mutations
const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const persistInventory = () => {
  if (inventoryCache) {
    try {
      localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventoryCache));
    } catch (e) {
      console.error("Failed to save inventory to storage", e);
    }
  }
};

export const getInventory = (): InventoryItem[] => {
  if (inventoryCache) return inventoryCache;

  const data = localStorage.getItem(KEYS.INVENTORY);
  if (!data) {
    // Initialize with a Deep Copy of constants to ensure no reference sharing
    inventoryCache = deepCopy(INITIAL_INVENTORY);
    persistInventory();
    return inventoryCache;
  }

  try {
    inventoryCache = JSON.parse(data);
  } catch (e) {
    console.error("Error parsing inventory", e);
    inventoryCache = deepCopy(INITIAL_INVENTORY);
  }
  
  return inventoryCache!;
};

export const updateInventoryBatch = (updates: { id: string; delta: number }[]) => {
  const items = getInventory();
  const updatesMap = new Map(updates.map(u => [u.id, u.delta]));

  if (updatesMap.size === 0) return items;

  const newItems = items.map(item => {
    const delta = updatesMap.get(item.id);
    if (delta !== undefined) {
      return { ...item, quantity: Math.max(0, item.quantity + delta) };
    }
    return item;
  });

  inventoryCache = newItems;
  persistInventory();
  return newItems;
};

export const updateInventoryItem = (id: string, delta: number) => {
  return updateInventoryBatch([{ id, delta }]);
};

// Nova função para editar definições do item (Nome, Categoria, Unidade, MinStock)
export const updateItemDefinition = (id: string, updates: Partial<Omit<InventoryItem, 'id' | 'quantity'>>) => {
  const items = getInventory();
  const newItems = items.map(item => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    return item;
  });
  
  inventoryCache = newItems;
  persistInventory();
  return newItems;
};

export const addInventoryItem = (item: Omit<InventoryItem, 'id'>): InventoryItem => {
  const items = getInventory();
  const newItem = { ...item, id: Date.now().toString() };
  const newItems = [...items, newItem];
  inventoryCache = newItems;
  persistInventory();
  return newItem;
};

export const saveReceivingLog = (log: ReceivingLog) => {
  const existing = getReceivingHistory();
  const newLogs = [log, ...existing];
  
  receivingCache = newLogs;
  localStorage.setItem(KEYS.RECEIVING, JSON.stringify(newLogs));

  const updates = log.items.map(item => ({ 
    id: item.itemId, 
    delta: item.quantityAdded 
  }));
  updateInventoryBatch(updates);
};

// Nova função para editar metadados de um log de recebimento (Correção de erros de digitação)
export const updateReceivingLogMetadata = (logId: string, updates: Partial<Pick<ReceivingLog, 'date' | 'supplier' | 'invoiceNumber' | 'qcCheck'>>) => {
  const logs = getReceivingHistory();
  const newLogs = logs.map(log => {
    if (log.id === logId) {
      return { ...log, ...updates };
    }
    return log;
  });
  
  receivingCache = newLogs;
  localStorage.setItem(KEYS.RECEIVING, JSON.stringify(newLogs));
  return newLogs;
};

// Função para editar um item específico dentro de uma nota fiscal já salva
// Calcula o DELTA para corrigir o estoque atual proporcionalmente
export const updateReceivingLogItem = (logId: string, itemIndex: number, newQty: number, newExpirationDate?: string) => {
  const logs = getReceivingHistory();
  const logIdx = logs.findIndex(l => l.id === logId);
  if (logIdx === -1) return logs;

  const log = { ...logs[logIdx] };
  const items = [...log.items];
  const item = { ...items[itemIndex] };
  
  const oldQty = item.quantityAdded;
  const delta = newQty - oldQty;

  // Update Item in Log
  item.quantityAdded = newQty;
  item.expirationDate = newExpirationDate;
  items[itemIndex] = item;
  log.items = items;

  // Save Log Updates
  const newLogs = [...logs];
  newLogs[logIdx] = log;
  receivingCache = newLogs;
  localStorage.setItem(KEYS.RECEIVING, JSON.stringify(newLogs));

  // Update Inventory Balance if quantity changed
  if (delta !== 0) {
    updateInventoryItem(item.itemId, delta);
  }
  
  return newLogs;
};

export const getReceivingHistory = (): ReceivingLog[] => {
  if (receivingCache) return receivingCache;

  const data = localStorage.getItem(KEYS.RECEIVING);
  if (!data) {
    receivingCache = [];
    return [];
  }

  try {
    receivingCache = JSON.parse(data);
  } catch (e) {
    receivingCache = [];
  }
  return receivingCache!;
};

export const saveConsumptionLog = (log: ConsumptionLog) => {
  const history = getConsumptionHistory();
  const newHistory = [log, ...history];
  
  consumptionCache = newHistory;
  localStorage.setItem(KEYS.CONSUMPTION, JSON.stringify(newHistory));

  const updates = log.consumedItems.map(item => ({
    id: item.itemId,
    delta: -item.quantityConsumed
  }));
  updateInventoryBatch(updates);
};

export const getConsumptionHistory = (): ConsumptionLog[] => {
  if (consumptionCache) return consumptionCache;

  const data = localStorage.getItem(KEYS.CONSUMPTION);
  if (!data) {
    consumptionCache = [];
    return [];
  }

  try {
    consumptionCache = JSON.parse(data);
  } catch (e) {
    consumptionCache = [];
  }
  return consumptionCache!;
};

export const getCategories = (): string[] => {
  if (categoriesCache) return categoriesCache;

  const data = localStorage.getItem(KEYS.CATEGORIES);
  if (!data) {
    categoriesCache = [...DEFAULT_CATEGORIES];
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return categoriesCache;
  }

  try {
    categoriesCache = JSON.parse(data);
  } catch (e) {
    categoriesCache = [...DEFAULT_CATEGORIES];
  }
  return categoriesCache!;
};

export const addCategory = (category: string): string[] => {
  const current = getCategories();
  if (!current.includes(category)) {
    const updated = [...current, category].sort();
    categoriesCache = updated;
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(updated));
    return updated;
  }
  return current;
};

export const updateCategory = (oldName: string, newName: string): string[] => {
  const current = getCategories();
  
  // Update the list of categories
  const updatedCats = current.map(c => c === oldName ? newName : c).sort();
  categoriesCache = updatedCats;
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(updatedCats));

  // Update all inventory items that were using the old category name
  const items = getInventory();
  let itemsUpdated = false;
  const newItems = items.map(item => {
    if (item.category === oldName) {
      itemsUpdated = true;
      return { ...item, category: newName };
    }
    return item;
  });

  if (itemsUpdated) {
    inventoryCache = newItems;
    persistInventory();
  }

  return updatedCats;
};

export const removeCategory = (category: string): string[] => {
  const current = getCategories();
  const updated = current.filter(c => c !== category);
  categoriesCache = updated;
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(updated));
  return updated;
};

export const clearCache = () => {
  inventoryCache = null;
  consumptionCache = null;
  receivingCache = null;
  categoriesCache = null;
};

export const clearAllData = () => {
  // 1. Limpar Histórico (Logs)
  localStorage.removeItem(KEYS.RECEIVING);
  localStorage.removeItem(KEYS.CONSUMPTION);
  
  // 2. Limpar Cache de Memória
  clearCache();
  
  // 3. Restaurar Categorias Padrão
  categoriesCache = [...DEFAULT_CATEGORIES];
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categoriesCache));
  
  // 4. Resetar Inventário para os Itens Padrão (que agora possuem qtd = 0 no constants.ts)
  // Isso mantém a lista de produtos mas zera o estoque inicial.
  inventoryCache = deepCopy(INITIAL_INVENTORY);
  
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventoryCache));
  
  console.log("Sistema resetado. Histórico apagado e estoque zerado.");
};

export const exportDatabase = (): string => {
  const data = {
    inventory: getInventory(),
    receiving: getReceivingHistory(),
    consumption: getConsumptionHistory(),
    categories: getCategories(),
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion: 'v6'
    }
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabase = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!Array.isArray(data.inventory) || !Array.isArray(data.receiving)) {
      console.error("Invalid backup format");
      return false;
    }

    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(data.inventory));
    localStorage.setItem(KEYS.RECEIVING, JSON.stringify(data.receiving));
    localStorage.setItem(KEYS.CONSUMPTION, JSON.stringify(data.consumption || []));
    
    if (data.categories) {
       localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data.categories));
    } else {
       localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }

    clearCache();
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};