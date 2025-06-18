# Artist AI Studio

> **Take back control of your creativity.** Train AI on _your_ art, generate with _your_ style, keep _your_ vision intact.

## 🎨 For Creatives, By Creatives

Tired of seeing your artistic style copied without permission? Frustrated by generic AI that doesn't understand your unique vision? **Artist AI Studio** puts the power back in your hands.

This isn't just another AI image generator. It's a complete creative platform that lets you train custom AI models on your own artwork, ensuring your personal style remains yours while amplifying your creative output.

### ✨ Why Artist AI Studio?

**🛡️ Protect Your Style**  
Train AI models exclusively on your own artwork. No more worrying about your designs being scraped and used without permission.

**🚀 Amplify Your Creativity**  
Generate infinite variations in your signature style. Explore new ideas faster than ever while maintaining artistic authenticity.

**💼 Professional Workflow**  
Built for working artists. Manage your AI-generated portfolio, track your creative process, and maintain quality control over every piece.

**🎯 Your Art, Your Rules**  
Every generation is powered by models you trained, using artwork you created. The AI works _for_ you, not against you.

---

## 🔥 What You Get

- **🎨 Custom AI Training** - Train models on your own artwork to preserve your unique style
- **⚡ Lightning-Fast Generation** - Create new artwork in seconds with your personalized AI
- **✏️ Advanced Editing Tools** - Fine-tune your AI creations to perfection
- **🖼️ Smart Gallery Management** - Organize and showcase your AI-generated portfolio

---

## 🏗️ Built for Artists Who Mean Business

This platform was created by artists who understand the real challenges of modern creative work. We know you need tools that enhance your vision, not replace it.

### Project Architecture

```
artist-ai-studio/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for AI generation
│   ├── dashboard/         # Creative analytics & insights
│   ├── edit/             # Advanced image editing suite
│   ├── gallery/          # Portfolio management
│   ├── generate/         # AI generation interface
│   └── training/         # Custom model training
├── components/            # Reusable React components
├── contexts/             # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── public/               # Static assets
└── utils/                # Helper functions
```

---

## 🚀 Quick Start for Mac

### Prerequisites

1. **Install Homebrew** (if needed)

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js** (v20 or later)

   ```bash
   brew install node
   ```

3. **Install pnpm** (Fast, disk space efficient package manager)

   ```bash
   brew install pnpm
   ```

4. **Install Vercel CLI**
   ```bash
   pnpm add -g vercel
   ```

### Get Started

1. **Clone & Navigate**

   ```bash
   git clone https://github.com/nami/artist-ai-studio.git
   cd artist-ai-studio
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**

   ```bash
   # Link to your Vercel project
   vercel link

   # Pull your environment variables
   vercel env pull
   ```

   Required environment variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   REPLICATE_API_TOKEN=your_replicate_token
   REPLICATE_WEBHOOK_SECRET=your_webhook_secret
   BLOB_READ_WRITE_TOKEN=your_blob_token
   ```

4. **Launch Your Creative Studio**

   ```bash
   pnpm dev
   ```

   🎉 Your studio opens at [http://localhost:3000](http://localhost:3000)

---

## ⚡ Development Commands

```bash
pnpm dev        # Start your creative playground
pnpm build      # Build for production
pnpm start      # Run production server
pnpm lint       # Code quality check
pnpm format     # Beautify your code
```

---

## 🌟 Deploy Your Studio

Ready to share your creative platform with the world?

```bash
vercel deploy --prod
```

---

## 🛠️ Troubleshooting

**Build Issues?**

- Verify all environment variables are set
- Check Node.js version: `node --version`
- Reinstall pnpm if needed: `brew reinstall pnpm`

**Vercel CLI Problems?**

- Authenticate: `vercel login`
- Verify project linking
- Reinstall if needed: `brew reinstall pnpm && pnpm add -g vercel`

**Permission Errors?**

```bash
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

---

## 🎯 Tech Stack

**Frontend:** Next.js 15.3.3 (App Router), TypeScript 5.x, Tailwind CSS 3.4.1  
**UI Components:** Radix UI, Framer Motion, Lucide React  
**Backend:** Next.js App Router API Routes, Supabase PostgreSQL  
**AI Platform:** Replicate API with custom model training  
**Deployment:** Vercel with Edge Runtime  
**Storage:** Hybrid (Vercel Blob + Browser Storage + Supabase)  
**Development:** Cursor IDE with Claude Sonnet 4.0, pnpm, Turbopack

---

## 📚 Learn More

Dive deeper into the technologies powering your creative studio:

- [Next.js Documentation](https://nextjs.org/docs) - The React framework for production
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [Supabase](https://supabase.com/docs) - Open source Firebase alternative
- [Replicate API](https://replicate.com/docs) - Run machine learning models in the cloud

---

**Ready to revolutionize your creative process?** 🚀

_Built with ❤️ for the creative community_
