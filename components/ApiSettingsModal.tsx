import React, { useState, useEffect } from 'react';
import { XIcon, KeyIcon, EyeIcon, EyeSlashIcon, ExternalLinkIcon, CheckIcon } from './Icons';
import { 
  MODEL_OPTIONS, 
  getStoredApiKey, 
  setStoredApiKey, 
  getStoredModel, 
  setStoredModel,
  testApiKey 
} from '../services/geminiService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (apiKey: string, model: string) => void;
  initialPromptMessage?: string;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialPromptMessage,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');
  const [customModel, setCustomModel] = useState('');
  const [isCustomModelActive, setIsCustomModelActive] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = getStoredApiKey();
      const storedMod = getStoredModel();
      setApiKey(storedKey);
      
      const isKnownModel = MODEL_OPTIONS.some(m => m.id === storedMod);
      if (isKnownModel) {
        setSelectedModel(storedMod);
        setIsCustomModelActive(false);
        setCustomModel('');
      } else {
        setSelectedModel('custom');
        setIsCustomModelActive(true);
        setCustomModel(storedMod);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEffectiveModel = isCustomModelActive ? (customModel.trim() || 'gemini-2.5-flash') : selectedModel;

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: '請先在上方輸入 API Key 才能進行測試喔！' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testApiKey(apiKey.trim(), currentEffectiveModel);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || '測試失敗' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    setStoredApiKey('');
    setTestResult({ success: false, message: '已清除本機儲存的 API Key。' });
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    const finalModel = isCustomModelActive ? (customModel.trim() || 'gemini-2.5-flash') : selectedModel;
    
    setStoredApiKey(trimmedKey);
    setStoredModel(finalModel);
    
    onSaved(trimmedKey, finalModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-anpan-brown/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in print:hidden">
      <div className="bg-white rounded-3xl border-4 border-anpan-brown max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl my-8 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-anpan-red text-white p-2 rounded-full border-2 border-white shadow-cartoon-sm hover:scale-110 active:scale-95 transition-transform z-10"
          title="關閉"
        >
          <XIcon />
        </button>

        {/* Modal Header */}
        <div className="border-b-4 border-anpan-brown/15 pb-4 mb-5 flex items-center space-x-3">
          <div className="w-12 h-12 bg-anpan-yellow rounded-2xl border-2 border-anpan-brown flex items-center justify-center shadow-cartoon-sm text-2xl flex-shrink-0">
            🔑
          </div>
          <div>
            <h3 className="text-2xl font-black text-anpan-brown tracking-tight">
              API 金鑰與模型設定
            </h3>
            <p className="text-sm font-bold text-anpan-brown/60">
              自由輸入您的 Google Gemini API Key，或依需求切換 AI 模型型號
            </p>
          </div>
        </div>

        {/* Optional Prompt Message Banner */}
        {initialPromptMessage && (
          <div className="mb-4 bg-amber-50 border-2 border-anpan-yellow text-anpan-brown px-4 py-3 rounded-2xl flex items-center space-x-3 text-sm font-bold shadow-sm">
            <span className="text-xl">⚠️</span>
            <span>{initialPromptMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          
          {/* Section 1: API Key Input */}
          <div className="bg-anpan-cream/50 border-2 border-anpan-brown/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-black text-anpan-brown flex items-center space-x-2">
                <KeyIcon />
                <span>Google Gemini API Key</span>
              </label>
              <div className="flex items-center space-x-2">
                {apiKey.trim() ? (
                  <span className="bg-green-100 text-green-700 text-xs font-black px-2.5 py-1 rounded-full border border-green-300 flex items-center space-x-1">
                    <span>● 已填寫自訂金鑰</span>
                  </span>
                ) : (
                  <span className="bg-sky-100 text-sky-800 text-xs font-black px-2.5 py-1 rounded-full border border-sky-300">
                    <span>使用伺服器內建金鑰</span>
                  </span>
                )}
              </div>
            </div>

            <div className="relative mt-2">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="貼上您的 Gemini API Key (例如：AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-white border-2 border-anpan-brown/40 rounded-xl text-anpan-brown font-mono text-sm focus:border-anpan-red focus:ring-2 focus:ring-anpan-red/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-anpan-brown/60 hover:text-anpan-brown p-1"
                title={showKey ? '隱藏金鑰' : '顯示金鑰'}
              >
                {showKey ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* Test Connection & Clear Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey.trim()}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 border-anpan-brown shadow-cartoon-sm flex items-center space-x-2 transition-all
                    ${isTesting || !apiKey.trim() 
                      ? 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed' 
                      : 'bg-white hover:bg-sky-50 text-anpan-brown active:translate-y-0.5 hover:shadow-none'}`}
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-anpan-brown border-t-transparent"></div>
                      <span>測試中...</span>
                    </>
                  ) : (
                    <>
                      <span>🔌 測試連線</span>
                    </>
                  )}
                </button>

                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-anpan-red hover:bg-red-50 transition-colors"
                  >
                    清除重設
                  </button>
                )}
              </div>

              {/* Toggle Tutorial */}
              <button
                type="button"
                onClick={() => setShowTutorial(!showTutorial)}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 underline flex items-center space-x-1"
              >
                <span>💡 如何免費取得 API Key？</span>
              </button>
            </div>

            {/* Test Connection Banner */}
            {testResult && (
              <div className={`mt-3 p-3 rounded-xl border-2 text-xs sm:text-sm font-bold flex items-start space-x-2 ${
                testResult.success 
                  ? 'bg-green-50 border-green-300 text-green-800' 
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                <span className="text-base">{testResult.success ? '✅' : '❌'}</span>
                <span className="leading-relaxed">{testResult.message}</span>
              </div>
            )}

            {/* Tutorial Dropdown */}
            {showTutorial && (
              <div className="mt-4 p-4 bg-sky-50 rounded-2xl border-2 border-sky-200 text-anpan-brown text-sm space-y-2.5">
                <div className="font-black text-sky-900 flex items-center justify-between">
                  <span>三步驟免費取得 Google Gemini API Key：</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                  >
                    <span>開啟 Google AI Studio</span>
                    <ExternalLinkIcon />
                  </a>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm font-medium leading-relaxed">
                  <li>點選上方按鈕開啟 <strong>Google AI Studio</strong> 並登入 Google 帳號。</li>
                  <li>點擊 <strong>「Get API key」</strong> 或 <strong>「Create API key」</strong> 按鈕。</li>
                  <li>複製產生出的金鑰（開頭通常為 <code>AIzaSy...</code>），並貼在上方輸入欄儲存即可！</li>
                </ol>
                <div className="text-[11px] text-gray-500 bg-white/70 p-2 rounded-lg border border-sky-200/60">
                  🔒 <strong>安全保證：</strong>您的金鑰僅儲存在您的瀏覽器本機端 (LocalStorage)，絕不會傳送到作者伺服器或任何第三方。
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Model Selection */}
          <div className="bg-white border-2 border-anpan-brown/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-base font-black text-anpan-brown flex items-center space-x-2">
                <span>🤖 選擇 AI 模型型號 (Model)</span>
              </label>
              <span className="text-xs font-bold bg-anpan-yellow/20 text-anpan-brown px-2 py-0.5 rounded-md border border-anpan-yellow/40">
                目前選擇: {currentEffectiveModel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MODEL_OPTIONS.map((m) => {
                const isSelected = !isCustomModelActive && selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setIsCustomModelActive(false);
                      setTestResult(null);
                    }}
                    className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all text-left flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-anpan-cream border-anpan-red shadow-cartoon-sm scale-[1.01]' 
                        : 'bg-white border-anpan-brown/20 hover:border-anpan-brown/60 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm text-anpan-brown">{m.name}</span>
                        {isSelected && <span className="text-anpan-red font-bold text-xs">✓ 已選用</span>}
                      </div>
                      <span className="inline-block text-[11px] font-bold text-anpan-red bg-white px-2 py-0.5 rounded border border-anpan-red/20 mb-1.5">
                        {m.tag}
                      </span>
                      <p className="text-xs text-anpan-brown/70 leading-relaxed font-medium">
                        {m.description}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Option: Custom Model */}
              <div
                onClick={() => {
                  setSelectedModel('custom');
                  setIsCustomModelActive(true);
                  setTestResult(null);
                }}
                className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all text-left ${
                  isCustomModelActive 
                    ? 'bg-anpan-cream border-anpan-red shadow-cartoon-sm scale-[1.01]' 
                    : 'bg-white border-anpan-brown/20 hover:border-anpan-brown/60 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-anpan-brown">🛠️ 自訂模型型號</span>
                  {isCustomModelActive && <span className="text-anpan-red font-bold text-xs">✓ 自訂</span>}
                </div>
                <span className="inline-block text-[11px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-300 mb-1.5">
                  手動輸入 Model ID
                </span>
                <p className="text-xs text-anpan-brown/70 leading-relaxed font-medium mb-2">
                  可輸入其他新版或實驗性 Gemini 型號名稱。
                </p>
                {isCustomModelActive && (
                  <input
                    type="text"
                    placeholder="例如：gemini-2.5-pro"
                    value={customModel}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border-2 border-anpan-brown/40 rounded-lg text-anpan-brown focus:border-anpan-red outline-none"
                  />
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-anpan-brown/15 pt-4 mt-4 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border-2 border-anpan-brown font-bold text-anpan-brown hover:bg-gray-100 transition-colors text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full bg-anpan-red text-white border-2 border-anpan-brown font-black shadow-cartoon-sm hover:shadow-none hover:translate-y-0.5 transition-all text-sm flex items-center space-x-2"
          >
            <CheckIcon />
            <span>儲存並套用</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ApiSettingsModal;
