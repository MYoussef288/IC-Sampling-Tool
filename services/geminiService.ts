
import { GoogleGenAI } from "@google/genai";
import { DataRow, ChatMessage } from "../types";

// NOTE: The GoogleGenAI instance is now created inside each function.
// This is a defensive approach to ensure that the API client is always
// initialized with the most up-to-date API key from the environment,
// which can resolve issues in local development setups where environment
// variables might load at different times.

export async function analyzeDataWithGemini(
  headers: string[],
  dataSample: DataRow[]
): Promise<string> {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      console.error("API_KEY environment variable not set. AI features will not work.");
      throw new Error("API key is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = "gemini-2.5-flash";

    const prompt = `
    أنت خبير متميز في تحليل البيانات وتدقيق الحسابات في البنوك. قم بتحليل عينة البيانات التالية بدقة.
    أسماء الأعمدة: ${headers.join(", ")}
    عينة البيانات (أول 50 صفًا):
    ${JSON.stringify(dataSample, null, 2)}

    المطلوب: تقديم تقرير **موجز جداً، مركز، وجذاب بصرياً** باللغة العربية.
    
    القواعد الصارمة للتنسيق والمحتوى:
    1. **استخدم الخط العريض (Bold)** بكثافة لإبراز الأرقام، الكلمات المفتاحية، والنتائج الخطيرة داخل الجمل.
    2. كن مباشراً وتجنب الحشو. استخدم جملاً قصيرة وتليغرافية.
    3. ركز نظرك كمراجع داخلي على: **المخاطر المحتملة**، **القيم الشاذة**، و**الاتجاهات غير المنطقية**.
    4. اتبع الهيكل التالي بدقة:

    **🔍 ملخص تنفيذي**
    * (نقطتان فقط تصفان جوهر البيانات والغرض منها بتركيز شديد).

    **⚠️ مؤشرات الخطر والأنماط الهامة**
    * (3-4 نقاط قصيرة تركز على العلاقات الهامة أو القيم الشاذة التي تتطلب تدقيقاً، مع تظليل الكلمات الهامة).

    **📊 مقترحات العرض المرئي**
    * (اقتراح موجز لرسمين بيانيين يدعمان عملية المراجعة).

    بعد النص، يجب توفير بيانات الرسوم البيانية بصيغة JSON صارمة داخل بلوك كود كما يلي (تأكد من صحة الـ JSON):
    \`\`\`json
    [
      {
        "type": "bar", 
        "title": "عنوان الرسم 1", 
        "data": [{"name": "X", "value": 10}, {"name": "Y", "value": 20}]
      },
      {
        "type": "pie", 
        "title": "عنوان الرسم 2", 
        "data": [{"name": "A", "value": 30}, {"name": "B", "value": 70}]
      }
    ]
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get response from AI model.");
  }
}

export async function chatWithData(
  headers: string[],
  dataSample: DataRow[],
  conversationHistory: ChatMessage[],
  userQuestion: string
): Promise<string> {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        console.error("API_KEY environment variable not set. AI features will not work.");
        throw new Error("API key is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = "gemini-2.5-flash";

    const historyText = conversationHistory
        .map(msg => `${msg.sender === 'user' ? 'المستخدم' : 'المساعد'}: ${msg.text}`)
        .join('\n');

    const prompt = `
        أنت مساعد تحليل بيانات ودود ومتعاون لمراجع داخلي.
        معرفتك محصورة بشكل صارم في البيانات المقدمة في هذا السياق.
        لا تجب على أي أسئلة لا تتعلق بمجموعة البيانات هذه. إذا لم تتمكن من الإجابة على سؤال من البيانات، فاذكر بوضوح أن المعلومات غير متوفرة في مجموعة البيانات.
        يجب أن تكون إجاباتك باللغة العربية، مختصرة ومفيدة، واستخدم **الخط العريض** للنقاط الهامة.

        هذه هي أسماء الأعمدة في مجموعة البيانات:
        ${headers.join(', ')}

        وهذه عينة من البيانات (حتى 100 صف):
        ${JSON.stringify(dataSample.slice(0, 100), null, 2)}

        هذا هو سجل المحادثة حتى الآن:
        ${historyText}

        بناءً على جميع المعلومات المذكورة أعلاه، يرجى الإجابة على سؤال المستخدم التالي:
        المستخدم: ${userQuestion}
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for chat:", error);
        throw new Error("Failed to get response from AI model for chat.");
    }
}
