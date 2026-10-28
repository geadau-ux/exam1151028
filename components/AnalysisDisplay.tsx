import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AnalysisResult, Distractor, ErrorCause, TeachingSuggestion, InputData } from '../types';
import { BulbIcon, CheckIcon, AlertIcon, DownloadIcon, XIcon, FirstAidIcon, MinimizeIcon, MaximizeIcon } from './Icons';
import { generateSimilarQuestions, generateConjecturingLessonPlan, generatePolyaLessonPlan, generateRemedialTeachingPlan } from '../services/geminiService';

interface AnalysisDisplayProps {
  data: AnalysisResult;
  inputData: InputData;
  apiKey?: string;
  model?: string;
  onOpenSettings?: () => void;
}

interface GeneratedResult {
  id: string;
  title: string;
  content: string;
  isMinimized: boolean;
  timestamp: number;
}

// Custom Markdown Renderer Component
const MarkdownRenderer = ({ content, className = "" }: { content: string, className?: string }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-black text-anpan-brown my-4 border-b-2 border-anpan-brown/20 pb-2" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold text-anpan-brown my-3 mt-6" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold text-anpan-brown/90 my-2 mt-4" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="pl-1 marker:text-anpan-brown/60" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-anpan-yellow bg-yellow-50 pl-4 py-2 my-4 italic rounded-r" {...props} />,
          code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-anpan-red" {...props} />,
          pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3 text-sm" {...props} />,
          strong: ({node, ...props}) => <strong className="font-black text-anpan-brown" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  data, 
  inputData, 
  apiKey, 
  model, 
  onOpenSettings 
}) => {
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [loadingFeature, setLoadingFeature] = useState<string | null>(null);

  const handleDownloadTxt = () => {
    // Construct the text content
    const dateStr = new Date().toLocaleDateString();
    let content = `試題分析小幫手(優履工作室研發) - 分析報告\n`;
    content += `分析日期: ${dateStr}\n`;
    content += `使用模型: ${model || 'gemini-2.5-flash'}\n`;
    content += `============================================\n\n`;

    content += `一、題目主要檢測的能力面向\n`;
    content += `--------------------------------------------\n`;
    content += `${data.abilityAssessment}\n\n`;

    content += `二、誘答選項與理由\n`;
    content += `--------------------------------------------\n`;
    if (data.distractors.length > 0) {
      data.distractors.forEach((item) => {
        content += `[選項 ${item.option}]\n`;
        content += `理由: ${item.reason}\n\n`;
      });
    } else {
      content += `未檢測到明顯的誘答選項。\n\n`;
    }

    content += `三、錯題主因分析\n`;
    content += `--------------------------------------------\n`;
    data.errorCauses.forEach((cause, index) => {
      content += `${index + 1}. ${cause.title}\n`;
      content += `   概述: ${cause.summary}\n\n`;
    });

    content += `四、教學重點與建議\n`;
    content += `--------------------------------------------\n`;
    data.teachingSuggestions.forEach((suggestion, index) => {
      content += `重點 ${index + 1}: ${suggestion.title}\n`;
      suggestion.points.forEach((point) => {
        content += `  • ${point}\n`;
      });
      content += `\n`;
    });
    
    // Create blob and download link
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filenameDate = new Date().toISOString().split('T')[0];
    link.download = `國小數學試題分析報告_${filenameDate}.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadResultContent = (result: GeneratedResult) => {
    const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filenameDate = new Date().toISOString().split('T')[0];
    link.download = `${result.title}_${filenameDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerFeature = async (
    featureName: string, 
    apiCall: (input: InputData, key?: string, model?: string) => Promise<string>,
    title: string
  ) => {
    setLoadingFeature(featureName);
    try {
      const content = await apiCall(inputData, apiKey, model);
      
      setResults(prev => {
        // Automatically minimize any currently open windows to focus on the new one
        const minimizedPrev = prev.map(r => ({ ...r, isMinimized: true }));
        
        const newResult: GeneratedResult = {
          id: Date.now().toString(),
          title: title,
          content: content,
          isMinimized: false,
          timestamp: Date.now()
        };
        return [...minimizedPrev, newResult];
      });

    } catch (error: any) {
      console.error(error);
      alert(error?.message || "生成內容時發生錯誤，請確認 API Key 與模型設定後重試。");
    } finally {
      setLoadingFeature(null);
    }
  };

  const toggleMinimize = (id: string, minimize: boolean) => {
    setResults(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, isMinimized: minimize };
      }
      // If we are maximizing a window (minimize = false), minimize all others to ensure only one modal
      if (!minimize) {
        return { ...r, isMinimized: true };
      }
      return r;
    }));
  };

  const closeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  // Derived state for rendering
  const activeResult = results.find(r => !r.isMinimized);
  const minimizedResults = results.filter(r => r.isMinimized);

  return (
    <div className="space-y-8 pb-12 print:space-y-6">
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden mb-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center space-x-2 bg-white border-2 border-anpan-brown px-4 py-2 rounded-full font-bold text-sm text-anpan-brown shadow-cartoon-sm hover:bg-yellow-50 active:translate-y-0.5 transition-all"
            title="點擊切換模型或設定 API Key"
          >
            <span>🤖 模型：</span>
            <span className="text-anpan-red font-black">{model || 'gemini-2.5-flash'}</span>
            <span className="text-xs bg-anpan-yellow/40 text-anpan-brown px-2 py-0.5 rounded-md border border-anpan-brown/20 font-bold">
              切換/設定
            </span>
          </button>
        </div>

        <button
          onClick={handleDownloadTxt}
          className="group relative flex items-center space-x-2 bg-anpan-yellow border-2 border-anpan-brown text-anpan-brown px-6 py-3 rounded-full text-base font-bold shadow-cartoon hover:shadow-none hover:translate-y-1 transition-all"
        >
          <DownloadIcon />
          <span>下載分析內容 (TXT)</span>
        </button>
      </div>

      {/* Section I: Ability Assessment */}
      <section className="cartoon-card overflow-hidden break-inside-avoid print:border-anpan-brown print:border-3">
        <div className="bg-anpan-red px-6 py-4 border-b-2 border-anpan-brown flex items-center print:bg-anpan-red print:text-white print:border-b-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 border-2 border-anpan-brown shadow-sm text-anpan-red font-black text-xl print:hidden">
            1
          </div>
          <h2 className="text-xl font-bold text-white print:text-white">
            <span className="hidden print:inline mr-2">一、</span>
            題目主要檢測的能力面向
          </h2>
        </div>
        <div className="p-6 md:p-8 bg-white print:p-6">
          <div className="text-anpan-brown leading-relaxed text-lg font-medium">
            <MarkdownRenderer content={data.abilityAssessment} />
          </div>
        </div>
      </section>

      {/* Section II: Distractors */}
      <section className="cartoon-card overflow-hidden break-inside-avoid print:border-anpan-brown print:border-3">
        <div className="bg-baikin-purple px-6 py-4 border-b-2 border-anpan-brown flex items-center print:bg-baikin-purple print:text-white print:border-b-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 border-2 border-anpan-brown shadow-sm text-baikin-purple font-black text-xl print:hidden">
            2
          </div>
          <h2 className="text-xl font-bold text-white print:text-white">
             <span className="hidden print:inline mr-2">二、</span>
             誘答選項與理由
          </h2>
        </div>
        <div className="p-6 md:p-8 bg-white print:p-6">
          <div className="grid gap-4 md:grid-cols-2 print:block print:space-y-4">
            {data.distractors.map((item: Distractor, idx: number) => (
              <div key={idx} className="bg-purple-50 rounded-2xl p-5 border-2 border-baikin-purple print:border-2 print:border-baikin-purple print:bg-purple-50">
                <div className="flex items-center mb-3">
                  <span className="bg-baikin-purple text-white text-sm font-bold px-3 py-1 rounded-full border border-anpan-brown shadow-sm mr-3 print:border">
                    選項 {item.option}
                  </span>
                  <h3 className="font-bold text-baikin-purple">誘答分析</h3>
                </div>
                <div className="text-anpan-brown text-base leading-relaxed">
                   <MarkdownRenderer content={item.reason} />
                </div>
              </div>
            ))}
            {data.distractors.length === 0 && (
              <p className="text-gray-500 italic">未檢測到明顯的誘答選項。</p>
            )}
          </div>
        </div>
      </section>

      {/* Section III: Error Causes */}
      <section className="cartoon-card overflow-hidden break-inside-avoid print:border-anpan-brown print:border-3">
        <div className="bg-anpan-yellow px-6 py-4 border-b-2 border-anpan-brown flex items-center print:bg-anpan-yellow print:text-anpan-brown print:border-b-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 border-2 border-anpan-brown shadow-sm text-amber-500 font-black text-xl print:hidden">
            3
          </div>
          <h2 className="text-xl font-bold text-anpan-brown print:text-anpan-brown">
             <span className="hidden print:inline mr-2">三、</span>
             錯題主因分析
          </h2>
        </div>
        <div className="p-6 md:p-8 bg-white print:p-6">
          <div className="grid gap-6 md:grid-cols-2 print:block print:space-y-4">
            {data.errorCauses.map((cause: ErrorCause, idx: number) => (
              <div key={idx} className="flex items-start space-x-4 p-5 rounded-2xl bg-orange-50 border-2 border-orange-200 print:border-2 print:border-orange-200 print:bg-orange-50">
                <div className="flex-shrink-0 mt-1 print:hidden">
                  <AlertIcon />
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-lg text-anpan-brown mb-2">{cause.title}</h3>
                  <div className="text-anpan-brown/80 text-base leading-relaxed">
                    <MarkdownRenderer content={cause.summary} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section IV: Teaching Suggestions */}
      <section className="cartoon-card overflow-hidden break-inside-avoid print:border-anpan-brown print:border-3">
        <div className="bg-melon-green px-6 py-4 border-b-2 border-anpan-brown flex items-center print:bg-melon-green print:text-white print:border-b-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 border-2 border-anpan-brown shadow-sm text-green-600 font-black text-xl print:hidden">
            4
          </div>
          <h2 className="text-xl font-bold text-white print:text-white">
             <span className="hidden print:inline mr-2">四、</span>
             教學重點與建議
          </h2>
        </div>
        <div className="p-6 md:p-8 space-y-8 bg-white print:p-6 print:space-y-4">
          {data.teachingSuggestions.map((suggestion: TeachingSuggestion, idx: number) => (
            <div key={idx} className="bg-green-50/50 rounded-2xl p-6 border border-green-100 print:border print:border-green-100 print:bg-green-50">
              <div className="flex items-center mb-4 print:mb-2">
                <div className="bg-melon-green p-2 rounded-full mr-3 border-2 border-anpan-brown shadow-sm print:hidden">
                  <BulbIcon />
                </div>
                <h3 className="text-xl font-black text-anpan-brown print:text-lg">
                  重點 {idx + 1}: {suggestion.title}
                </h3>
              </div>
              <ul className="space-y-3 pl-2 md:pl-4 print:pl-4">
                {suggestion.points.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start text-anpan-brown">
                    <span className="mt-2 w-2 h-2 bg-melon-green border border-green-600 rounded-full flex-shrink-0 mr-3 print:bg-melon-green print:border-green-600"></span>
                    <div className="text-base font-medium leading-relaxed w-full">
                       <MarkdownRenderer content={point} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Features Section */}
      <div className="mt-12 print:hidden">
        {/* Instruction Text */}
        <p className="text-center text-anpan-brown font-bold text-lg mb-6 bg-white/50 py-2 rounded-xl border-2 border-anpan-brown/20 mx-auto max-w-2xl">
           💡 請依照您的需求，自由點選下方的延伸功能 (不需按順序執行喔！)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => triggerFeature('similar', generateSimilarQuestions, '類似題練習')}
            disabled={!!loadingFeature}
            className={`
              relative p-6 h-auto rounded-3xl border-3 border-anpan-brown shadow-cartoon 
              flex flex-col items-center justify-center space-y-3 transition-all transform hover:-translate-y-2
              ${loadingFeature === 'similar' ? 'bg-gray-100 opacity-80' : 'bg-sky-200 hover:shadow-xl'}
            `}
          >
            {loadingFeature === 'similar' ? (
               <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-anpan-brown"></div>
            ) : (
               <span className="text-5xl mb-2">📝</span>
            )}
            <span className="font-black text-anpan-brown text-2xl tracking-wide">練習類似題</span>
            <span className="text-sm text-anpan-brown/80 font-bold bg-white/40 px-3 py-1 rounded-full">
              生成 3 題類題與解析
            </span>
          </button>

          <button 
            onClick={() => triggerFeature('remedial', generateRemedialTeachingPlan, '補救教學流程建議')}
            disabled={!!loadingFeature}
            className={`
              relative p-6 h-auto rounded-3xl border-3 border-anpan-brown shadow-cartoon 
              flex flex-col items-center justify-center space-y-3 transition-all transform hover:-translate-y-2
              ${loadingFeature === 'remedial' ? 'bg-gray-100 opacity-80' : 'bg-rose-200 hover:shadow-xl'}
            `}
          >
            {loadingFeature === 'remedial' ? (
               <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-anpan-brown"></div>
            ) : (
               <div className="mb-2 bg-white rounded-full p-2 border-2 border-anpan-brown shadow-sm">
                  <FirstAidIcon />
               </div>
            )}
            <span className="font-black text-anpan-brown text-2xl tracking-wide">補救教學建議</span>
            <span className="text-sm text-anpan-brown/80 font-bold bg-white/40 px-3 py-1 rounded-full">
              診斷、差異化與評量建議
            </span>
          </button>

          <button 
            onClick={() => triggerFeature('polya', generatePolyaLessonPlan, 'Polya解題教學教案')}
            disabled={!!loadingFeature}
            className={`
              relative p-6 h-auto rounded-3xl border-3 border-anpan-brown shadow-cartoon 
              flex flex-col items-center justify-center space-y-3 transition-all transform hover:-translate-y-2
              ${loadingFeature === 'polya' ? 'bg-gray-100 opacity-80' : 'bg-orange-200 hover:shadow-xl'}
            `}
          >
            {loadingFeature === 'polya' ? (
               <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-anpan-brown"></div>
            ) : (
               <span className="text-5xl mb-2">🧩</span>
            )}
            <span className="font-black text-anpan-brown text-2xl tracking-wide">Polya解題教案</span>
            <span className="text-sm text-anpan-brown/80 font-bold bg-white/40 px-3 py-1 rounded-full">
              產出 40分/20分 教案
            </span>
          </button>

          <button 
            onClick={() => triggerFeature('conjecturing', generateConjecturingLessonPlan, '數學臆測教學教案')}
            disabled={!!loadingFeature}
            className={`
              relative p-6 h-auto rounded-3xl border-3 border-anpan-brown shadow-cartoon 
              flex flex-col items-center justify-center space-y-3 transition-all transform hover:-translate-y-2
              ${loadingFeature === 'conjecturing' ? 'bg-gray-100 opacity-80' : 'bg-purple-200 hover:shadow-xl'}
            `}
          >
            {loadingFeature === 'conjecturing' ? (
               <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-anpan-brown"></div>
            ) : (
               <span className="text-5xl mb-2">🧠</span>
            )}
            <span className="font-black text-anpan-brown text-2xl tracking-wide">數學臆測教案</span>
            <span className="text-sm text-anpan-brown/80 font-bold bg-white/40 px-3 py-1 rounded-full">
              產出 40分/20分 教案
            </span>
          </button>
        </div>
      </div>

      {/* --- Generated Results Manager --- */}
      
      {/* 1. Modal for Active Result */}
      {activeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-anpan-brown/80 print:hidden backdrop-blur-sm transition-opacity duration-300">
           {/* Modal Card */}
           <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl border-4 border-anpan-brown shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
              {/* Header */}
              <div className="bg-anpan-yellow p-4 border-b-2 border-anpan-brown flex justify-between items-center">
                <h3 className="text-xl font-black text-anpan-brown flex items-center">
                  <span className="mr-2">📄</span> {activeResult.title}
                </h3>
                <div className="flex space-x-2">
                   <button
                      onClick={() => handleDownloadResultContent(activeResult)}
                      className="bg-white/50 hover:bg-white text-anpan-brown px-3 py-1 rounded-full text-sm font-bold border border-anpan-brown/20 transition-colors flex items-center"
                   >
                      <DownloadIcon /> <span className="ml-1 hidden sm:inline">下載文字檔</span>
                   </button>
                   <button
                      onClick={() => toggleMinimize(activeResult.id, true)}
                      className="bg-sky-200 text-anpan-brown p-2 rounded-full border-2 border-white/50 hover:scale-110 transition-transform shadow-sm"
                      title="最小化"
                   >
                      <MinimizeIcon />
                   </button>
                   <button
                      onClick={() => closeResult(activeResult.id)}
                      className="bg-anpan-red text-white p-2 rounded-full border-2 border-white hover:scale-110 transition-transform shadow-sm"
                      title="關閉"
                   >
                      <XIcon />
                   </button>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-anpan-cream/30">
                <div className="text-anpan-brown font-medium leading-relaxed">
                  <MarkdownRenderer content={activeResult.content} />
                </div>
              </div>
           </div>
        </div>
      )}

      {/* 2. Dock for Minimized Results */}
      {minimizedResults.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3 pointer-events-none">
          {minimizedResults.map((result) => (
            <div 
              key={result.id} 
              className="pointer-events-auto bg-white border-4 border-anpan-brown rounded-full shadow-cartoon p-2 pl-4 flex items-center space-x-4 animate-bounce-slight hover:scale-105 transition-transform origin-right"
            >
                <div 
                  className="flex items-center space-x-2 cursor-pointer group" 
                  onClick={() => toggleMinimize(result.id, false)}
                >
                   <span className="text-2xl group-hover:animate-wiggle">📄</span>
                   <span className="font-bold text-anpan-brown max-w-[150px] truncate">{result.title}</span>
                </div>
                <div className="flex items-center space-x-2 border-l-2 border-anpan-brown/20 pl-4">
                   <button
                      onClick={() => toggleMinimize(result.id, false)}
                      className="p-2 bg-sky-200 text-anpan-brown rounded-full border-2 border-anpan-brown hover:bg-sky-300 transition-colors"
                      title="還原視窗"
                   >
                      <MaximizeIcon />
                   </button>
                   <button
                      onClick={() => closeResult(result.id)}
                      className="p-2 bg-anpan-red text-white rounded-full border-2 border-anpan-brown hover:bg-red-600 transition-colors"
                      title="關閉"
                   >
                      <div className="transform scale-75">
                         <XIcon />
                      </div>
                   </button>
                </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AnalysisDisplay;