import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const fileDir = path.join(process.cwd(), 'file');
  let files: string[] = [];
  
  if (fs.existsSync(fileDir)) {
    files = fs.readdirSync(fileDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
  }
  
  return NextResponse.json({ files });
}
