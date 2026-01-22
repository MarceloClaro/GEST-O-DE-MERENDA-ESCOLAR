
export enum Segmento {
  INFANTIL = 'Infantil',
  FUNDAMENTAL = 'Fundamental',
  EJA = 'EJA'
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Changed from strict union to string to allow dynamic categories
  quantity: number; // in kg or units
  unit: string;
  minStock: number;
  standardMeasure?: string; // medida_padrao (ex: 'Colher de Sopa')
  measureWeight?: number;   // peso_por_medida (em gramas para a medida acima)
}

export interface ReceivingLog {
  id: string;
  date: string;
  supplier: string;
  invoiceNumber: string;
  items: { 
    itemId: string; 
    name: string; 
    quantityAdded: number;
    expirationDate?: string; // Novo campo para controle de validade
  }[];
  qcCheck: {
    packagingOk: boolean;
    temperatureOk: boolean;
    notes?: string;
  };
}

export interface ConsumptionLog {
  id: string;
  date: string;
  mealType: string;
  menuName: string; // Added to track which menu was served
  segment: Segmento;
  studentCount: number;
  consumedItems: { itemId: string; name: string; quantityConsumed: number }[];
}

export type PerCapitaRules = {
  [itemName: string]: {
    [key in Segmento]: number; // grams
  };
};

export interface Menu {
  id: string;
  name: string;
  ingredients: string[]; // List of InventoryItem names
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface NutritionalInfo {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceAmount: number; // usually 100g
}