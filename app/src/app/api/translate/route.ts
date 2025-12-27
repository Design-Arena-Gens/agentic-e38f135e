import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const languageLabels: Record<string, string> = {
  auto: 'Auto Detect',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY environment variable.' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('audio');
  const sourceLanguage = (formData.get('sourceLanguage') as string) || 'auto';
  const targetLanguage = (formData.get('targetLanguage') as string) || 'en';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const arrayBuffer = await file.arrayBuffer();
    const audioFile = await toFile(Buffer.from(arrayBuffer), file.name, {
      type: file.type || 'audio/mpeg',
    });

    const transcriptionResponse = await client.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: audioFile,
      language: sourceLanguage === 'auto' ? undefined : sourceLanguage,
      temperature: 0.2,
    });

    const transcription = transcriptionResponse.text?.trim();
    if (!transcription) {
      throw new Error('The transcription service returned no text.');
    }

    const systemPrompt = `You are a precise translation assistant. Translate the user's transcript into ${languageLabels[targetLanguage] ?? targetLanguage}, preserving tone and meaning. Return only the translated text.`;
    const translationResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Transcript (${languageLabels[sourceLanguage] ?? sourceLanguage}): ${transcription}`,
        },
      ],
    });

    const translation = translationResponse.choices?.[0]?.message?.content?.trim();
    if (!translation) {
      throw new Error('The translation service returned no text.');
    }

    return NextResponse.json({ transcription, translation });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
