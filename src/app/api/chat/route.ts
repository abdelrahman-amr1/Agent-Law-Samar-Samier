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
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .single();

    const apiKey = apiKeyData?.value;

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({ error: 'لم يقم الإدارة بتعيين مفتاح الذكاء الاصطناعي (Gemini API Key) بعد. يرجى مراجعة لوحة الإدارة.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const message = formData.get('message') as string;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Helper to check cache and upload
    const getOrUploadFileUri = async (fileKey: string, filePath: string, mimeType: string) => {
      // 1. Check Supabase Cache
      const { data: cacheData } = await supabase
        .from('gemini_cache')
        .select('*')
        .eq('file_name', fileKey)
        .single();

      if (cacheData) {
        const lastUpdated = new Date(cacheData.updated_at).getTime();
        const now = Date.now();
        const hoursPassed = (now - lastUpdated) / (1000 * 60 * 60);

        // Gemini File URIs expire after 48 hours. Let's renew if older than 46 hours.
        if (hoursPassed < 46) {
          console.log(`Using cached URI for ${fileKey}...`);
          return cacheData.file_uri;
        }
      }

      // 2. Not found or expired, so upload it
      console.log(`Uploading to Gemini: ${fileKey}...`);
      const uri = await uploadToGemini(filePath, mimeType, apiKey);

      // 3. Save to Supabase Cache
      await supabase.from('gemini_cache').upsert({
        file_name: fileKey,
        file_uri: uri,
        updated_at: new Date().toISOString()
      });

      return uri;
    };

    const lawFilesData: { uri: string, mimeType: string }[] = [];

    // --- 1. Fetch Local Law Files from `file/` directory ---
    console.log("Fetching Local Law Files...");
    const localFileDir = path.join(process.cwd(), 'file');
    if (fs.existsSync(localFileDir)) {
      const localFiles = fs.readdirSync(localFileDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
      for (const file of localFiles) {
        try {
          const filePath = path.join(localFileDir, file);
          const uri = await getOrUploadFileUri(`local_${file}`, filePath, file.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
          lawFilesData.push({ uri, mimeType: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain' });
        } catch (e) {
          console.error(`Error processing local ${file}:`, e);
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
        
        // Let's try to get URI from cache first to avoid downloading from storage if not needed
        const { data: preCacheData } = await supabase
          .from('gemini_cache')
          .select('*')
          .eq('file_name', `cloud_${sf.name}`)
          .single();
          
        if (preCacheData) {
           const hoursPassed = (Date.now() - new Date(preCacheData.updated_at).getTime()) / (1000 * 60 * 60);
           if (hoursPassed < 46) {
             console.log(`Using cached URI for cloud_${sf.name}...`);
             lawFilesData.push({ uri: preCacheData.file_uri, mimeType: sf.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain' });
             continue; // skip download entirely!
           }
        }

        // Cache expired or not found, we must download and upload
        const { data: fileData, error: downloadError } = await supabase.storage.from('law_files').download(sf.name);
        if (fileData && !downloadError) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const tempPath = path.join(os.tmpdir(), `law_${Date.now()}_${sf.name}`);
          fs.writeFileSync(tempPath, buffer);

          try {
            const uri = await getOrUploadFileUri(`cloud_${sf.name}`, tempPath, sf.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
            lawFilesData.push({ uri, mimeType: sf.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain' });
          } catch (e) {
            console.error(`Error uploading ${sf.name} to Gemini:`, e);
          } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          }
        }
      }
    }

    const allFiles = [...lawFilesData];

    // --- 3. Upload User Case File ---
    let tmpFilePath = '';
    if (file) {
      console.log("Uploading User Case File...");
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      tmpFilePath = path.join(os.tmpdir(), `case_${Date.now()}_${file.name}`);
      fs.writeFileSync(tmpFilePath, buffer);

      const mimeType = file.type || 'application/pdf';
      const caseFileUri = await uploadToGemini(tmpFilePath, mimeType, apiKey);
      allFiles.push({ uri: caseFileUri, mimeType });
    }

    // --- 4. Generate response from Gemini ---
    console.log("Generating Response from Gemini...");
    const responseText = await generateChatResponse(apiKey, message, SYSTEM_PROMPT, allFiles);

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
