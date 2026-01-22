import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize client only if key exists to avoid immediate crash, though strict requirement is assumed.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateInventoryInsights = async (
  inventory: InventoryItem[],
  userPrompt: string
): Promise<string> => {
  if (!ai) return "Erro: Chave de API não configurada.";

  const inventoryContext = inventory.map(i => 
    `- ${i.name}: ${i.quantity} ${i.unit} (Mínimo: ${i.minStock})`
  ).join('\n');

  const systemInstruction = `
    Você é um assistente especialista em Gestão de Alimentação Escolar (PNAE).
    Você tem acesso ao estoque atual da escola listado abaixo.
    
    Estoque Atual:
    ${inventoryContext}
    
    Responda perguntas sobre o que cozinhar, como otimizar o estoque, ou avise sobre itens críticos.
    Seja sucinto, prático e use tom profissional mas amigável.
    Sugira receitas que usem os ingredientes disponíveis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "Não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, ocorreu um erro ao consultar a IA.";
  }
};
