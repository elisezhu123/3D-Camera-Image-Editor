
import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAngledImage = async (
  base64Images: string[],
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getGeminiClient();
  
  const imageParts = base64Images.map(img => ({
    inlineData: {
      mimeType: 'image/png',
      data: img.split(',')[1] || img,
    },
  }));
  
  const textPart = {
    text: `Task: Re-render the main subject from these reference images from a new 3D camera angle.
Perspective Data: ${prompt}.
Requirements:
1. Object Consistency: Combine visual information from the provided ${base64Images.length} reference images to keep the main subject identical in shape, color, and texture.
2. Background: MUST BE A PURE SOLID WHITE BACKGROUND (#FFFFFF). No shadows on the ground, no gradients, no transparency.
3. Lighting: Professional studio lighting, clear outlines.
4. Perspective: Strictly follow the specified Camera Yaw and Pitch degrees.
5. Aspect Ratio: The image must fit a ${aspectRatio} ratio.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [...imageParts, textPart] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      }
    }
  });

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("模型未返回图像，请检查输入或稍后重试。");
  }

  return imageUrl;
};
