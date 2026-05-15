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

// Global cache for uploaded law files to avoid re-uploading every request
const uploadedLawFilesCache: Record<string, string> = {};

export async function getLawFileUris(apiKey: string): Promise<string[]> {
  const fileDir = path.join(process.cwd(), 'file');
  if (!fs.existsSync(fileDir)) {
    console.warn("No 'file' directory found for Law PDFs.");
    return [];
  }

  const files = fs.readdirSync(fileDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
  const uris: string[] = [];

  for (const file of files) {
    const filePath = path.join(fileDir, file);
    if (uploadedLawFilesCache[file]) {
      uris.push(uploadedLawFilesCache[file]);
      continue;
    }
    
    try {
      console.log(`Uploading law file to Gemini: ${file}...`);
      const uri = await uploadToGemini(filePath, file.endsWith('.pdf') ? 'application/pdf' : 'text/plain', apiKey);
      uploadedLawFilesCache[file] = uri;
      uris.push(uri);
    } catch (e) {
      console.error(`Error uploading ${file}:`, e);
    }
  }

  return uris;
}

export async function generateChatResponse(apiKey: string, prompt: string, systemInstruction: string, fileUris: string[]) {
  const parts = fileUris.map(uri => ({
    file_data: {
      mime_type: uri.includes('.pdf') ? 'application/pdf' : 'application/pdf', // simplified, the API knows the mime type from the URI anyway
      file_uri: uri
    }
  }));
  
  parts.push({ text: prompt });

  const body = {
    system_instruction: {
      parts: { text: systemInstruction }
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
      maxOutputTokens: 4096,
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini API Error:', err);
    throw new Error('Failed to generate response from Gemini');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
