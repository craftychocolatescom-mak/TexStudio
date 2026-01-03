
import { GoogleGenAI, Type } from "@google/genai";
import { RenderMode, ModelSettings, PatternData, SocialMediaData, CuttingData, SizeMix, NestingStrategy, OutputProfile, FileExtension, CostingData } from "../types";

const SYSTEM_INSTRUCTION = `Persona: You are the Lead Industrial Technical Designer for TexVision Studio. 

CRITICAL PROTOCOLS FOR GENERATION:
1. TECH-PACK FIDELITY: Renders must be crisp, high-contrast industrial blueprints. Use pure black vectors on pure white backgrounds.
2. COMPONENT SEGMENTATION: Functional details like zippers, seams, cuffs, and collars must be distinct.
3. MULTI-VIEW COORDINATION: Maintain perfect 1:1 scale between views.
4. LIFESTYLE ACCURACY: Synthesize photorealistic texture mapping from swatches. 
5. FABRIC PHYSICS: For model renders, visually simulate the drape, weight, and light-interaction of the specific GSM, fiber composition, and fabric material type requested.
6. HUMAN REPRESENTATION: For model renders, show full human figures including heads and facial features.
7. NESTING PROTOCOL: When generating markers, ensure efficient piece placement. If 'A4_Tiled' is requested, show clear segmentation lines or grid markers. If 'Plotter' is requested, show a continuous roll layout with meter markers. Include alignment notches (V-notches) on all pattern pieces.`;

// Helper to compress images before sending to API to stay within token/bandwidth limits
async function compressImage(base64: string, maxWidth = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false }); 
      if (!ctx) return reject(new Error("Canvas failure"));
      ctx.fillStyle = "#FFFFFF"; 
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error("Image Load Failure"));
    img.src = base64;
  });
}

// Helper to robustly parse JSON from AI response, handling markdown blocks or prepended text
function robustParseJSON(text: string | undefined): any {
  if (!text) return {};
  try {
    // Attempt direct parse
    return JSON.parse(text);
  } catch (e) {
    // Attempt to extract JSON from markdown or text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { 
        return JSON.parse(match[0]); 
      } catch (e2) { 
        console.error("JSON Recovery Failed", e2); 
      }
    }
    return {};
  }
}

