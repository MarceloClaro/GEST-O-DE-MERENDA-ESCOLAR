import { InventoryItem, PerCapitaRules, Segmento, Menu, NutritionalInfo } from './types';

export const PER_CAPITA_RULES: PerCapitaRules = {
  // Cereais, Tubérculos e Derivados (Base: PDF Arroz/Feijão CRU)
  'Arroz': {
    [Segmento.INFANTIL]: 20,
    [Segmento.FUNDAMENTAL]: 30,
    [Segmento.EJA]: 40
  },
  'Macarrão': {
    [Segmento.INFANTIL]: 50,
    [Segmento.FUNDAMENTAL]: 60,
    [Segmento.EJA]: 65
  },
  'Pão': {
    [Segmento.INFANTIL]: 50, // 1 Unidade
    [Segmento.FUNDAMENTAL]: 50,
    [Segmento.EJA]: 50
  },
  'Biscoito': {
    [Segmento.INFANTIL]: 30, // ~6 unidades
    [Segmento.FUNDAMENTAL]: 30,
    [Segmento.EJA]: 30
  },
  'Farinha de Milho': { // Cuscuz
    [Segmento.INFANTIL]: 30,
    [Segmento.FUNDAMENTAL]: 40,
    [Segmento.EJA]: 50
  },

  // Leguminosas e Proteínas
  'Feijão': {
    [Segmento.INFANTIL]: 15,
    [Segmento.FUNDAMENTAL]: 25,
    [Segmento.EJA]: 30
  },
  'Carne Bovina': {
    [Segmento.INFANTIL]: 100,
    [Segmento.FUNDAMENTAL]: 120,
    [Segmento.EJA]: 140
  },
  'Frango': {
    [Segmento.INFANTIL]: 100,
    [Segmento.FUNDAMENTAL]: 120,
    [Segmento.EJA]: 140
  },
  'Peixe': {
    [Segmento.INFANTIL]: 80,
    [Segmento.FUNDAMENTAL]: 100,
    [Segmento.EJA]: 120
  },
  'Ovo': { // Unidade aprox 50g
    [Segmento.INFANTIL]: 50,
    [Segmento.FUNDAMENTAL]: 50,
    [Segmento.EJA]: 100
  },

  // Laticínios
  'Leite em Pó': {
    [Segmento.INFANTIL]: 20,
    [Segmento.FUNDAMENTAL]: 25,
    [Segmento.EJA]: 30
  },

  // Frutas (Porção média comestível)
  'Banana': {
    [Segmento.INFANTIL]: 86, // Média PDF
    [Segmento.FUNDAMENTAL]: 86,
    [Segmento.EJA]: 86
  },
  'Maçã': {
    [Segmento.INFANTIL]: 130, // Média PDF
    [Segmento.FUNDAMENTAL]: 130,
    [Segmento.EJA]: 130
  },
  'Melancia': {
    [Segmento.INFANTIL]: 150,
    [Segmento.FUNDAMENTAL]: 200,
    [Segmento.EJA]: 200
  },

  // Temperos básicos (estimativa por aluno)
  'Óleo': {
    [Segmento.INFANTIL]: 5,
    [Segmento.FUNDAMENTAL]: 5,
    [Segmento.EJA]: 5
  },
  'Sal': {
    [Segmento.INFANTIL]: 1,
    [Segmento.FUNDAMENTAL]: 2,
    [Segmento.EJA]: 2
  },
  'Açúcar': {
    [Segmento.INFANTIL]: 10,
    [Segmento.FUNDAMENTAL]: 15,
    [Segmento.EJA]: 15
  }
};

