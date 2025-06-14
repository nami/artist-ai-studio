# Artist AI Studio

## Setup Instructions for New Mac

### Prerequisites
1. Install Node.js (v20 or later)
   ```bash
   brew install node
   ```

2. Install pnpm (Package Manager)
   ```bash
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```
   After installation, restart your terminal or run:
   ```bash
   source ~/.zshrc
   ```

3. Install Vercel CLI
   ```bash
   pnpm add -g vercel
   ```

### Project Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd artist-ai-studio
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Set up environment variables
   - Copy `.env.local` from your old machine or create a new one
   - Required environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     REPLICATE_API_TOKEN=your_replicate_token
     REPLICATE_WEBHOOK_SECRET=your_webhook_secret
     BLOB_READ_WRITE_TOKEN=your_blob_token
     ```

4. Link to Vercel project
   ```bash
   vercel link
   ```
   - Select your existing project when prompted

5. Pull environment variables from Vercel
   ```bash
   vercel env pull
   ```

### Development

1. Start the development server
   ```bash
   pnpm dev
   ```

2. Build the project
   ```bash
   pnpm build
   ```

3. Start production server
   ```bash
   pnpm start
   ```

### Deployment

1. Deploy to production
   ```bash
   vercel deploy --prod
   ```

### Troubleshooting

1. If you encounter any build errors:
   - Make sure all environment variables are set correctly
   - Check if pnpm is properly installed and in your PATH
   - Verify Node.js version is compatible

2. If Vercel CLI commands fail:
   - Run `vercel login` to ensure you're authenticated
   - Check if you have the correct project linked

### Additional Notes

- The project uses pnpm as the package manager
- Environment variables are managed through Vercel
- The project is configured to use Edge Runtime for API routes
- Make sure to keep your `.env.local` file secure and never commit it to version control

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
