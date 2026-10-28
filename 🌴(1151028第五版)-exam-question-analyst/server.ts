import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limits for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Knowledge Base Texts ---

const CONJECTURING_TEXT = `
數學臆測是一個歷程，從建立資料、觀察資料、尋求規律、提出猜想，藉由小組或全班共同檢驗猜想的正確性及效化猜想的可靠性，再將猜想推論到所有情況，並加以證實。

(一)造例階段 (造例 組織 觀察):
強調讓個別學生造例子。任務設計上會提供給每一位學生有造一、二個例子的機會。完成檢驗後進入彙整。彙整小組四個人的例子，目的是為了讓學生觀察更多例子，以利於從中發現規律。

(二)提出猜想階段 (發現關係並提出猜想):
依據第一階段彙整的例子發現關係並提出暫時性猜想。此階段是在培養學生說話要有憑有據。學生從例子中發現數學關係，並提出個人猜想，再彙整成小組猜想，最後在全班討論時提出全班公認的猜想。
可能錯誤：(1)非依照觀察數據提出 (2)普遍常識 (3)錯誤數學想法。需透過小組檢驗反駁。

(三) 效化階段 (效化猜想):
依據組內有限資料提出的暫時性猜想，可能只是特殊例。需要他組更多的例子來效化，以支持或反駁原猜想。此階段在培養理性批判與說服他人的溝通素養。透過反駁(Refutation)、提供證據(warrant)、背景知識(backing)、加入限制條件(qualifiers)來修正猜想。

(四) 一般化階段 (猜想一般化):
將非恆真的猜想縮小範圍或限制條件，成為恆真的猜想；將恆真的猜想加入全稱量詞(如：所有、任意...)成為數學命題。培養大膽推論。

(五) 證明階段 (證明一般化):
破除再舉更多有限例的證明方式，改以演繹推理方式來證明。說明一個論述，並從小開始培養數學證明的想法。Toulmin論證模式(TAP)。
`;

const POLYA_TEXT = `
Polya (1945) How to solve it《如何解題》將解題過程分為四個階段：

(1) 理解問題 (understanding the problem):
你明白問題的每字每句嗎？能否用自己的文字重述？已知量和未知量是什麼？資料足夠嗎？這個問題「難」在哪裡？
教師可鼓勵學生反覆讀題，找出有用資料和問題重心。

(2) 設計解題策略 (devising a plan):
這個問題是否跟曾解決過的問題類似？可否用另一種型式表達？可否試些簡單情況？
策略包括：估猜與測試、繪圖、探索規律、解一簡化問題、應用數字性質、逆轉思考、窮盡可能性、尋找公式、應用工具、推理、模擬、應用變量思考。

(3) 按步解題 (carrying out the plan):
你是否想出了一個解題方法？能否依這個方法計算下去？
鼓勵學生執行計劃，若不成功可重新尋找線索。不要害怕重新開始。

(4) 回顧解答 (looking back):
答案正確嗎？方法正確嗎？為什麼得出正確答案？關鍵步驟是什麼？能應用到類似問題嗎？
鼓勵學生驗算（檢視答案是否滿足題目要求），思考其他解法及延伸問題。
`;

