# Confide — peer support for students

A Next.js + TypeScript + Supabase app that pairs students anonymously
to talk through problems, either as someone seeking support or
someone offering it.

## What's included

- Email/password signup and login, with a required safety
  acknowledgement (no phone numbers, no exact location).
- Onboarding: choose "seek help" / "give help" / "both", and tag
  topics as strengths or things you're working on (1-5 rating).
- Matching: `request_match()` (a Postgres function) finds an online,
  non-suspended helper who isn't already in a match.
- A pending-match screen showing the other person's relevant tags,
  with accept/reject.
- Realtime chat (Supabase Realtime) once a match is active, with an
  online/offline indicator.
- A lightweight crisis-keyword check that interrupts sending a message
  and surfaces crisis resources instead.
- Reporting, with a database trigger that flags/suspends an account
  after 3 distinct reporters (see the note in `supabase/schema.sql` —
  you can flip this to a manual review queue instead).

## 1. Create a free Supabase project

1. Go to supabase.com and create a free account and project.
2. In the SQL Editor, paste and run the contents of
   `supabase/schema.sql`. This creates every table, security policy,
   and the matching/suspension functions.
3. In Project Settings → API, copy your Project URL and anon public
   key.
4. Copy `.env.local.example` to `.env.local` and fill in those two
   values.
5. In Authentication → Providers, email/password is enabled by
   default — nothing else to configure for an MVP. For a university
   audience, consider turning on "Confirm email" and restricting
   signups to your school's email domain later.

## 2. Run it locally

```
npm install
npm run dev
```

Open http://localhost:3000.

## 3. Deploy for free

- Push this folder to a GitHub repo.
- Import it on vercel.com (free tier) and add the two `NEXT_PUBLIC_SUPABASE_*`
  environment variables in the Vercel project settings.
- Supabase's free tier and Vercel's free tier together cost nothing
  until you have meaningful real usage.

## Before you launch this to real students

A few things in the code are placeholders on purpose, because
guessing them would be worse than leaving them blank:

- **Crisis resources** (`src/components/CrisisModal.tsx`): fill in
  your actual campus counseling center number and a verified national
  crisis line. Don't ship a number you haven't double-checked.
- **Auto-suspend after 3 reports** (`supabase/schema.sql`): this
  matches what you asked for, implemented as a database trigger so it
  can't be bypassed from the client. The risk is that it can be gamed
  by a few people reporting the same person. If you'd rather review
  reports manually before suspending, set `auto_suspend := false` in
  `check_suspend_after_reports()` and check the `reports` table from
  the Supabase dashboard periodically instead.
- **Topic list** (seeded in `schema.sql`): the 12 starter topics are a
  guess at what university students deal with — add or rename freely.
- **Presence**: online status is a 30-second heartbeat
  (`src/hooks/usePresenceHeartbeat.ts`), not Supabase's full Presence
  API. It's simpler to reason about for an MVP; if you want sub-second
  accuracy later, Supabase Realtime Presence channels are the upgrade
  path.

This is peer support, not clinical triage. The crisis-keyword check is
a basic safety net, not moderation — it will miss things and
occasionally over-trigger. If you grow past a handful of users,
budget for actual human moderation of reports and flagged messages.
