import React, { useState, useEffect } from 'react';
import { InventoryItem, Segmento, ConsumptionLog } from '../types';
import { getInventory, saveConsumptionLog } from '../services/storageService';
import { PER_CAPITA_RULES, AVAILABLE_MENUS, DEFAULT_UTENSILS, HOUSEHOLD_CONVERSION, NUTRITIONAL_DATA, YIELD_FACTORS } from '../constants';
import { Calculator, Check, AlertOctagon, Utensils, Users, Plus, Trash2, ChefHat, CookingPot, Leaf, Activity } from 'lucide-react';

interface PlannedUtensil {
  id: string;
  name: string;
  quantity: number;
  available: boolean;
}

const Planning: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [segment, setSegment] = useState<Segmento>(Segmento.FUNDAMENTAL);
  const [students, setStudents] = useState<number | ''>('');
  
  // Custom Menu Builder State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [itemToAdd, setItemToAdd] = useState('');
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);

  // Utensils State
  const [utensilToAdd, setUtensilToAdd] = useState('');
  const [plannedUtensils, setPlannedUtensils] = useState<PlannedUtensil[]>([]);

  const [calculatedItems, setCalculatedItems] = useState<{
    item: InventoryItem, 
    needed: number, 
    stock: number,
    status: 'ok' | 'lack',
    unit: string,
    perCapitaMeasure: string,
    totalMeasure: string,
    nutriPerStudent: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }
  }[]>([]);

  const [nutritionTotals, setNutritionTotals] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setInventory(getInventory());
  }, []);

  // Recalculate whenever inputs or selected items change
  useEffect(() => {
    if (!students || students <= 0 || selectedItems.length === 0) {
      setCalculatedItems([]);
      setNutritionTotals({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
      return;
    }

    const count = Number(students);
    let totalKcal = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    const results = selectedItems.map(invItem => {
      // 1. Raw Weight Rule (Per Capita)
      const perCapitaGramsRaw = PER_CAPITA_RULES[invItem.name]?.[segment] || 0;
      
      // 2. Calculate Total Grams Needed
      const totalGramsNeeded = perCapitaGramsRaw * count;
      
      // 3. Determine Stock Deduction Quantity based on Inventory Unit
      let quantityNeededForStock = 0;
      const unitLower = invItem.unit.toLowerCase();

      // Get Household Conversion Data
      const conversion = HOUSEHOLD_CONVERSION[invItem.name];

      if (unitLower === 'kg' || unitLower === 'l') {
        // Standard: Divide grams by 1000
        quantityNeededForStock = totalGramsNeeded / 1000;
      } else if (unitLower === 'un' || unitLower === 'pct') {
        // Unit-based: Needs weight per unit conversion
        // If conversion exists, use grams per unit. Otherwise default to 1 (risky but handles edge cases)
        const gramsPerUnit = conversion?.grams || 1; 
        
        // For 'un', we typically want whole numbers, but let's keep decimals for precision then display rounded
        quantityNeededForStock = totalGramsNeeded / gramsPerUnit;
      } else {
         // Fallback default
         quantityNeededForStock = totalGramsNeeded / 1000;
      }
      
      // 4. Stock Check
      const currentStock = invItem.quantity;
      let status: 'ok' | 'lack' = 'ok';
      if (quantityNeededForStock > currentStock) status = 'lack';

      // 5. Household Measures Display Strings
      let perCapitaMeasure = '-';
      let totalMeasure = '-';

      if (conversion) {
        // Per Capita Measure (Raw/Unit)
        const pcVal = perCapitaGramsRaw / conversion.grams;
        perCapitaMeasure = `${pcVal < 0.1 ? pcVal.toFixed(2) : pcVal.toFixed(1)} ${conversion.unit}`;

        // Total Measure (Raw/Unit)
        const totalVal = totalGramsNeeded / conversion.grams;
        totalMeasure = `${totalVal.toFixed(1)} ${conversion.unit}`;
      } else {
        // Fallback
        perCapitaMeasure = `${perCapitaGramsRaw}g`;
        // If unit is kg, show Kg. If unit is un, show un calculated above.
        totalMeasure = unitLower === 'un' 
           ? `${quantityNeededForStock.toFixed(1)} ${invItem.unit}`
           : `${(totalGramsNeeded/1000).toFixed(2)} kg`;
      }

      // 6. Calculate Nutrition (Requires Yield Factor if table is for Cooked)
      const nutriData = NUTRITIONAL_DATA[invItem.name];
      let itemNutri = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

      if (nutriData) {
        const yieldFactor = YIELD_FACTORS[invItem.name] || 1;
        // Grams Raw * Yield = Grams Cooked (Edible)
        const edibleGrams = perCapitaGramsRaw * yieldFactor;
        
        // Ratio based on reference amount (usually 100g)
        const ratio = edibleGrams / nutriData.referenceAmount;
        
        itemNutri = {
          kcal: nutriData.kcal * ratio,
          protein: nutriData.protein * ratio,
          carbs: nutriData.carbs * ratio,
          fat: nutriData.fat * ratio
        };

        totalKcal += itemNutri.kcal;
        totalProt += itemNutri.protein;
        totalCarbs += itemNutri.carbs;
        totalFat += itemNutri.fat;
      }

      return {
        item: invItem,
        needed: quantityNeededForStock,
        stock: currentStock,
        status,
        unit: invItem.unit,
        perCapitaMeasure,
        totalMeasure,
        nutriPerStudent: itemNutri
      };
    });

    setCalculatedItems(results);
    setNutritionTotals({
      kcal: Math.round(totalKcal),
      protein: Number(totalProt.toFixed(1)),
      carbs: Number(totalCarbs.toFixed(1)),
      fat: Number(totalFat.toFixed(1))
    });

  }, [segment, students, selectedItems]);

  const handleApplyTemplate = (menuId: string) => {
    setSelectedTemplateId(menuId);
    if (!menuId) return;

    const menu = AVAILABLE_MENUS.find(m => m.id === menuId);
    if (menu) {
      const itemsFromTemplate = inventory.filter(i => menu.ingredients.includes(i.name));
      const newItems = [...selectedItems];
      itemsFromTemplate.forEach(templateItem => {
        if (!newItems.find(current => current.id === templateItem.id)) {
            newItems.push(templateItem);
        }
      });
      setSelectedItems(newItems);
    }
  };

  const handleAddItem = () => {
    if (!itemToAdd) return;
    const item = inventory.find(i => i.id === itemToAdd);
    if (item && !selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
    setItemToAdd('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleAddUtensil = () => {
    if (!utensilToAdd) return;
    const newUtensil: PlannedUtensil = {
      id: Date.now().toString(),
      name: utensilToAdd,
      quantity: 1,
      available: true
    };
    setPlannedUtensils([...plannedUtensils, newUtensil]);
    setUtensilToAdd('');
  };

  const handleRemoveUtensil = (id: string) => {
    setPlannedUtensils(plannedUtensils.filter(u => u.id !== id));
  };

  const updateUtensil = (id: string, field: 'quantity' | 'available', value: number | boolean) => {
    setPlannedUtensils(plannedUtensils.map(u => {
      if (u.id === id) {
        return { ...u, [field]: value };
      }
      return u;
    }));
  };

  const handleConfirm = () => {
    if (calculatedItems.length === 0 || calculatedItems.some(i => i.status !== 'ok')) return;

    const log: ConsumptionLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mealType: 'Merenda',
      menuName: selectedTemplateId ? (AVAILABLE_MENUS.find(m => m.id === selectedTemplateId)?.name || 'Cardápio Personalizado') : 'Cardápio Personalizado',
      segment,
      studentCount: Number(students),
      consumedItems: calculatedItems.map(c => ({
          itemId: c.item.id,
          name: c.item.name,
          quantityConsumed: c.needed
      }))
    };

    saveConsumptionLog(log);
    setInventory(getInventory());
    
    setSuccess(true);
    setStudents('');
    setSelectedItems([]);
    setSelectedTemplateId('');
    setPlannedUtensils([]);
    setTimeout(() => setSuccess(false), 3000);
  };

  const hasShortage = calculatedItems.some(i => i.status !== 'ok');

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-6xl mx-auto">
       <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Planejamento Diário</h1>
          <p className="text-slate-500">Monte o cardápio com os itens disponíveis no estoque</p>
      </header>

      {success && (
        <div className="p-4 mb-6 bg-green-100 text-green-800 rounded-lg flex items-center justify-center font-bold shadow-sm animate-fade-in">
          <Check className="w-6 h-6 mr-2" />
          Consumo registrado e estoque atualizado com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Configuration */}
        <div className="space-y-6 xl:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-100 space-y-4">
             <h2 className="font-bold text-slate-700 border-b pb-2 flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-600" /> 1. Público
             </h2>
             <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Segmento</label>
                <select 
                  value={segment} 
                  onChange={e => setSegment(e.target.value as Segmento)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                >
                  {Object.values(Segmento).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Qtd. Alunos</label>
                <input 
                  type="number" 
                  value={students}
                  onChange={e => setStudents(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: 150"
                  min="1"
                />
              </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-100 space-y-4">
            <h2 className="font-bold text-slate-700 border-b pb-2 flex items-center">
                <ChefHat className="w-4 h-4 mr-2 text-green-600" /> 2. Montar Cardápio
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usar Modelo</label>
              <select 
                value={selectedTemplateId} 
                onChange={e => handleApplyTemplate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Selecione um Modelo --</option>
                {AVAILABLE_MENUS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="relative flex items-center py-2">
               <div className="flex-grow border-t border-slate-200"></div>
               <span className="flex-shrink-0 mx-2 text-slate-400 text-xs uppercase">Ou adicione itens</span>
               <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="flex gap-2">
               <select 
                  value={itemToAdd} 
                  onChange={e => setItemToAdd(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500"
               >
                  <option value="">Escolha um ingrediente...</option>
                  {inventory
                    .sort((a,b) => a.name.localeCompare(b.name))
                    .map(item => (
                    <option key={item.id} value={item.id} disabled={selectedItems.some(si => si.id === item.id)}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
               </select>
               <button 
                onClick={handleAddItem}
                disabled={!itemToAdd}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
               >
                 <Plus className="w-5 h-5" />
               </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedItems.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum item selecionado.</span>}
              {selectedItems.map(item => (
                <span key={item.id} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  {item.name}
                  <button onClick={() => handleRemoveItem(item.id)} className="ml-1 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-100 space-y-4">
             <h2 className="font-bold text-slate-700 border-b pb-2 flex items-center">
                <CookingPot className="w-4 h-4 mr-2 text-amber-600" /> 3. Utensílios
             </h2>
             
             <div className="flex gap-2">
               <select 
                  value={utensilToAdd} 
                  onChange={e => setUtensilToAdd(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500"
               >
                  <option value="">Selecione...</option>
                  {DEFAULT_UTENSILS.map((u, i) => (
                    <option key={i} value={u} disabled={plannedUtensils.some(pu => pu.name === u)}>{u}</option>
                  ))}
               </select>
               <button 
                onClick={handleAddUtensil}
                disabled={!utensilToAdd}
                className="bg-amber-600 text-white p-2 rounded hover:bg-amber-700 disabled:opacity-50"
               >
                 <Plus className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-2 mt-2">
               {plannedUtensils.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum utensílio listado.</span>}
               {plannedUtensils.map(utensil => (
                 <div key={utensil.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                   <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{utensil.name}</span>
                      <div className="flex items-center mt-1 space-x-2">
                         <input 
                            type="number" 
                            min="1"
                            value={utensil.quantity}
                            onChange={(e) => updateUtensil(utensil.id, 'quantity', Number(e.target.value))}
                            className="w-14 p-1 text-xs border rounded text-center"
                         />
                         <button 
                           onClick={() => updateUtensil(utensil.id, 'available', !utensil.available)}
                           className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                             utensil.available 
                             ? 'bg-green-100 text-green-700 border-green-200' 
                             : 'bg-red-100 text-red-700 border-red-200'
                           }`}
                         >
                           {utensil.available ? 'Disponível' : 'Em Falta'}
                         </button>
                      </div>
                   </div>
                   <button onClick={() => handleRemoveUtensil(utensil.id)} className="text-slate-400 hover:text-red-500">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column: Calculation Table & Nutrition */}
        <div className="xl:col-span-2 space-y-6">
           {/* Nutrition Card */}
           <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg text-white p-6">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold flex items-center text-lg">
                 <Activity className="w-5 h-5 mr-2" />
                 Valor Nutricional <span className="text-sm font-normal opacity-80 ml-2">(Por Aluno / Estimativa)</span>
               </h3>
               {nutritionTotals.kcal > 0 && (
                 <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                   Baseado em alimentos in natura + fator cocção
                 </span>
               )}
             </div>
             
             {nutritionTotals.kcal === 0 ? (
               <div className="text-center py-4 text-white/60 text-sm">
                 Adicione itens e alunos para ver o cálculo nutricional.
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                   <div className="text-xs opacity-70 mb-1">Energia</div>
                   <div className="text-2xl font-bold">{nutritionTotals.kcal} <span className="text-sm font-normal">kcal</span></div>
                 </div>
                 <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                   <div className="text-xs opacity-70 mb-1">Proteínas</div>
                   <div className="text-2xl font-bold">{nutritionTotals.protein} <span className="text-sm font-normal">g</span></div>
                 </div>
                 <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                   <div className="text-xs opacity-70 mb-1">Carboidratos</div>
                   <div className="text-2xl font-bold">{nutritionTotals.carbs} <span className="text-sm font-normal">g</span></div>
                 </div>
                 <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                   <div className="text-xs opacity-70 mb-1">Gorduras Totais</div>
                   <div className="text-2xl font-bold">{nutritionTotals.fat} <span className="text-sm font-normal">g</span></div>
                 </div>
               </div>
             )}
           </div>

           <div className={`bg-white rounded-lg shadow-md border overflow-hidden transition-colors ${hasShortage ? 'border-red-200' : 'border-slate-200'}`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${hasShortage ? 'bg-red-50' : 'bg-slate-50'}`}>
                <div className="flex items-center">
                  <Calculator className={`w-5 h-5 mr-2 ${hasShortage ? 'text-red-700' : 'text-slate-700'}`} />
                  <h3 className={`font-bold ${hasShortage ? 'text-red-800' : 'text-slate-800'}`}>
                    Previsão de Consumo
                  </h3>
                </div>
                {hasShortage && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded border border-red-200">FALTA ESTOQUE</span>}
              </div>

              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Ingrediente</th>
                      <th className="px-4 py-3 text-center bg-slate-100 border-r border-slate-200">Per Capita (g)</th>
                      <th className="px-4 py-3 text-center bg-blue-50 text-blue-700 border-r border-blue-100">Per Capita (Medida)</th>
                      <th className="px-4 py-3 text-center bg-amber-50 text-amber-700 border-r border-amber-100">Nutrição Est.</th>
                      <th className="px-4 py-3 text-center bg-slate-100 border-r border-slate-200">Necessário (Qtd)</th>
                      <th className="px-4 py-3 text-center bg-blue-50 text-blue-700">Necessário (Medida)</th>
                      <th className="px-4 py-3 text-center">Estoque</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          <div className="flex flex-col items-center">
                            <Utensils className="w-12 h-12 mb-2 text-slate-200" />
                            <p>Selecione os ingredientes e a quantidade de alunos para ver o cálculo.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      calculatedItems.map((calc, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${calc.status !== 'ok' ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {calc.item.name}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs border-r border-slate-100">
                             {PER_CAPITA_RULES[calc.item.name]?.[segment] || 0}g
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-blue-700 bg-blue-50/50 text-xs border-r border-blue-50">
                             {calc.perCapitaMeasure}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-amber-700 bg-amber-50/50 text-xs border-r border-amber-50" title={`Prot: ${calc.nutriPerStudent.protein.toFixed(1)}g | Carb: ${calc.nutriPerStudent.carbs.toFixed(1)}g | Gord: ${calc.nutriPerStudent.fat.toFixed(1)}g`}>
                             {calc.nutriPerStudent.kcal > 0 ? `${Math.round(calc.nutriPerStudent.kcal)} kcal` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800 border-r border-slate-100">
                             {/* Display formatting for Units vs Kgs */}
                             {calc.unit.toLowerCase() === 'un' 
                               ? `${calc.needed.toFixed(1)}` 
                               : calc.needed.toFixed(2)
                             } {calc.unit}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50/50">
                             {calc.totalMeasure}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                             {calc.stock.toFixed(2)} {calc.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {calc.status === 'ok' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                                <AlertOctagon className="w-3 h-3 mr-1" /> 
                                FALTA {(calc.needed - calc.stock).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                             <button onClick={() => handleRemoveItem(calc.item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button 
                  onClick={handleConfirm}
                  disabled={hasShortage || calculatedItems.length === 0}
                  className={`w-full py-4 rounded-lg font-bold shadow-lg transition-all text-lg flex justify-center items-center ${
                    hasShortage || calculatedItems.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-[1.01]'
                  }`}
                >
                  {hasShortage ? 'CORRIJA O ESTOQUE' : 'CONFIRMAR BAIXA NO ESTOQUE'}
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Planning;