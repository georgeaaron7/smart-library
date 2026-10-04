# ISG Smart Library System

A librarian workspace for Indian School Al Ghubra. It uses student and physical-copy QR codes, camera ISBN scanning, Open Library metadata, Supabase Auth/PostgreSQL, deterministic book recommendations, and scheduled email reminders. There is no student or parent account.

## What works

- Librarian sign-in, password reset, and first-login tutorial
- Student records, QR cards, search, deactivation, and CSV export
- Book titles separated from unique physical copies, ISBN lookup, QR labels, and copy states
- Transactional issue/return with maximum-book rules and overrides
- Dashboard, overdue management, audit and notification history
- Explainable recommendations based on borrowing history, availability, grade, subjects, authors, and popularity
- Mock email, optional Brevo delivery, a daily reminder endpoint, and a manual reminder check

The crest in `public/school-logo.png` is from the [official school website](https://www.indianschool.com/). Replace it if the school supplies a higher resolution approved asset.

## Local setup

1. Create a Supabase project and keep its project URL, anon key, and service-role key.
2. In the Supabase SQL Editor, run `supabase/migrations/001_initial.sql`, then `supabase/migrations/002_integrity.sql`.
3. In Supabase Auth settings, disable public signup. Create the first librarian in the Supabase dashboard. Confirm the account's email address.
4. Add its Auth user ID to `librarian_profiles`:

   ```sql
   insert into librarian_profiles (id, display_name)
   values ('AUTH_USER_UUID_HERE', 'School Librarian');
   ```

5. Copy `.env.example` to `.env.local` and fill in the Supabase values. Keep `EMAIL_MODE=mock` to demonstrate without an email provider. Set a long random `CRON_SECRET`.
6. Run `npm install` and `npm run dev`, then visit [localhost:3000](http://localhost:3000).
7. Optionally run `supabase/seed.sql` in the Supabase SQL Editor **after** the librarian profile exists. This adds fictional demonstration data and is designed for a fresh demo database.

All keys other than `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must stay server-side. Never commit `.env.local`.

## Email

Mock mode saves fully rendered emails in Activity as **Simulated**. It needs no account. For live email, set `EMAIL_MODE=brevo`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` on the server, then select **Brevo · live** in Settings. Both the environment switch and Settings switch must be set to live. Authentication of the sender domain is recommended before real use. A failed send is recorded for retry and does not reverse a successful loan transaction.

The daily endpoint is `/api/cron/reminders`. It requires `Authorization: Bearer <CRON_SECRET>` and stores a unique notification per loan, type, recipient, and date. `vercel.json` schedules a daily check. The Settings button can run the check immediately. Loan dates are stored in UTC and interpreted in the configured school timezone, initially Asia/Muscat.

## Deploy to Vercel

1. Push this project to a private repository and import it into Vercel.
2. Add all values from `.env.example` as Vercel environment variables. Use production Supabase credentials. Do not put the service-role or Brevo keys in `NEXT_PUBLIC_*` variables.
3. Deploy. Add the deployed URL to the allowed redirect URLs in Supabase Auth so password recovery returns to the app.
4. Confirm the cron from `vercel.json` appears in Vercel, then run **Settings → Run reminder check now** once.
5. Test the rear camera on a real phone over HTTPS and print a sample student card and copy label.

If a free Supabase project has paused, resume it in the Supabase dashboard before a demonstration.

## Tests

`npm test` runs recommendation and reminder-schedule tests without external services. `npm run build` checks the full Next.js production build.

`tests/integration.test.ts` exercises actual database issue/return behavior in a **disposable** Supabase project. It is skipped unless `ISG_TEST_PROJECT=1`, the three Supabase environment variables, `ISG_TEST_EMAIL`, and `ISG_TEST_PASSWORD` are exported. The test account must have a `librarian_profiles` row. This suite writes test records and should never run against the school production database.

Before school use, test Chrome desktop, Chrome Android, Safari iPhone, permission allowed/denied, Open Library unavailable, unknown ISBN, Brevo failure, slow network, and narrow screens. These device and service checks require a deployed project and cannot be verified from source alone.

## Important operating notes

- QR payloads are opaque tokens. A scan only resolves records inside a librarian session.
- Every issue and return is a database function with row locks. A partial transaction cannot leave a copy with two active loans.
- Open Library only fills the add-book form; existing catalog and circulation operations use Supabase records.
- The `audit_logs` table is immutable. Librarian actions call the audit function; direct database administration should follow school policy.
- CSV exports contain private student data and should be handled according to school procedures.
- The optional Quarky/eVive status indicator is documented in `docs/DTI.md` and is not needed for this app.
