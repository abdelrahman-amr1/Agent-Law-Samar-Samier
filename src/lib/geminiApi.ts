import fs from 'fs';
import path from 'path';

// Upload a file to Gemini File API
export async function uploadToGemini(filePath: string, mimeType: string, apiKey: string) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  // 1. Initial resumable upload request
  const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: path.basename(filePath) } }),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    console.error('Failed to init upload:', err);
    throw new Error('Failed to initialize upload to Gemini');
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }

  // 2. Upload the file content
  const fileStream = fs.readFileSync(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': fileSize.toString(),
    },
    body: fileStream,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('Failed to upload content:', err);
    throw new Error('Failed to upload file content to Gemini');
  }

  const data = await uploadRes.json();
  return data.file.uri;
}

// getLawFileUris removed in favor of Supabase Storage logic in route.ts

export async function generateChatResponse(apiKey: string, prompt: string, systemInstruction: string, files: { uri: string, mimeType: string }[]) {
  const parts: any[] = files
    .filter(file => file && file.uri && file.mimeType)
    .map(file => ({
      file_data: {
        mime_type: file.mimeType,
        file_uri: file.uri
      }
    }));
  
  parts.push({ text: prompt });

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini API Error:', err);
    console.error('Payload sent:', JSON.stringify(body, null, 2));
    throw new Error(`مشكلة في الاتصال بـ Gemini: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
