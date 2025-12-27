# Audio Language Translator

Production-ready Next.js application that records or uploads audio, sends it to OpenAI Whisper for transcription, and translates the text to a target language with GPT.

## Quick Start

```bash
cd app
npm install
echo "OPENAI_API_KEY=sk-..." > .env.local
npm run dev
```

Visit `http://localhost:3000` and upload or record speech to see the transcription and translation pipeline in action.

## Deployment

The app is optimized for Vercel. Ensure `OPENAI_API_KEY` is configured in the Vercel project before deploying with `vercel deploy --prod`.
