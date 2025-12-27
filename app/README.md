## Audio Language Translator

Next.js application that captures or uploads audio, transcribes it with OpenAI Whisper, and translates the transcript into a target language using GPT.

### Prerequisites

- Node.js 18+
- `OPENAI_API_KEY` with access to Whisper and GPT-4o Mini models

Create an `.env.local` file in the project root with:

```bash
OPENAI_API_KEY=sk-...
```

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to use the translator. You can record audio in the browser or upload existing clips (mp3, wav, m4a, webm).

### Production Build

```bash
npm run build
npm run start
```

### Key Files

- `src/app/page.tsx` – client UI with recording, upload, and results panes
- `src/app/api/translate/route.ts` – Next.js route handler calling OpenAI for transcription + translation
- `src/app/globals.css` – Tailwind-driven global styles

### Deployment

This app is optimized for Vercel. Ensure `OPENAI_API_KEY` is configured as a Vercel environment variable before deploying.
