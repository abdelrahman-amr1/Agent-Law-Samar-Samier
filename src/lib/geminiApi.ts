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

export async function generateChatResponse(apiKey: string, prompt: string, systemInstruction: string, files: { uri: string, mimeType: string }[], history: any[] = []) {
  const parts: any[] = files
    .filter(file => file && file.uri && file.mimeType)
    .map(file => ({
      file_data: {
        mime_type: file.mimeType,
        file_uri: file.uri
      }
    }));
  
  parts.push({ text: prompt });

  const contents = [
    ...history,
    {
      role: 'user',
      parts: parts
    }
  ];

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
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

  const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let lastError: any = null;

  for (const model of models) {
    let attempts = 3;
    while (attempts > 0) {
      try {
        console.log(`Attempting Gemini API call with model: ${model} (Attempts remaining: ${attempts})`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
          }
          throw new Error('Unexpected response format from Gemini API');
        }

        const errStatus = response.status;
        const errText = await response.text();
        console.warn(`Gemini API returned status ${errStatus} for model ${model}:`, errText);
        
        let parsedMessage = errText;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) {
            parsedMessage = parsed.error.message;
          }
        } catch (_) {}
        
        lastError = new Error(parsedMessage);

        // Retry on rate limit (429) or server error (503/5xx)
        if (errStatus === 429 || errStatus === 503 || errStatus >= 500) {
          attempts--;
          if (attempts > 0) {
            console.log(`Retrying model ${model} in ${1500 * (3 - attempts)}ms...`);
            await delay(1500 * (3 - attempts));
            continue;
          }
        }
        
        // Break out of retry loop for client/other errors (like bad request 400 or unauthorized 403)
        break;

      } catch (e: any) {
        console.error(`Network or unexpected error during Gemini API call with model ${model}:`, e);
        lastError = e;
        attempts--;
        if (attempts > 0) {
          await delay(1000);
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`مشكلة في الاتصال بـ Gemini: ${lastError?.message || lastError || 'حدث خطأ غير معروف'}`);
}
