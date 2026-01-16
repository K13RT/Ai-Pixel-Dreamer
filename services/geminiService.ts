import { GoogleGenAI } from "@google/genai";
import { ArtStyle, SpriteSize, ImageResolution } from "../types";

// Helper to get client with current key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to extract image or throw descriptive error
const extractImageOrThrow = (response: any, defaultError: string) => {
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    // If no image, check for text (refusal or description)
    const textPart = parts.find((p: any) => p.text);
    if (textPart?.text) {
        throw new Error(textPart.text); // Return the model's explanation
    }
    throw new Error(defaultError);
};

export const generateStandardSprite = async (
  prompt: string,
  size: SpriteSize,
  style: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const fullPrompt = `Create an image of a pixel art sprite. 
    Subject: ${prompt}. 
    Style: ${style}. 
    Resolution: ${size} pixels. 
    View: Game sprite, isolated on a solid white background. 
    Ensure crisp pixel edges, no anti-aliasing blurring, limited color palette suitable for retro games.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    return extractImageOrThrow(response, "No image data found in response");
  } catch (error) {
    console.error("Error generating sprite:", error);
    throw error;
  }
};

export const generateProSprite = async (
  prompt: string,
  style: ArtStyle,
  resolution: ImageResolution
): Promise<string> => {
  const ai = getAiClient();
  try {
    const fullPrompt = `Generate a high-quality pixel art game asset. 
    Subject: ${prompt}. 
    Style: ${style}. 
    View: Game sprite/asset, isolated on a white background. 
    Ensure professional quality, crisp details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        imageConfig: { 
          aspectRatio: "1:1",
          imageSize: resolution
        },
      },
    });

    return extractImageOrThrow(response, "No image data found in response");
  } catch (error) {
    console.error("Error generating pro sprite:", error);
    throw error;
  }
};

export const editPixelSprite = async (
  imageBase64: string,
  editPrompt: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: `Edit this pixel art image. Instruction: ${editPrompt}. Maintain the pixel art style and resolution.`,
          },
        ],
      },
      config: {
         // Do not set responseMimeType or Schema for image editing on flash-image
      }
    });

    return extractImageOrThrow(response, "Failed to edit image");
  } catch (error) {
    console.error("Error editing sprite:", error);
    throw error;
  }
};

export const generatePixelAnimationFrames = async (
  referenceImageBase64: string,
  action: string,
  frameCount: number = 3,
  isLooping: boolean = true
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        
        const prompt = `Create a pixel art sprite sheet for an animation of the provided character performing a "${action}" action. 
                  Generate exactly ${frameCount} sequential frames in a horizontal row. 
                  ${isLooping ? 'Ensure the animation loops seamlessly from the last frame back to the first.' : 'The animation should perform the action once and end.'}
                  Keep the exact same style, palette, and resolution. White background.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: 'image/png',
                    },
                  },
                {
                  text: prompt,
                },
              ],
            },
            config: {
                imageConfig: {
                    aspectRatio: "4:3",
                }
            }
          });

          // Animation frames return a single image (the sheet/row)
          return [extractImageOrThrow(response, "Failed to generate animation frames")];

    } catch (error) {
        console.error("Error generating animation:", error);
        throw error;
    }
}

export const convertToPixelArt = async (imageBase64: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: 'image/png', 
                    },
                  },
                {
                  text: `Transform this image into high-quality Pixel Art. 
                  Style: 16-bit SNES game asset. 
                  Reduce color palette. 
                  Add outlines. 
                  Keep the main subject clear.`,
                },
              ],
            },
          });

          return extractImageOrThrow(response, "Failed to convert image");
    } catch (error) {
        console.error("Style transfer error:", error);
        throw error;
    }
}

export const generateBackgroundRemoval = async (imageBase64: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: `Identify the main character/object in this image. 
            Keep the subject EXACTLY as it is (do not redraw the character).
            Replace the entire background with a solid bright Magenta color (Hex Code: #FF00FF).
            Ensure the edges between the subject and the background are sharp pixel-perfect edges (no anti-aliasing or blurring).`,
          },
        ],
      },
    });

    return extractImageOrThrow(response, "Failed to process background");
  } catch (error) {
    console.error("Background removal error:", error);
    throw error;
  }
};

export const generateTileSet = async (
  prompt: string,
  type: 'seamless' | 'autotile',
  style: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    let specificInstruction = "";
    
    if (type === 'seamless') {
        specificInstruction = `Create a single seamless repeating pattern texture of ${prompt}. 
        The edges must tile perfectly when repeated. 
        View: Top-down game map texture.`;
    } else {
        specificInstruction = `Create a 3x3 tile set (9 distinct tiles in a grid) for an RPG game map representing ${prompt}.
        The grid layout must include: 
        Row 1: Top-Left Corner, Top Edge, Top-Right Corner.
        Row 2: Left Edge, Center Fill, Right Edge.
        Row 3: Bottom-Left Corner, Bottom Edge, Bottom-Right Corner.
        Ensure all edges match perfectly to create a coherent map surface. White background.`;
    }

    const fullPrompt = `Create an image of pixel art game tiles.
    Style: ${style}.
    ${specificInstruction}
    Ensure crisp pixel art, no blurring.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    return extractImageOrThrow(response, "No image data found in response");
  } catch (error) {
    console.error("Error generating tileset:", error);
    throw error;
  }
};