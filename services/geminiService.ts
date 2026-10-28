import { AnalysisResult, InputData, ModelOption } from '../types';

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    tag: '🌟 最推薦預設',
    description: '回應延遲極低、反應速度快且穩定，適合大部分試題分析與教案設計。',
    isRecommended: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: '🚀 最新旗艦世代',
    description: 'Google 最新一代多模態大模型，效能與理解力全面提升。',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tag: '🧠 深度思考推理',
    description: '具備頂尖複雜推理能力，適合難度較高、幾何圖形或多步驟數學難題。',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    tag: '🧪 預覽版本',
    description: 'Gemini 3 系列預覽版模型。',
  },
];

export const STORAGE_KEY_API_KEY = 'exam_analyst_gemini_api_key';
export const STORAGE_KEY_MODEL = 'exam_analyst_gemini_model';

export const getStoredApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (!key || !key.trim()) {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  }
};

export const getStoredModel = (): string => {
  if (typeof window === 'undefined') return 'gemini-3.1-flash-lite';
  const stored = localStorage.getItem(STORAGE_KEY_MODEL);
  if (!stored || stored === 'gemini-2.5-flash') {
    return 'gemini-3.1-flash-lite';
  }
  return stored;
};

export const setStoredModel = (model: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MODEL, model.trim());
};

export const getEffectiveApiKey = (customKey?: string): string => {
  return (customKey || getStoredApiKey() || '').trim();
};

export const getEffectiveModel = (customModel?: string): string => {
  return (customModel || getStoredModel() || 'gemini-3.1-flash-lite').trim();
};

export interface ServerStatus {
  hasServerKey: boolean;
  defaultModel: string;
}

export const checkServerStatus = async (): Promise<ServerStatus> => {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status request failed');
    const data = await res.json();
    return {
      hasServerKey: !!data.hasServerKey,
      defaultModel: data.defaultModel || 'gemini-2.5-flash',
    };
  } catch (err) {
    console.warn('Failed to check server status:', err);
    return { hasServerKey: false, defaultModel: 'gemini-2.5-flash' };
  }
};

export const testApiKey = async (apiKey: string, model: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || '連線測試失敗。' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || '測試網路連線失敗。' };
  }
};

export const analyzeQuestion = async (
  input: InputData,
  customApiKey?: string,
  customModel?: string
): Promise<AnalysisResult> => {
  const apiKey = getEffectiveApiKey(customApiKey);
  const model = getEffectiveModel(customModel);

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, apiKey, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `伺服器回應錯誤 (${res.status})`);
  }

  const result = await res.json();
  return result as AnalysisResult;
};

export const generateSimilarQuestions = async (
  input: InputData,
  customApiKey?: string,
  customModel?: string
): Promise<string> => {
  const apiKey = getEffectiveApiKey(customApiKey);
  const model = getEffectiveModel(customModel);

  const res = await fetch('/api/generate-similar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, apiKey, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `伺服器回應錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.text || '無法產生內容';
};

export const generateConjecturingLessonPlan = async (
  input: InputData,
  customApiKey?: string,
  customModel?: string
): Promise<string> => {
  const apiKey = getEffectiveApiKey(customApiKey);
  const model = getEffectiveModel(customModel);

  const res = await fetch('/api/generate-conjecturing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, apiKey, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `伺服器回應錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.text || '無法產生教案';
};

export const generatePolyaLessonPlan = async (
  input: InputData,
  customApiKey?: string,
  customModel?: string
): Promise<string> => {
  const apiKey = getEffectiveApiKey(customApiKey);
  const model = getEffectiveModel(customModel);

  const res = await fetch('/api/generate-polya', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, apiKey, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `伺服器回應錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.text || '無法產生教案';
};

export const generateRemedialTeachingPlan = async (
  input: InputData,
  customApiKey?: string,
  customModel?: string
): Promise<string> => {
  const apiKey = getEffectiveApiKey(customApiKey);
  const model = getEffectiveModel(customModel);

  const res = await fetch('/api/generate-remedial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, apiKey, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `伺服器回應錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.text || '無法產生補救教學建議';
};