import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/systemPrompt';
import { uploadToGemini, generateChatResponse } from '@/lib/geminiApi';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Global cache for uploaded law files to avoid re-uploading every request
const uploadedLawFilesCache: Record<string, string> = {};

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

    const lawFileUris: string[] = [];

    // --- 1. Fetch Local Law Files from `file/` directory ---
    console.log("Fetching Local Law Files...");
    const localFileDir = path.join(process.cwd(), 'file');
    if (fs.existsSync(localFileDir)) {
      const localFiles = fs.readdirSync(localFileDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
      for (const file of localFiles) {
        if (uploadedLawFilesCache[file]) {
          lawFileUris.push(uploadedLawFilesCache[file]);
          continue;
        }
        try {
          const filePath = path.join(localFileDir, file);
          console.log(`Uploading local law file to Gemini: ${file}...`);
          const uri = await uploadToGemini(filePath, file.endsWith('.pdf') ? 'application/pdf' : 'text/plain', apiKey);
          uploadedLawFilesCache[file] = uri;
          lawFileUris.push(uri);
        } catch (e) {
          console.error(`Error uploading local ${file}:`, e);
        }
      }
    }

    // --- 2. Fetch Cloud Law Files from Supabase Storage ---
    console.log("Fetching Cloud Law Files from Supabase...");
    const { data: storageFiles, error: bucketError } = await supabase.storage.from('law_files').list();
    
    // Ignore bucket not found error to allow local files to work regardless
    if (storageFiles && !bucketError) {
      const validFiles = storageFiles.filter(f => f.name !== '.emptyFolderPlaceholder');
      for (const sf of validFiles) {
        if (uploadedLawFilesCache[sf.name]) {
          lawFileUris.push(uploadedLawFilesCache[sf.name]);
          continue;
        }

        const { data: fileData, error: downloadError } = await supabase.storage.from('law_files').download(sf.name);
        if (fileData && !downloadError) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const tempPath = path.join(os.tmpdir(), `law_${Date.now()}_${sf.name}`);
          fs.writeFileSync(tempPath, buffer);

          try {
            console.log(`Uploading cloud law file to Gemini: ${sf.name}...`);
            const uri = await uploadToGemini(tempPath, sf.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain', apiKey);
            uploadedLawFilesCache[sf.name] = uri;
            lawFileUris.push(uri);
          } catch (e) {
            console.error(`Error uploading ${sf.name} to Gemini:`, e);
          } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          }
        }
      }
    }

    const allFileUris = [...lawFileUris];

    // --- 3. Upload User Case File ---
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

    // --- 4. Generate response from Gemini ---
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