const REMEDIAL_TEXT = `
補救教學流程建議：
實施針對特定數學題目的補救教學教案設計與實施方式，應依循「評量—教學—再評量」的循環歷程，並可採用行動研究的「計畫、行動、觀察、反思、再計畫」螺旋模式進行。

1. 診斷起始行為與難點
針對選定的數學題目，執行初步評量與診斷（前測），釐清學生基本能力、學科能力和學習動機。評量方式可採用動態評量（Dynamic Assessment），透過逐步提示來找出學生解題的困難癥結（如計算能力不足、缺乏數學語言理解、不會使用圖解等）。

2. 確定補救目標與內容
根據診斷結果，擬定具體明確的課程目標。據此進行「內容差異化」，選擇適合學生程度的教材，原則上應由易至難、由簡而繁。

3. 採行差異化教學架構
實施差異化教學（過程差異化）。教學可採「合、分、合、分、合」的五段式架構：
(1) 合：全班引導。
(2) 分：分組進行多層任務（任務A、任務B），提供多層次作業，相互協助。
(3) 合：全班討論與澄清，教師從旁澄清概念。
(4) 分：執行個人平行任務（a、b、c三級別），著重於「圖形、符號、口述」三種表徵轉換。
(5) 合：單元後測評量與反思。

4. 成果評量與反思修正
進行單元後測，蒐集學習紀錄簿等資料進行三角驗證，反思並調整教學策略。
`;

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    abilityAssessment: {
      type: Type.STRING,
      description: "一、題目主要檢測的能力面向是什麼？",
    },
    distractors: {
      type: Type.ARRAY,
      description: "二、誘答的選項和理由",
      items: {
        type: Type.OBJECT,
        properties: {
          option: { type: Type.STRING, description: "Option label (e.g., A, B, or the text)" },
          reason: { type: Type.STRING, description: "Why this is a distractor" },
        },
        required: ["option", "reason"],
      },
    },
    errorCauses: {
      type: Type.ARRAY,
      description: "三、錯題主因：分成四點",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the cause" },
          summary: { type: Type.STRING, description: "Brief summary (20-35 chars)" },
        },
        required: ["title", "summary"],
      },
    },
    teachingSuggestions: {
      type: Type.ARRAY,
      description: "四、教學重點與建議：重點1至重點4",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Focus area title" },
          points: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "Description point (20-35 chars)" },
          },
        },
        required: ["title", "points"],
      },
    },
  },
  required: ["abilityAssessment", "distractors", "errorCauses", "teachingSuggestions"],
};

// Helper to initialize GoogleGenAI with user agent header
const getAIClient = (userProvidedKey?: string) => {
  const apiKey = (userProvidedKey && userProvidedKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("伺服器與客戶端皆尚未設定 GEMINI_API_KEY。請點選畫面上的「🔑 設定 API Key / 模型」按鈕輸入您的金鑰。");
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

const getEffectiveModel = (userProvidedModel?: string) => {
  return (userProvidedModel && userProvidedModel.trim()) || DEFAULT_MODEL;
};

// Resilient helper to call generateContent with automatic fallback if a model experiences 503 spikes or 404
async function callGeminiWithFallback(ai: GoogleGenAI, generateParams: any) {
  try {
    return await ai.models.generateContent(generateParams);
  } catch (err: any) {
    const isRetryable = err?.status === 503 || err?.message?.includes('503') || err?.status === 404 || err?.message?.includes('404');
    if (isRetryable && generateParams.model !== DEFAULT_MODEL) {
      console.warn(`Model ${generateParams.model} encountered issue (${err?.message}). Automatically falling back to ${DEFAULT_MODEL}...`);
      return await ai.models.generateContent({
        ...generateParams,
        model: DEFAULT_MODEL,
      });
    }
    throw err;
  }
}

interface InputData {
  type: 'image' | 'text';
  content: string;
}

const constructParts = (input: InputData, textPrompt: string) => {
  if (input.type === 'image') {
    return [
      { inlineData: { mimeType: 'image/jpeg', data: input.content } },
      { text: textPrompt },
    ];
  } else {
    return [
      { text: `以下是試題內容：\n\n${input.content}\n\n----------------\n\n${textPrompt}` },
    ];
  }
};

// --- API Routes ---

// Health & Status Route
app.get('/api/status', (req, res) => {
  const hasServerKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    status: 'ok',
    hasServerKey,
    defaultModel: DEFAULT_MODEL,
  });
});

