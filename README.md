NPF MOC-EXAM NGN

## Subject Notes & Recall

The Arena includes a subject-notes stack with an ordered content-block editor,
focused reading, single-note recall, randomized master tests, and a connected
retention dashboard. Manage and preview lessons through **Admin → Notes & Recall**
and practise at `/recall`.

The content studio includes topic duplication, reversible removals, list reordering,
and per-note teacher insights. Students can revisit one note, adjust reading text
size, recover unfinished answers, and see precise list-item feedback.

See [SUBJECT_RECALL.md](SUBJECT_RECALL.md) for the **v6 → v7 → v8** database setup,
server configuration and learning rules. Apply the recall migrations in order;
existing v7 installations need `src/supabase/migration-v8-recall-refinements.sql`.
Run `npm run test:recall` to check the engine.

For AI-assisted topic uploads, follow [RECALL_TOPIC_WORKFLOW.md](RECALL_TOPIC_WORKFLOW.md).
It documents source cleanup, missing-content completion, precise recall questions,
safe publishing, verification, and the approved Taxation example. [AGENTS.md](AGENTS.md)
points future coding agents to this workflow.

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