// Conversão baseada no "Quadro Rápido de Utensílios" do PDF
export const HOUSEHOLD_CONVERSION: Record<string, { unit: string, grams: number }> = {
  // CRU (Para retirada de estoque/Cálculo)
  'Arroz': { unit: 'Xícara(s) Chá', grams: 180 }, // PDF: Xícara (chá) – arroz cru ≈ 180 g
  'Feijão': { unit: 'Xícara(s) Chá', grams: 160 }, // PDF: Xícara (chá) – feijão cru ≈ 160 g
  'Farinha de Milho': { unit: 'Xícara(s)', grams: 130 },
  'Leite em Pó': { unit: 'Colher(es) Sopa', grams: 26 }, // PDF: Leite Pó Integral (ref tabela 3) ~25g
  
  // Refeição (Alguns itens saem por unidade ou colher menor)
  'Óleo': { unit: 'Colher(es) Sopa', grams: 15 },
  'Sal': { unit: 'Colher(es) Chá', grams: 5 },
  'Açúcar': { unit: 'Colher(es) Sopa', grams: 15 },
  
  // Unidades / Porções (Importante para conversão de estoque 'un')
  'Macarrão': { unit: 'Pct 500g', grams: 500 }, 
  'Carne Bovina': { unit: 'Porção(ões)', grams: 120 },
  'Frango': { unit: 'Pedaço(s)', grams: 120 },
  'Peixe': { unit: 'Filé(s)', grams: 100 },
  'Ovo': { unit: 'Unidade(s)', grams: 50 }, // PDF: 1 unidade ~50g
  'Banana': { unit: 'Unidade(s)', grams: 86 }, // PDF: 1 unidade média ~86g
  'Maçã': { unit: 'Unidade(s)', grams: 130 }, // PDF: 1 unidade média ~130g
  'Pão': { unit: 'Unidade(s)', grams: 50 }, // PDF: 1 unidade ~50g
  'Biscoito': { unit: 'Unidade(s)', grams: 5 }, // Unitário cream cracker
};

// Fator de correção (Index de Conversão) para Nutrição: Cru -> Cozido
// Necessário pois o estoque é cru, mas a tabela nutricional do PDF é baseada em alimento cozido.
export const YIELD_FACTORS: Record<string, number> = {
  'Arroz': 3.7, // Média do PDF (30g Cru -> 110g Cozido)
  'Feijão': 3.8, // Média do PDF (25g Cru -> 90g Cozido)
  'Macarrão': 2.5, // Padrão técnico
  'Farinha de Milho': 2.5, // Cuscuz hidrata
  'Leite em Pó': 1, // Pó é pó (diluição não altera kcal total do pó)
  'Carne Bovina': 0.75, // Perda de peso na cocção
  'Frango': 0.75,
  'Peixe': 0.8,
  'Ovo': 1,
  'Banana': 1,
  'Pão': 1,
  'Biscoito': 1
};

// Dados Nutricionais por 100g (Baseado nas Imagens do PDF)
// Nota: Para arroz/feijão/massas, os valores são do alimento COZIDO, por isso usamos o YIELD_FACTOR antes de calcular.
export const NUTRITIONAL_DATA: Record<string, NutritionalInfo> = {
  'Arroz': { kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, referenceAmount: 100 }, // Cozido
  'Feijão': { kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5, referenceAmount: 100 }, // Cozido
  'Macarrão': { kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.9, referenceAmount: 100 }, // Cozido
  'Farinha de Milho': { kcal: 113, protein: 2.2, carbs: 25.3, fat: 0.7, referenceAmount: 100 }, // Cuscuz Cozido
  'Pão': { kcal: 300, protein: 8.0, carbs: 58.6, fat: 3.1, referenceAmount: 100 },
  'Biscoito': { kcal: 432, protein: 10.1, carbs: 68.7, fat: 14.4, referenceAmount: 100 },
  'Carne Bovina': { kcal: 200, protein: 26.0, carbs: 0, fat: 8.0, referenceAmount: 100 }, // Cozida estimada
  'Frango': { kcal: 190, protein: 29.0, carbs: 0, fat: 7.0, referenceAmount: 100 }, // Cozido estimado
  'Peixe': { kcal: 130, protein: 20.0, carbs: 0, fat: 4.0, referenceAmount: 100 }, // Cozido (filé)
  'Ovo': { kcal: 146, protein: 13.0, carbs: 0.8, fat: 10.0, referenceAmount: 100 },
  'Leite em Pó': { kcal: 497, protein: 25.4, carbs: 39.2, fat: 26.9, referenceAmount: 100 }, // Integral Pó
  'Banana': { kcal: 98, protein: 1.3, carbs: 26.0, fat: 0.1, referenceAmount: 100 },
  'Maçã': { kcal: 56, protein: 0.3, carbs: 14.0, fat: 0, referenceAmount: 100 },
  'Óleo': { kcal: 884, protein: 0, carbs: 0, fat: 100, referenceAmount: 100 },
  'Açúcar': { kcal: 387, protein: 0, carbs: 99, fat: 0, referenceAmount: 100 },
  'Sal': { kcal: 0, protein: 0, carbs: 0, fat: 0, referenceAmount: 100 }
};