// Test API Key Route
app.post('/api/test-key', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: '請回覆一個字：「好」',
    });

    if (response && response.text) {
      res.json({
        success: true,
        message: `連線成功！模型【${modelToUse}】測試回應正常。`,
      });
    } else {
      res.json({
        success: false,
        message: '連線測試未收到有效回應，請確認金鑰權限。',
      });
    }
  } catch (err: any) {
    const errorMsg = err?.message || '未知錯誤';
    res.status(400).json({
      success: false,
      message: `測試失敗：${errorMsg}`,
    });
  }
});

// Analyze Question Route
app.post('/api/analyze', async (req, res) => {
  try {
    const { input, apiKey, model } = req.body;
    if (!input || !input.content) {
      return res.status(400).json({ error: '請提供試題圖片或文字內容！' });
    }

    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const basePrompt = `
      你是專業的教育測驗與評量專家。
      請依據提供的試題(圖片或文字)，嚴格按照以下四個面向進行分析，並以繁體中文回應：

      一、題目主要檢測的能力面向是什麼？(請簡要說明)
      
      二、誘答的選項和理由分別是什麼？(列出具誘答性的選項及其原因)
      
      三、錯題主因：
         請歸納出四個主要原因。
         每一點必須包含「標題」和「簡要概述」。
         重要限制：簡要概述的字數嚴格控制在 20 到 35 字之間。

      四、教學重點與建議：
         請提出四個教學重點。
         每一項重點要有「標題」。
         每一項重點下請提供 2 到 4 點描述。
         重要限制：每一點描述的字數嚴格控制在 20 到 35 字之間。
    `;

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: {
        parts: constructParts(input, basePrompt),
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: '模型未回傳分析內容。' });
    }

    const parsedResult = JSON.parse(text);
    res.json(parsedResult);
  } catch (err: any) {
    console.error('Server Analyze Error:', err);
    res.status(500).json({ error: err?.message || '分析過程中發生錯誤。' });
  }
});

// Generate Similar Questions Route
app.post('/api/generate-similar', async (req, res) => {
  try {
    const { input, apiKey, model } = req.body;
    if (!input || !input.content) {
      return res.status(400).json({ error: '請提供試題內容！' });
    }

    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const prompt = `
      請依據這道試題的內容目標與難度，設計「三題」類似的數學練習題。
      
      輸出要求：
      1. 每一題請標示 [類題 1]、[類題 2]、[類題 3]。
      2. 每一題都要附上【參考答案】與【簡單解析】。
      3. 題目設計要貼近原題的考核觀念，但數字或情境可以更換。
      4. 請使用 Markdown 格式排版，使其易於閱讀。
    `;

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: {
        parts: constructParts(input, prompt),
      },
    });

    res.json({ text: response.text || '無法產生內容' });
  } catch (err: any) {
    console.error('Server Similar Questions Error:', err);
    res.status(500).json({ error: err?.message || '產生類似題時發生錯誤。' });
  }
});

// Generate Conjecturing Lesson Plan Route
app.post('/api/generate-conjecturing', async (req, res) => {
  try {
    const { input, apiKey, model } = req.body;
    if (!input || !input.content) {
      return res.status(400).json({ error: '請提供試題內容！' });
    }

    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const prompt = `
      請依據這道試題的內容和目標，並「嚴格配合」以下【數學臆測教學文本】的理論架構，設計兩份教案。

      【數學臆測教學文本】：
      ${CONJECTURING_TEXT}

      請產出：
      1. 一份【40分鐘教案】：
         - 需包含：造例階段、提出猜想階段、效化階段、一般化階段。
         - 每個階段請具體寫出教師提問與預期學生反應。
      
      2. 一份【20分鐘教案】(重點版)：
         - 聚焦於核心的猜想與驗證過程。
         - 適合短時間的補救教學或觀念釐清。

      輸出格式：請使用 Markdown 格式，標題清晰。
    `;

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: {
        parts: constructParts(input, prompt),
      },
      config: {
        temperature: 0.4,
      },
    });

    res.json({ text: response.text || '無法產生教案' });
  } catch (err: any) {
    console.error('Server Conjecturing Error:', err);
    res.status(500).json({ error: err?.message || '產生臆測教案時發生錯誤。' });
  }
});