export class GeminiService {
  private getClient() {
    // ALWAYS use the named parameter and process.env.API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  // Detect model settings (gender, age, pose) from the initial sketch
  async detectModelSettings(sketchBase64: string): Promise<ModelSettings> {
    const ai = this.getClient();
    const compressed = await compressImage(sketchBase64, 512, 0.7); 
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: compressed.split(',')[1], mimeType: 'image/jpeg' } },
          { text: "Analyze this garment sketch. Determine target demographic (Gender: Female, Male, or Unisex), Age Group (Kids, Teen, Adult, or Senior), and the best professional Pose (Standing, Sitting, Walking, or Dynamic) to showcase it in a catalog render." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gender: { type: Type.STRING, enum: ['Female', 'Male', 'Unisex'] },
            ageGroup: { type: Type.STRING, enum: ['Kids', 'Teen', 'Adult', 'Senior'] },
            pose: { type: Type.STRING, enum: ['Standing', 'Sitting', 'Walking', 'Dynamic'] }
          },
          required: ['gender', 'ageGroup', 'pose']
        }
      }
    });
    // Use .text property to access content string
    return robustParseJSON(response.text) as ModelSettings;
  }

  // Generate either an industrial technical blueprint or a photorealistic model catalog render
  async generateMockup(sketches: { front: string, back?: string, side?: string }, swatch: string, instructions: string, mode: RenderMode, modelSettings: ModelSettings, fabricData: any) {
    const ai = this.getClient();
    const parts: any[] = [];
    
    // Add all available sketch views
    parts.push({ inlineData: { data: sketches.front.split(',')[1], mimeType: 'image/jpeg' } });
    if (sketches.back) parts.push({ inlineData: { data: sketches.back.split(',')[1], mimeType: 'image/jpeg' } });
    if (sketches.side) parts.push({ inlineData: { data: sketches.side.split(',')[1], mimeType: 'image/jpeg' } });
    
    // Add the fabric swatch
    parts.push({ inlineData: { data: swatch.split(',')[1], mimeType: 'image/jpeg' } });

    const modePrompt = mode === 'technical' 
      ? "Generate a clean, high-contrast industrial technical blueprint (flat sketch) of this garment on a pure white background. Show front and back views clearly. Use pure black lines. No shading. Industrial precision is required."
      : `Generate a high-quality photorealistic fashion catalog image of a ${modelSettings.ageGroup} ${modelSettings.gender} model in a ${modelSettings.pose} pose wearing this exact garment rendered with the provided fabric swatch. Ensure the model has a full head and natural facial features.`;

    const prompt = `${modePrompt}\n\nFabric Technical Data: ${fabricData.fiber}, ${fabricData.weight} GSM, ${fabricData.type} ${fabricData.material}.\nDesign Instructions: ${instructions}\n\nReturn the image and a brief industrial analysis including a proposed garment name in JSON format: {"garmentName": "...", "analysis": "..."}`;

    parts.push({ text: prompt });

    // Use gemini-2.5-flash-image for general generation tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        imageConfig: { aspectRatio: "3:4" }
      }
    });

    let imageUrl = '';
    let textOutput = '';
    
    // Iterate parts to find generated image and text
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            textOutput += part.text;
          }
        }
    }

    const json = robustParseJSON(textOutput);
    return { 
      imageUrl, 
      analysis: json.analysis || textOutput, 
      json 
    };
  }

  // Deconstruct garment into manufacturing specs and POM table
  async analyzePattern(imageUrl: string, analysis: string, instructions: string): Promise<PatternData> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // High-quality reasoning for pattern engineering
      contents: [
        { inlineData: { data: imageUrl.split(',')[1], mimeType: 'image/png' } },
        { text: `Analyze this technical build: "${analysis}". Following instructions: ${instructions}. Generate an industrial specification including a full Point of Measurement (POM) table and a complete piece inventory for manufacturing.` }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            measurements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  description: { type: Type.STRING },
                  m: { type: Type.STRING },
                  grading: { type: Type.STRING }
                },
                required: ['point', 'description', 'm', 'grading']
              }
            },
            pieceInventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  material: { type: Type.STRING, enum: ['Main', 'Contrast', 'Lining', 'Interfacing'] },
                  notes: { type: Type.STRING }
                },
                required: ['name', 'quantity', 'material', 'notes']
              }
            },
            correctionNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            fabricConsumption: { type: Type.STRING },
            gradingRules: { type: Type.STRING }
          },
          required: ['measurements', 'pieceInventory', 'correctionNotes', 'fabricConsumption', 'gradingRules']
        }
      }
    });
    return robustParseJSON(response.text);
  }

  // Calculate manufacturing cost based on region and garment complexity
  async analyzeCosting(sourceResult: any, inputs: any): Promise<CostingData> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        { inlineData: { data: sourceResult.technicalImageUrl.split(',')[1], mimeType: 'image/png' } },
        { text: `Estimate the industrial production cost in ${inputs.region}. Fabric Weight: ${inputs.fabricGsm} GSM. Target Markup: ${inputs.markupPercentage}%. Generate a full Bill of Materials (BOM) and Labor Operations list based on the garment's complexity.` }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            region: { type: Type.STRING },
            currency: { type: Type.STRING },
            estimatedCostPerUnit: { type: Type.NUMBER },
            totalLaborHours: { type: Type.NUMBER },
            bom: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  specification: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                }
              }
            },
            laborOps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  operation: { type: Type.STRING },
                  department: { type: Type.STRING },
                  smv: { type: Type.NUMBER },
                  ratePerMinute: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                }
              }
            },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.NUMBER },
                labor: { type: Type.NUMBER },
                overhead: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });
    const result = robustParseJSON(response.text);
    return { ...result, markupPercentage: inputs.markupPercentage };
  }

  // Generate marketing Creative
  async generateSocialAd(imageUrl: string, platform: string, vibe: string): Promise<SocialMediaData> {
    const ai = this.getClient();
    const prompt = `Synthesize a high-conversion ${platform} creative for this garment with a ${vibe} aesthetic. Create an ad visual and extract copy (headline, caption, hashtags, cta).`;
    
    // Using Pro Image model for high-quality marketing visual and text generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        { inlineData: { data: imageUrl.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        imageConfig: { aspectRatio: platform.includes('Story') ? "9:16" : "1:1" }
      }
    });

    let adImageUrl = '';
    let textOutput = '';
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            adImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            textOutput += part.text;
          }
        }
    }

    // Secondary pass with Flash for precise JSON extraction of copy
    const copyResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract the social media copy from the following description: "${textOutput}". Targeted for ${platform} with a ${vibe} tone.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            cta: { type: Type.STRING }
          }
        }
      }
    });

    return {
      platform,
      vibe,
      adImageUrl,
      copy: robustParseJSON(copyResponse.text)
    };
  }

  // Compute industrial nesting marker for cutting
  async generateCuttingMarker(techImageUrl: string, fabricWidth: number, analysis: string, sizeMix: SizeMix, strategy: NestingStrategy, config: any): Promise<CuttingData> {
    const ai = this.getClient();
    const prompt = `Generate an industrial cutting marker (nesting layout) for a ${fabricWidth}cm wide fabric roll. Optimized for ${strategy}. Size distribution: ${JSON.stringify(sizeMix)}. Output Profile: ${config.outputProfile}. Generate a continuous roll visual and yield metadata.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { inlineData: { data: techImageUrl.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    let markerImageUrl = '';
    let textOutput = '';
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            markerImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            textOutput += part.text;
          }
        }
    }

    // Extract statistics from the visual generation analysis
    const statsResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `From this manufacturing analysis: "${textOutput}", extract nesting metrics. Provide efficiency percentage, total length used, piece count, and layout verification instructions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            efficiency: { type: Type.NUMBER },
            totalLengthUsed: { type: Type.STRING },
            pieceCount: { type: Type.NUMBER },
            cuttingInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            totalPages: { type: Type.NUMBER }
          }
        }
      }
    });

    const stats = robustParseJSON(statsResponse.text);

    return {
      fabricWidth,
      markerImageUrl,
      strategy,
      sizeBreakdown: sizeMix,
      outputProfile: config.outputProfile,
      fileExtension: config.fileExtension,
      efficiency: stats.efficiency || 85,
      totalLengthUsed: stats.totalLengthUsed || "2.4m",
      pieceCount: stats.pieceCount || 12,
      cuttingInstructions: stats.cuttingInstructions || ["Check roll tension", "Align to zero-point marker"],
      totalPages: stats.totalPages || (config.outputProfile === 'A4_Tiled' ? 24 : 1),
      wastagePercentage: 100 - (stats.efficiency || 85)
    };
  }
}

export const geminiService = new GeminiService();