export const AVAILABLE_MENUS: Menu[] = [
  {
    id: 'm1',
    name: 'Básico (Arroz, Feijão e Carne)',
    ingredients: ['Arroz', 'Feijão', 'Carne Bovina', 'Óleo', 'Sal']
  },
  {
    id: 'm2',
    name: 'Galinhada Completa',
    ingredients: ['Arroz', 'Frango', 'Óleo', 'Sal']
  },
  {
    id: 'm3',
    name: 'Macarronada com Carne',
    ingredients: ['Macarrão', 'Carne Bovina', 'Óleo', 'Sal']
  },
  {
    id: 'm4',
    name: 'Peixada com Arroz',
    ingredients: ['Arroz', 'Peixe', 'Óleo', 'Sal']
  },
  {
    id: 'm5',
    name: 'Mingau de Leite',
    ingredients: ['Leite em Pó', 'Açúcar']
  },
  {
    id: 'm6',
    name: 'Omelete com Arroz',
    ingredients: ['Arroz', 'Ovo', 'Óleo', 'Sal']
  },
  {
    id: 'm7',
    name: 'Lanche: Fruta (Banana)',
    ingredients: ['Banana']
  },
  {
    id: 'm8',
    name: 'Cuscuz com Ovo',
    ingredients: ['Farinha de Milho', 'Ovo', 'Óleo', 'Sal']
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { 
    id: '1', 
    name: 'Arroz', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'kg', 
    minStock: 20,
    standardMeasure: 'Xícara(s) Chá',
    measureWeight: 180
  },
  { 
    id: '2', 
    name: 'Feijão', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'kg', 
    minStock: 15,
    standardMeasure: 'Xícara(s) Chá',
    measureWeight: 160
  },
  { id: '3', name: 'Macarrão', category: 'Não Perecível', quantity: 0, unit: 'kg', minStock: 10, standardMeasure: 'Pct 500g', measureWeight: 500 },
  { id: '4', name: 'Carne Bovina', category: 'Perecível', quantity: 0, unit: 'kg', minStock: 10 },
  { id: '5', name: 'Frango', category: 'Perecível', quantity: 0, unit: 'kg', minStock: 10 },
  { id: '6', name: 'Peixe', category: 'Perecível', quantity: 0, unit: 'kg', minStock: 5 },
  { 
    id: '7', 
    name: 'Leite em Pó', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'kg', 
    minStock: 5,
    standardMeasure: 'Colher(es) Sopa',
    measureWeight: 26
  },
  { 
    id: '8', 
    name: 'Óleo', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'L', 
    minStock: 5,
    standardMeasure: 'Colher(es) Sopa',
    measureWeight: 15
  },
  { 
    id: '9', 
    name: 'Sal', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'kg', 
    minStock: 2,
    standardMeasure: 'Colher(es) Chá',
    measureWeight: 5
  },
  { id: '10', name: 'Ovo', category: 'Perecível', quantity: 0, unit: 'un', minStock: 30, standardMeasure: 'Unidade(s)', measureWeight: 50 },
  { id: '11', name: 'Banana', category: 'Perecível', quantity: 0, unit: 'kg', minStock: 10 },
  { id: '12', name: 'Maçã', category: 'Perecível', quantity: 0, unit: 'kg', minStock: 10 },
  { 
    id: '13', 
    name: 'Açúcar', 
    category: 'Não Perecível', 
    quantity: 0, 
    unit: 'kg', 
    minStock: 5,
    standardMeasure: 'Colher(es) Sopa',
    measureWeight: 15
  },
  { id: '14', name: 'Farinha de Milho', category: 'Não Perecível', quantity: 0, unit: 'kg', minStock: 5, standardMeasure: 'Xícara(s)', measureWeight: 130 },
];

export const DEFAULT_UTENSILS = [
  'Panela Industrial Grande',
  'Panela Média',
  'Frigideira',
  'Concha',
  'Escumadeira',
  'Colher de Arroz',
  'Faca de Corte',
  'Tábua de Corte',
  'Liquidificador',
  'Descascador',
  'Assadeira',
  'Bacia Plástica'
];