// Generate Polya Lesson Plan Route
app.post('/api/generate-polya', async (req, res) => {
  try {
    const { input, apiKey, model } = req.body;
    if (!input || !input.content) {
      return res.status(400).json({ error: '請提供試題內容！' });
    }

    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const prompt = `
      請依據這道試題的內容和目標，並「嚴格配合」以下【Polya 如何解題】的理論架構，設計兩份教案。

      【Polya 解題文本】：
      ${POLYA_TEXT}

      請產出：
      1. 一份【40分鐘教案】：
         - 需詳細包含四個階段：理解問題、設計解題策略、按步解題、回顧解答。
         - 請具體運用文本中提到的提問技巧（如：已知量是什麼？跟曾解決過的問題類似嗎？）。
      
      2. 一份【20分鐘教案】(精簡版)：
         - 著重於策略選擇與回顧驗算。

      輸出格式：請使用 Markdown 格式，標題清晰。
    `;

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: {
        parts: constructParts(input, prompt),
      },
      config: {
        temperature: 0.4,
      },
    });

    res.json({ text: response.text || '無法產生教案' });
  } catch (err: any) {
    console.error('Server Polya Error:', err);
    res.status(500).json({ error: err?.message || '產生 Polya 教案時發生錯誤。' });
  }
});

// Generate Remedial Teaching Plan Route
app.post('/api/generate-remedial', async (req, res) => {
  try {
    const { input, apiKey, model } = req.body;
    if (!input || !input.content) {
      return res.status(400).json({ error: '請提供試題內容！' });
    }

    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    const prompt = `
      請依據這道試題的內容，診斷學生可能的迷思概念，並「嚴格配合」以下【補救教學流程建議】的理論架構，設計一份完整的補救教學計畫。

      【補救教學流程建議】：
      ${REMEDIAL_TEXT}

      請產出包含以下四個部分的補救教學計畫：
      
      1. 【診斷與評量】：
         - 針對此題，設計具體的「動態評量」策略（例如：當學生卡住時，教師可以給予什麼樣的語音提示或關鍵字提示？）。
      
      2. 【補救目標】：
         - 訂定具體明確的課程目標。
      
      3. 【差異化教學流程】(重點)：
         - 請詳細設計「合、分、合、分、合」五段式架構。
         - 特別著重於第二次「分」的「個人平行任務」設計：請具體舉例針對此題的 任務 a (低階)、任務 b (中階)、任務 c (高階) 分別可以做什麼？(需包含圖形、符號、口述的轉換練習)。
      
      4. 【評量與反思】：
         - 簡述如何進行後測驗證。

      輸出格式：請使用 Markdown 格式，標題清晰，內容具體實用。
    `;

    const response = await callGeminiWithFallback(ai, {
      model: modelToUse,
      contents: {
        parts: constructParts(input, prompt),
      },
      config: {
        temperature: 0.4,
      },
    });

    res.json({ text: response.text || '無法產生補救教學建議' });
  } catch (err: any) {
    console.error('Server Remedial Error:', err);
    res.status(500).json({ error: err?.message || '產生補救教學建議時發生錯誤。' });
  }
});

// Streaming generation endpoint (SSE)
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, model, apiKey } = req.body;
    const ai = getAIClient(apiKey);
    const modelToUse = getEffectiveModel(model);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await ai.models.generateContentStream({
      model: modelToUse,
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Server Stream Error:', err);
    res.write(`data: ${JSON.stringify({ error: err?.message || '串流生成失敗' })}\n\n`);
    res.end();
  }
});

// Setup Vite Dev Middleware or Static File Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
