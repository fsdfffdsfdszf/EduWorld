
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage, QuizAttempt, Course } from "../types";

// Factory to ensure AI is initialized only when needed
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Audio Helper Functions
export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const getTutorResponse = async (
  userMessage: string, 
  history: ChatMessage[],
  context: { 
    courseTitle: string; 
    lessonTitle: string; 
    lessonContent: string; 
    progress: number;
    quizHistory?: Record<string, QuizAttempt>;
  },
  imageData?: string 
) => {
  try {
    const ai = getAI();
    const model = 'gemini-3-pro-preview';
    
    let quizContext = "";
    if (context.quizHistory && Object.keys(context.quizHistory).length > 0) {
      quizContext = "\nStudent's Quiz History in this course:\n" + 
        Object.entries(context.quizHistory).map(([lessonId, attempt]) => 
          `- Lesson Completion: ${attempt.score}/${attempt.total}`
        ).join('\n');
    }

    const systemInstruction = `
      You are "Aris", a world-class AI Tutor at Edu World. 
      
      CURRENT CONTEXT:
      - Course: "${context.courseTitle}"
      - Lesson: "${context.lessonTitle}"
      - Student Progress: ${context.progress}%
      
      LESSON MATERIAL:
      "${context.lessonContent.replace(/<[^>]*>?/gm, '')}"
      
      ${quizContext}

      GOAL: Help the student understand concepts deeply through personalized tutoring.

      INSTRUCTIONS:
      1. **Summarization**: If the user asks to summarize, provide exactly 3 bullet points with the most critical information, followed by one "Pro Tip".
      2. **Quizzing**: If the user asks for a quiz or question, provide ONE conceptual multiple-choice question. Do not reveal the answer immediately. Wait for the user to reply.
      3. **Simplicity**: If the user asks to "explain like I'm 5", use analogies involving toys, games, or simple daily activities.
      4. **Real World**: If asked for examples, provide a modern, industry-relevant application of the concept.
      5. Use Markdown for clear formatting (bolding key terms).
      6. ALWAYS use the googleSearch tool if the user asks about current events, news, or specific facts not in the lesson text.
    `;

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [
        { text: msg.text },
        ...(msg.image ? [{ inlineData: { mimeType: 'image/jpeg', data: msg.image.split(',')[1] } }] : [])
      ]
    }));

    const currentParts: any[] = [{ text: userMessage }];
    if (imageData) {
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData.split(',')[1]
        }
      });
    }

    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model,
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "I apologize, I encountered an issue processing your request.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { text, urls };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "The neural link is currently unstable. Please try your query again.", urls: [] };
  }
};

export const generateCourseOutline = async (topic: string): Promise<Partial<Course>> => {
  try {
    const ai = getAI();
    const model = 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
      model,
      contents: `Design a professional syllabus for a course on: ${topic}. Include 3 lessons and quizzes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            instructor: { type: Type.STRING },
            price: { type: Type.NUMBER },
            lessons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING, description: "Detailed HTML content" },
                  duration: { type: Type.STRING },
                  hasAiFeature: { type: Type.BOOLEAN },
                  quiz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            },
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  text: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      thumbnail: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}`,
      instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.instructor || 'lead'}`,
      rating: 4.8,
      studentsCount: 0,
      subjects: [
        { 
          id: 's1', 
          name: 'Curriculum Core', 
          icon: 'fa-book', 
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          subSubjects: []
        }
      ]
    };
  } catch (error) {
    console.error("Course Generation Error:", error);
    throw error;
  }
};

export const speakContent = async (text: string, voice: string = 'Kore') => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const connectLiveTutor = (callbacks: any, systemInstruction: string) => {
  const ai = getAI();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction,
    },
  });
};
