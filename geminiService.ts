import { GoogleGenAI, Type, Chat } from "@google/genai";
import { CourseContext, Module, ContentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;
const BASE_DELAY = 1500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(model: string, params: any) {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await ai.models.generateContent({ 
        model, 
        contents: params.contents,
        config: params.config 
      });
    } catch (e: any) {
      if (i === MAX_RETRIES) throw e;
      const isRetryable = e.message?.includes('503') || e.message?.includes('429');
      if (isRetryable) {
        await delay(BASE_DELAY * Math.pow(2, i));
        continue;
      }
      throw e;
    }
  }
}

export const generateImage = async (prompt: string): Promise<string> => {
  if (!prompt || prompt.trim().length < 2) return "";
  try {
    const response = await generateWithRetry('gemini-2.5-flash-image', {
      contents: { 
        parts: [{ 
          text: `A professional, high-definition educational illustration. 
                 Context/Subject: ${prompt}. 
                 Style: High-quality documentary style photography or professional 3D scientific visualization, cinematic lighting, 4k resolution, realistic textures. 
                 STRICT RULE: DO NOT include any text, letters, captions, or labels in the image. Focus purely on the visual scene.` 
        }] 
      },
    });
    
    const candidates = response?.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return "";
  } catch (error) {
    console.error("Image Gen Error:", error);
    return "";
  }
};

const SYSTEM_INSTRUCTION_BASE = `
你是一位在世界顶级学府任教的资深终身教授。你擅长将复杂的学术概念转化为易于理解、逻辑严密且极具启发性的课件内容。

### 教学规范：
1. **内容自适应**：你会根据用户提供的“课程名称”和“教学大纲”自动调整你的语调、术语库和教学案例。
2. **职责边界 (Strict Content Separation)**:
   - **真题练习 (ASSESSMENT)**: 这是**唯一**允许出现题目、测验、练习题的板块。
   - **其他所有板块 (教案, PPT, 指南等)**: **严禁**出现任何形式的题目。它们必须是纯粹的知识讲解、深度案例分析和逻辑推导。严禁使用“请回答”、“思考题”、“练习”等字眼。
3. **视觉驱动 (Visual Learning)**:
   - 你必须在讲解中插入 3-5 个图片占位符。
   - 占位符格式必须严格为：![简洁的视觉描述](ai-generated:详细的英文视觉提示词)
   - 提示词应包含场景描述、材质、光影和专业摄影风格。
4. **双语支持**:
   - 核心学术名词必须附带英文括号，如“光合作用 (Photosynthesis)”。
   - 讲解语言使用流畅、专业的纯中文。
`;

export const createChatSession = (context: CourseContext): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE + `\n当前课程: ${context.courseName || "待定课程"}. 已知大纲: ${context.syllabus.substring(0, 1000)}`,
    }
  });
};

export const generateCourseStructure = async (context: CourseContext): Promise<Module[]> => {
  if (!context.syllabus) throw new Error("请先上传教学大纲。");
  const response = await generateWithRetry('gemini-3-flash-preview', {
    contents: `基于以下大纲，将其合理划分为 11-12 周的单元结构（通常对应一个 Quarter）。如果大纲较短，请根据课程广度进行扩充。大纲: ${context.syllabus.substring(0, 8000)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            week: { type: Type.INTEGER },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "week", "topics"]
        }
      }
    }
  });
  
  const parsed = JSON.parse(response?.text || "[]");
  return parsed.map((m: any, i: number) => ({ ...m, id: `mod-${Date.now()}-${i}`, content: {} }));
};

export const generateModuleContent = async (type: ContentType, module: Module, context: CourseContext): Promise<string> => {
  if (type === ContentType.ASSESSMENT) {
    const response = await generateWithRetry('gemini-3-flash-preview', {
      contents: `针对课程 "${context.courseName}" 第 ${module.week} 周主题 "${module.title}"，生成 10 道高水平的单选题。题目应侧重于理解与应用。
                 要求：双语题干/选项，含详尽解析（包含知识点定位），字段名 topic 需体现具体考点。`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              topic: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation", "topic"]
          }
        }
      }
    });
    return response?.text || "[]";
  }

  const prompt = `生成课程 "${context.courseName}" 第 ${module.week} 周 "${module.title}" 的 ${type} 板块内容。
                 
                 ### 核心约束：
                 1. **严禁出现题目**：内容应为纯粹的讲解，严禁包含 Quiz 或思考题。
                 2. **视觉化要求**：必须根据内容深度插入 4-5 个紧凑格式的图片标签：![视觉标题](ai-generated:英文提示词)。
                 3. **字数与广度**：内容需详尽、硬核，能够支撑 2 小时的授课量，字数建议在 2000 字以上。`;
  
  const response = await generateWithRetry('gemini-3-flash-preview', { 
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION_BASE }
  });
  return response?.text || "生成失败。";
};

export const refineModuleContent = async (type: ContentType, module: Module, context: CourseContext, feedback: string): Promise<string> => {
    const prompt = `润色要求：${feedback}。请确保遵循：核心专有名词双语，**严禁在非测验板块添加任何题目**。保持所有 ![描述](ai-generated:prompt) 标签。当前内容为：\n\n${module.content[type]}`;
    const response = await generateWithRetry('gemini-3-flash-preview', { 
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION_BASE }
    });
    return response?.text || module.content[type] || "";
};

export const processMediaFile = async (file: File): Promise<string> => {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const response = await generateWithRetry('gemini-3-flash-preview', {
    contents: {
      parts: [
        { inlineData: { mimeType: file.type || 'application/octet-stream', data: base64 } },
        { text: `你是一位正在备课的顶级教授。请深度解析该素材（多媒体文件：${file.name}）。
                 
                 ### 任务要求：
                 1. **知识点萃取**：逐句/逐帧分析，提取出所有硬核学术知识点、公式、定理或事实。
                 2. **结构化转译**：不要只做简短总结，要将其转化为详尽的文字讲稿。
                 3. **逻辑推导**：解析素材背后的科学或逻辑原理。
                 4. **双语标注**：所有关键学术词汇标注英文括号。
                 
                 你的解析结果将作为课件生成的底层“语料库”，请确保其深度和详尽度（字数不限，越详细越好）。` }
      ]
    }
  });
  return response?.text || "";
};