import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/systemPrompt';
import { getLawFileUris, uploadToGemini, generateChatResponse } from '@/lib/geminiApi';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const message = formData.get('message') as string;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Get the pre-uploaded Law Files URIs
    console.log("Fetching/Uploading Law Files...");
    const lawFileUris = await getLawFileUris(apiKey);

    const allFileUris = [...lawFileUris];

    // 2. Upload the Case File if provided
    let tmpFilePath = '';
    if (file) {
      console.log("Uploading User Case File...");
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      tmpFilePath = path.join(os.tmpdir(), `case_${Date.now()}_${file.name}`);
      fs.writeFileSync(tmpFilePath, buffer);

      const caseFileUri = await uploadToGemini(tmpFilePath, file.type || 'application/pdf', apiKey);
      allFileUris.push(caseFileUri);
    }

    // 3. Generate response from Gemini
    console.log("Generating Response from Gemini...");
    const responseText = await generateChatResponse(apiKey, message, SYSTEM_PROMPT, allFileUris);

    // Clean up temp file
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
