import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import AnalysisDisplay from './components/AnalysisDisplay';
import ApiSettingsModal from './components/ApiSettingsModal';
import { 
  analyzeQuestion, 
  getStoredApiKey, 
  getStoredModel, 
  getEffectiveApiKey,
  checkServerStatus 
} from './services/geminiService';
import { AnalysisResult, AppState, InputData } from './types';
import { XIcon, MailIcon, UserIcon, EyeIcon, BulbIcon, KeyIcon, GearIcon } from './components/Icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<InputData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // API Key & Model State
  const [apiKey, setApiKey] = useState<string>('');
  const [hasServerKey, setHasServerKey] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [showApiSettingsModal, setShowApiSettingsModal] = useState<boolean>(false);
  const [apiSettingsPrompt, setApiSettingsPrompt] = useState<string>('');
  const [pendingInput, setPendingInput] = useState<{ data: InputData; preview: string } | null>(null);

  // Stats State
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);

  useEffect(() => {
    // 檢查後端伺服器金鑰狀態
    checkServerStatus().then((status) => {
      setHasServerKey(status.hasServerKey);
    });

    // 讀取本機儲存的 API Key 與模型型號
    const storedKey = getStoredApiKey();
    const storedModel = getStoredModel();
    if (storedKey) setApiKey(storedKey);
    if (storedModel) setSelectedModel(storedModel);

    // 模擬真實的累計人次 (儲存在 LocalStorage 中，讓數字會持續增加)
    const storedVisits = localStorage.getItem('exam_analyst_visits');
    let currentVisits = storedVisits ? parseInt(storedVisits) : 15842;
    // 每次重新整理 +1
    currentVisits += 1;
    localStorage.setItem('exam_analyst_visits', currentVisits.toString());
    
    setTotalVisits(currentVisits);
    // 隨機產生線上人數 (模擬 10-50 人)
    setOnlineUsers(Math.floor(Math.random() * 40) + 10);
  }, []);

  const runAnalysis = async (data: InputData, preview: string, keyToUse?: string, modelToUse?: string) => {
    setPreviewContent(preview);
    setCurrentInput(data);
    setAppState(AppState.ANALYZING);
    setErrorMessage('');
    
    // Scroll to preview mainly for mobile feeling
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const activeKey = keyToUse !== undefined ? keyToUse : apiKey;
      const activeModel = modelToUse || selectedModel;
      const result = await analyzeQuestion(data, activeKey, activeModel);
      setAnalysisResult(result);
      setAppState(AppState.SUCCESS);
      setPendingInput(null);
    } catch (error: any) {
      console.error(error);
      setAppState(AppState.ERROR);
      setErrorMessage(error?.message || "分析過程中發生錯誤。請確認您的 API Key 是否正確或更換型號後再試。");
    }
  };

  const handleInputSelected = async (data: InputData, preview: string) => {
    // 檢查是否有配置有效 API Key (使用者自訂或伺服器已內建)
    const effectiveKey = getEffectiveApiKey(apiKey);
    if (!effectiveKey && !hasServerKey) {
      setPendingInput({ data, preview });
      setPreviewContent(preview);
      setCurrentInput(data);
      setApiSettingsPrompt("💡 請先輸入您的 Google Gemini API Key，儲存後小幫手將自動為您開始分析！");
      setShowApiSettingsModal(true);
      return;
    }

    await runAnalysis(data, preview);
  };

  const handleApiSettingsSaved = (newKey: string, newModel: string) => {
    setApiKey(newKey);
    setSelectedModel(newModel);
    
    // 如果有尚未分析的題目，立即繼續分析
    if (pendingInput && newKey.trim()) {
      runAnalysis(pendingInput.data, pendingInput.preview, newKey, newModel);
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setPreviewContent(null);
    setCurrentInput(null);
    setAnalysisResult(null);
    setErrorMessage('');
    setPendingInput(null);
    setIsImageModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-12 print:bg-white print:pb-0 flex flex-col font-sans">
      {/* Header - Anpanman Red Style (Screen Only) */}
      <header className="bg-anpan-red border-b-4 border-anpan-brown sticky top-0 z-30 shadow-cartoon print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Cartoon Logo */}
            <div className="w-10 h-10 bg-anpan-yellow rounded-full border-2 border-anpan-brown flex items-center justify-center shadow-cartoon-sm">
               <span className="text-xl">😊</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider drop-shadow-md">
              試題分析小幫手(優履工作室研發)
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              type="button"
              onClick={() => { setApiSettingsPrompt(''); setShowApiSettingsModal(true); }}
              className="bg-white border-2 border-anpan-brown text-anpan-brown px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold shadow-cartoon-sm hover:translate-y-0.5 hover:shadow-none transition-all text-xs sm:text-sm flex items-center space-x-1.5"
              title="設定 Gemini API Key 或更換 AI 模型型號"
            >
              <span className="text-base">🔑</span>
              <span className="hidden md:inline">API 金鑰與型號</span>
              <span className="md:hidden">API/型號</span>
              {apiKey.trim() ? (
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-green-300">
                  自訂 Key
                </span>
              ) : hasServerKey ? (
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-green-300">
                  伺服器已就緒
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                  未設定
                </span>
              )}
            </button>

            {appState !== AppState.IDLE && (
              <button 
                onClick={resetApp}
                className="bg-white border-2 border-anpan-brown text-anpan-brown px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold shadow-cartoon-sm hover:translate-y-0.5 hover:shadow-none transition-all text-xs sm:text-sm"
              >
                🔄 重新上傳
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:max-w-none print:px-0 flex-grow w-full">
        
        {/* Print-Only Report Header */}
        {appState === AppState.SUCCESS && (
          <div className="hidden print:flex flex-col items-center justify-center mb-8 border-b-2 border-anpan-brown pb-4">
            <h1 className="text-3xl font-black text-anpan-brown mb-2">試題分析小幫手報告</h1>
            <p className="text-sm text-gray-500 font-bold">優履工作室研發 | 模型: {selectedModel} | 分析日期: {new Date().toLocaleDateString()}</p>
          </div>
        )}

        {/* State: IDLE - New Dashboard Layout */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col gap-6 print:hidden">
            
            {/* Top Area: Resources & Help */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Resource Links (Blue Theme) - Spans 2 cols */}
              <div className="md:col-span-2 bg-sky-100 border-4 border-anpan-brown rounded-3xl p-6 relative shadow-cartoon-sm hover:shadow-cartoon transition-shadow">
                <div className="absolute -top-4 -left-3 bg-sky-500 text-white px-4 py-1 rounded-full border-2 border-anpan-brown font-black transform -rotate-2">
                  資源連結
                </div>
                <p className="text-anpan-brown font-bold mb-4 mt-2 leading-relaxed">
                  若您想要試試<span className="text-anpan-red mx-1">學力檢測</span>或是<span className="text-anpan-red mx-1">篩選測驗</span>的題目分析，可以點選連結進入後，挑選其中的題目以便於主要操作區上傳：
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href="https://padlet.com/cdrcdr/breakout-room/ldoNv8bGKDGD2JXV-W7ZVbegpqEZ5XNDM" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 bg-white border-2 border-anpan-brown rounded-xl px-4 py-3 hover:bg-sky-50 transition-colors group"
                  >
                    <span className="text-xl">📚</span>
                    <span className="font-bold text-anpan-brown">數學學力檢測 <span className="text-xs text-gray-500">(題目整理)</span></span>
                  </a>
                  <a 
                    href="https://padlet.com/cdrcdr/breakout-room/Bbjnqxr8bYBZ493Q-W7ZVbegpqEZ5XNDM" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 bg-white border-2 border-anpan-brown rounded-xl px-4 py-3 hover:bg-sky-50 transition-colors group"
                  >
                    <span className="text-xl">🔍</span>
                    <span className="font-bold text-anpan-brown">數學篩選測驗 <span className="text-xs text-gray-500">(題目整理)</span></span>
                  </a>
                </div>
              </div>

              {/* 2. Help/Instructions (Green Theme) - Spans 1 col */}
              <div className="md:col-span-1 bg-melon-green/20 border-4 border-anpan-brown rounded-3xl p-6 flex flex-col justify-center items-center text-center shadow-cartoon-sm hover:shadow-cartoon transition-shadow relative">
                 <div className="absolute -top-4 -right-3 bg-melon-green text-white px-4 py-1 rounded-full border-2 border-anpan-brown font-black transform rotate-2">
                  使用說明
                </div>
                 <div className="mb-3 text-4xl">💡</div>
                 <h3 className="font-black text-anpan-brown text-xl mb-2">不知道怎麼用？</h3>
                 <button 
                    onClick={() => setShowHelpModal(true)}
                    className="w-full bg-white border-2 border-anpan-brown text-anpan-brown font-bold py-3 px-4 rounded-xl hover:bg-green-50 hover:scale-105 transition-all shadow-sm flex items-center justify-center space-x-2"
                 >
                   <span>點我查看操作說明</span>
                 </button>
              </div>
            </div>

            {/* Middle Area: Main Action (Yellow Theme) */}
            <div className="cartoon-card bg-anpan-cream p-8 md:p-12 relative overflow-visible mt-4 border-4">
               {/* "Main Area" Tag */}
               <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-anpan-red text-white px-8 py-2 rounded-full border-4 border-anpan-brown font-black text-xl shadow-md z-10 whitespace-nowrap">
                 👇 主要操作區在此 👇
               </div>

               {/* Decorative elements */}
               <div className="absolute top-8 right-8 w-6 h-6 rounded-full bg-anpan-yellow border-2 border-anpan-brown opacity-60 hidden md:block"></div>
               <div className="absolute bottom-8 left-8 w-4 h-4 rounded-full bg-sky-blue border-2 border-anpan-brown opacity-60 hidden md:block"></div>

              <div className="text-center mb-6 relative z-0 mt-4">
                <h2 className="text-4xl md:text-5xl font-black text-anpan-brown mb-4 tracking-tight">
                  試題分析小幫手
                </h2>
                <div className="inline-block bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 border-2 border-anpan-brown/10">
                  <p className="text-anpan-brown font-bold text-lg md:text-xl">
                    把數學題目拍下來、上傳檔案或貼上，讓我來幫你分析！
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2 text-sm md:text-base font-bold text-anpan-red">
                    <span className="bg-white px-2 py-1 rounded-md border border-anpan-red/20">★ 找出誘答陷阱</span>
                    <span className="bg-white px-2 py-1 rounded-md border border-anpan-red/20">★ 分析錯題原因</span>
                    <span className="bg-white px-2 py-1 rounded-md border border-anpan-red/20">★ 提供教學建議</span>
                  </div>
                </div>
              </div>

              {/* Dedicated API Key & Model Configuration Card */}
              <div className="max-w-xl mx-auto mb-6 bg-white/95 border-3 border-anpan-brown rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <div className="w-10 h-10 bg-anpan-yellow/40 rounded-xl border-2 border-anpan-brown flex items-center justify-center text-xl flex-shrink-0">
                    🤖
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-anpan-brown/70">使用型號：</span>
                      <span className="text-xs sm:text-sm font-black text-anpan-brown bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 truncate">
                        {selectedModel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-bold text-anpan-brown/70">API 狀態：</span>
                      {apiKey.trim() ? (
                        <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          ✓ 已套用個人自訂金鑰
                        </span>
                      ) : hasServerKey ? (
                        <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          ✓ 伺服器就緒 (可直接開始使用)
                        </span>
                      ) : (
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                          ⚠️ 尚未設定 (點右側輸入)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setApiSettingsPrompt(''); setShowApiSettingsModal(true); }}
                  className="w-full sm:w-auto bg-anpan-yellow hover:bg-yellow-400 border-2 border-anpan-brown text-anpan-brown px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-cartoon-sm hover:shadow-none hover:translate-y-0.5 active:scale-95 transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
                >
                  <KeyIcon />
                  <span>自行輸入 API / 選擇型號</span>
                </button>
              </div>
              
              <div className="max-w-xl mx-auto transform hover:scale-[1.01] transition-transform duration-300">
                <ImageUploader 
                  onInputSelected={handleInputSelected} 
                  isLoading={false} 
                />
              </div>
              
              <div className="mt-6 text-sm text-anpan-brown/50 text-center font-bold">
                ⚡ Powered by Google Gemini AI ({selectedModel})
              </div>
            </div>

            {/* Footer / Stats Section */}
            <div className="bg-white border-t-4 border-anpan-brown/20 rounded-t-3xl mt-4 p-6 shadow-inner">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-anpan-brown">
                {/* Contact */}
                <a 
                  href="mailto:qekepv@gmail.com" 
                  className="flex items-center space-x-3 bg-anpan-cream px-5 py-2 rounded-full border-2 border-anpan-brown hover:bg-anpan-red hover:text-white transition-all group shadow-sm"
                >
                  <MailIcon />
                  <span className="font-bold">問題反應信箱: qekepv@gmail.com</span>
                </a>

                {/* Stats */}
                <div className="flex items-center space-x-6 text-base font-black bg-gray-50 px-6 py-2 rounded-full border-2 border-gray-200">
                  <div className="flex items-center space-x-2" title="目前線上使用人數">
                    <span className="text-green-500 animate-pulse">●</span>
                    <UserIcon />
                    <span>線上人數: <span className="text-anpan-red text-xl">{onlineUsers}</span> 人</span>
                  </div>
                  <div className="h-6 w-0.5 bg-gray-300"></div>
                  <div className="flex items-center space-x-2" title="累計使用人次">
                    <EyeIcon />
                    <span>累計人次: <span className="text-anpan-red text-xl">{totalVisits.toLocaleString()}</span> 人次</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}

        {/* State: NON-IDLE - Layout with sidebar/topbar for image and content */}
        {appState !== AppState.IDLE && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
            
            {/* Left Column: Input Preview */}
            <div className="lg:col-span-1 print:mb-6 print:w-full print:break-inside-avoid">
              <div className="sticky top-28 space-y-4 print:static">
                <div className="cartoon-card p-2 bg-white print:transform-none print:border-2 print:border-anpan-brown print:p-4 print:shadow-none">
                  <div className="bg-anpan-yellow text-anpan-brown font-bold text-center py-2 rounded-lg mb-2 border-2 border-anpan-brown border-dashed print:bg-anpan-yellow print:text-anpan-brown print:border-anpan-brown">
                    {currentInput?.type === 'image' ? '📸 原始題目 (點擊放大)' : '✏️ 原始題目文字'}
                  </div>
                  
                  {/* Image Preview */}
                  {currentInput?.type === 'image' && previewContent && (
                    <>
                      <img 
                        src={previewContent} 
                        alt="Uploaded Question" 
                        onClick={() => setIsImageModalOpen(true)}
                        className="w-full h-auto rounded-xl border-2 border-gray-100 object-contain max-h-[800px] lg:max-h-[1200px] print:max-h-[40vh] print:mx-auto print:border-none cursor-zoom-in"
                      />
                      {/* Full Screen Image Modal */}
                      {isImageModalOpen && (
                        <div 
                          className="fixed inset-0 z-50 bg-anpan-brown/95 flex items-center justify-center p-4 cursor-zoom-out print:hidden"
                          onClick={() => setIsImageModalOpen(false)}
                        >
                          <div className="relative max-w-full max-h-full">
                            <img 
                              src={previewContent} 
                              alt="Full size" 
                              className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl border-4 border-anpan-yellow"
                            />
                            <button className="absolute -top-4 -right-4 bg-anpan-red text-white p-2 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform">
                              <XIcon />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Text Preview */}
                  {currentInput?.type === 'text' && previewContent && (
                    <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 h-full max-h-[400px] overflow-y-auto whitespace-pre-wrap font-medium text-anpan-brown text-base leading-relaxed print:max-h-none print:border-none">
                       {previewContent}
                    </div>
                  )}

                </div>
                
                {appState === AppState.ANALYZING && (
                  <div className="cartoon-card bg-white p-6 flex flex-col items-center justify-center text-center py-10 print:hidden">
                     <div className="animate-bounce text-4xl mb-4">🤔</div>
                     <p className="font-bold text-xl text-anpan-brown">正在動腦筋分析中...</p>
                     <p className="text-sm text-anpan-brown/60 mt-1">使用模型：{selectedModel}</p>
                     <p className="text-xs text-anpan-brown/40 mt-1">請稍等一下喔！</p>
                  </div>
                )}
                 
                 {appState === AppState.ERROR && (
                   <div className="cartoon-card bg-red-50 p-5 border-anpan-red print:hidden space-y-3">
                      <p className="text-anpan-red font-bold text-center text-lg">哎呀！出錯了 😵</p>
                      <p className="text-sm text-anpan-brown text-center leading-relaxed bg-white/70 p-3 rounded-xl border border-red-200">
                        {errorMessage}
                      </p>
                      <div className="flex flex-col gap-2 pt-1">
                        <button 
                          onClick={() => { setApiSettingsPrompt(''); setShowApiSettingsModal(true); }}
                          className="w-full py-2.5 bg-anpan-yellow hover:bg-yellow-400 text-anpan-brown border-2 border-anpan-brown rounded-full font-bold shadow-cartoon-sm hover:shadow-none hover:translate-y-0.5 transition-all text-sm flex items-center justify-center space-x-1"
                        >
                          <KeyIcon />
                          <span>更換 API Key 或選擇其他型號</span>
                        </button>
                        <button 
                          onClick={resetApp}
                          className="w-full py-2 bg-anpan-red hover:bg-red-600 text-white border-2 border-anpan-brown rounded-full font-bold shadow-cartoon-sm hover:shadow-none hover:translate-y-0.5 transition-all text-sm"
                        >
                          重新開始
                        </button>
                      </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Right Column: Analysis Results */}
            <div className="lg:col-span-2 print:w-full">
              {appState === AppState.SUCCESS && analysisResult && currentInput && (
                <AnalysisDisplay 
                  data={analysisResult} 
                  inputData={currentInput} 
                  apiKey={apiKey}
                  model={selectedModel}
                  onOpenSettings={() => { setApiSettingsPrompt(''); setShowApiSettingsModal(true); }}
                />
              )}
            </div>
          </div>
        )}

        {/* API Key & Model Settings Modal */}
        <ApiSettingsModal
          isOpen={showApiSettingsModal}
          onClose={() => { setShowApiSettingsModal(false); setApiSettingsPrompt(''); }}
          onSaved={handleApiSettingsSaved}
          initialPromptMessage={apiSettingsPrompt}
        />

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 bg-anpan-brown/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl border-4 border-anpan-brown max-w-lg w-full p-6 relative shadow-2xl">
               <button 
                  onClick={() => setShowHelpModal(false)}
                  className="absolute -top-4 -right-4 bg-anpan-red text-white p-2 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform"
               >
                 <XIcon />
               </button>
               
               <div className="text-center mb-6 border-b-2 border-anpan-brown/10 pb-4">
                 <h3 className="text-2xl font-black text-anpan-brown">📖 操作說明</h3>
               </div>

               <div className="space-y-6">
                 <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-anpan-yellow rounded-full flex items-center justify-center text-anpan-brown font-black text-xl border-2 border-anpan-brown flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-anpan-brown">拍照或上傳題目</h4>
                      <p className="text-anpan-brown/80">
                        您可以選擇：
                        <ul className="list-disc pl-5 mt-1 text-sm font-bold text-anpan-red space-y-1">
                           <li>上傳題目圖片或檔案 (拍照、選取檔案或直接貼上)</li>
                           <li>自行輸入題目文字</li>
                        </ul>
                        小幫手會立即為您分析。
                      </p>
                    </div>
                 </div>

                 <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-melon-green rounded-full flex items-center justify-center text-white font-black text-xl border-2 border-anpan-brown flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-anpan-brown">取得教學建議</h4>
                      <p className="text-anpan-brown/80">
                        針對分析結果，提供老師具體的教學建議，包含：
                        <ul className="list-disc pl-5 mt-2 space-y-1 font-bold text-sm text-anpan-red">
                          <li>類似題練習</li>
                          <li>數學臆測教學</li>
                          <li>Polya 解題策略</li>
                          <li>補救教學計畫</li>
                        </ul>
                      </p>
                    </div>
                 </div>

                 <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-sky-400 rounded-full flex items-center justify-center text-white font-black text-xl border-2 border-anpan-brown flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-anpan-brown">自備 API Key 與切換型號</h4>
                      <p className="text-anpan-brown/80">
                        點擊畫面右上角或控制列上的<strong>「🔑 自行輸入 API / 選擇型號」</strong>，可隨時輸入自己的 Gemini 金鑰，並自由切換 Flash、Pro 或其他型號。
                      </p>
                    </div>
                 </div>
               </div>

               <div className="mt-8">
                 <button 
                   onClick={() => setShowHelpModal(false)}
                   className="w-full bg-anpan-brown text-white font-bold py-3 rounded-xl hover:bg-anpan-brown/90 transition-colors"
                 >
                   我知道了！
                 </button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;