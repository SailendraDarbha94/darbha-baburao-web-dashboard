# Claims Handling Platform

Field agents submit insurance claims from an Expo mobile app; admins review them in a Next.js dashboard whose
route handlers are the backend for both. Supabase provides auth, Postgres (with RLS) and file storage.

Architecture and decisions: [docs/PLAN.md](docs/PLAN.md).

## Layout

```
apps/web        Next.js admin dashboard + API route handlers
apps/mobile     Expo app for field agents
packages/shared zod schemas, TS types, constants
packages/supabase generated DB types, client factories, SQL migrations
```

## Setup from clone

```bash
nvm use                  # or `fnm use`: reads .nvmrc (Node 22, which bundles corepack)
corepack enable          # makes the pinned pnpm version in package.json available
pnpm install
```

`.npmrc` sets `node-linker=hoisted`, which Expo requires; do not change it.

## Running

```bash
pnpm dev                 # web on http://localhost:3000 and the Expo dev server, via turbo's TUI:
                         # select the mobile task and press Enter before using Expo's keyboard shortcuts
pnpm --filter web dev    # web only
pnpm --filter mobile dev # Expo only (press i for the iOS simulator)
```

Other tasks: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Supabase

Migrations are plain SQL under `packages/supabase/migrations`, applied with the Supabase CLI
(`brew install supabase/tap/supabase`), which is pointed at `packages/supabase` via `--workdir packages` (baked
into the root `db:*` scripts). Supabase can run as a hosted project or locally in Docker; the application code
is identical, only the `.env` values differ.

### Against a hosted project (default; Docker not required)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) and note the project ref
   (Project Settings → General) and the database password you chose.
2. `supabase login`.
3. Link this repo to the project (prompts for the database password):

```bash
pnpm db:link --project-ref <your-project-ref>
```

4. Apply the migrations and regenerate the database types:

```bash
pnpm db:push
pnpm db:types
```

5. Fill in `apps/web/.env.local` and `apps/mobile/.env` from the `.env.example` files (Project Settings → API).
6. Configure the dashboard settings listed under "Dashboard settings to configure by hand" below.

### Locally (needs Docker Desktop)

`supabase start` runs Postgres, Auth, Storage, Studio and a mail catcher in containers, then applies the same
migrations (tables, policies, the `claim-files` bucket and its storage policies):

```bash
pnpm db:start        # first run pulls the images; prints the local API URL and keys when ready
pnpm db:reset        # (re)creates the local database from the migrations, then loads packages/supabase/seed.sql
pnpm db:types:local  # regenerates packages/supabase/types.ts from the local database
pnpm db:status       # prints the URL and keys again;  pnpm db:stop  when done
```

Fill in `apps/web/.env.local` and `apps/mobile/.env` from `pnpm db:status`: the API URL
(`http://127.0.0.1:54321`; a physical phone needs your Mac's LAN IP instead) is `NEXT_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_URL`, the publishable (`anon`) key is the `*_SUPABASE_ANON_KEY` values and the secret
(`service_role`) key is `SUPABASE_SERVICE_ROLE_KEY`. Studio is at http://127.0.0.1:54323; every email
(confirmation, password reset) lands in the mail viewer at http://127.0.0.1:54324 instead of being sent, and
the local sender has no rate limit. Promote your admin with the SQL below in Studio's SQL editor.

The dashboard settings below have no dashboard locally: their equivalents are in
`packages/supabase/config.toml` under `[auth]` (`site_url`, `additional_redirect_urls`,
`minimum_password_length`) and `[auth.email]` (`enable_confirmations`), which already carry the documented
values; after editing the file run `pnpm db:stop && pnpm db:start`. `pnpm db:push` and `pnpm db:types` always
target the linked hosted project; the local stack uses `pnpm db:reset` and `pnpm db:types:local`.

#### If linking or pushing cannot connect

Supabase's direct database host (`db.<ref>.supabase.co`) is IPv6-only. On a network without IPv6 (most home
and office Wi-Fi), `pnpm db:link`, `pnpm db:push` and `pnpm db:types` fail with a connection error. Use the
session pooler instead, which is IPv4: pass `--db-url` with
`postgresql://postgres.<ref>:<db password>@aws-0-<region>.pooler.supabase.com:5432/postgres`, where `<region>`
is the AWS region the project actually runs in (Project Settings → General; it can differ from what the
creation form showed). For example:

```bash
supabase --workdir packages db push --db-url "$DB_URL"
supabase --workdir packages gen types --lang typescript --db-url "$DB_URL" --schema public > packages/supabase/types.ts
```

The pooler URL contains the database password, so keep it in a shell variable or a password manager, never
in the repo.

### Everyday commands

| Command               | What it does                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm db:new <name>`  | creates an empty timestamped migration file under `packages/supabase/migrations`                                |
| `pnpm db:push`        | applies unapplied migrations to the linked project                                                              |
| `pnpm db:types`       | regenerates `packages/supabase/types.ts` from the linked project (run after every migration; commit the result) |
| `pnpm db:start`       | local stack (Docker): starts it, applying the migrations on first start                                         |
| `pnpm db:reset`       | local stack: recreates the local database from the migrations and `seed.sql`                                    |
| `pnpm db:types:local` | local stack: regenerates `packages/supabase/types.ts` from the local database                                   |
| `pnpm db:status`      | local stack: prints the local URL and keys                                                                      |
| `pnpm db:stop`        | local stack: stops the containers                                                                               |

Migrations are hand-written: without Docker there is no `db diff`. `packages/supabase/types.ts` is generated;
never hand-edit it. Until it has been regenerated against a real database the file is a hand-written stand-in
with the same shape.

### Promoting an admin

Sign up once (mobile app or the dashboard's Authentication → Users → Add user), then in the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<uuid from Authentication → Users>';
```

There is no self-serve admin sign-up.

### Dashboard settings to configure by hand

These cannot be expressed in migrations.

1. **Authentication → URL Configuration.** Site URL: the web app URL (`http://localhost:3000` in development,
   the Vercel URL later). Redirect URLs: `claimsagent://reset-password`, plus, while testing in Expo Go, the
   `exp://…/--/reset-password` value the mobile app logs at startup in development (it contains your Mac's LAN
   IP, which changes per network; a wildcard such as `exp://192.168.*.*:8081/--/reset-password` also works, provided
   the port matches the one `expo start` prints — it is 8081 unless that port was busy). If the value does not
   match an entry exactly, Supabase silently redirects the reset link to the Site URL instead of the app.
   Remove the `exp://` entry before production.
2. **Authentication → Providers → Email.** Keep enabled. Decide whether "Confirm email" is on: with it on,
   new agents must open the confirmation link before their first sign-in (the mobile sign-up screen tells them
   so); off is simpler for an internal tool. Set "Minimum password length" to 8: the mobile sign-up and reset
   screens validate the same rule (`PASSWORD_MIN_LENGTH` / `passwordSchema` in `packages/shared`) before calling
   Supabase; leave the character-class requirement off, or add the same rule to `passwordSchema`.
3. **Authentication → Email Templates → Reset Password.** The default template works with the mobile app's
   PKCE flow; change wording only. The link must be opened on the phone that requested it, in a real browser
   (some mail apps' in-app browsers do not follow the redirect into the app).
4. **Authentication → SMTP.** The built-in sender is rate-limited to a few emails per hour; configure a custom
   SMTP provider before anyone but you tests sign-up or password reset.
5. **Storage.** The private `claim-files` bucket and its policies come from migrations 3 and 4; after
   `pnpm db:push`, confirm the bucket shows as private under Storage. Ownership of the `storage` schema has
   changed across Supabase releases: if migration 4 is rejected, create its four policies by hand under
   Storage → Policies using the predicates in `packages/supabase/migrations/20260902000004_storage_policies.sql`;
   if migration 3 is rejected too, create the bucket there (private, 25 MiB limit, `image/jpeg`, `image/png`,
   `image/heic`, `application/pdf`).

Testing password reset on the iOS simulator: read the email on the Mac, then open the link inside the simulator
with `xcrun simctl openurl booted '<link from the email>'` (the PKCE verifier lives in the simulator's storage,
so opening it in the Mac browser will not work).

## Push notifications

Admin status changes and agent-visible notes send an Expo push to the claim's agent; tapping it opens the
claim in the mobile app. The pieces: `apps/mobile/lib/notifications.ts` (registration, foreground handler),
`apps/mobile/app/_layout.tsx` (tap → `/claims/[id]`), `POST /api/me/push-token` (stores the token on
`profiles.expo_push_token`; the app clears it on sign-out, and storing a token takes it away from any other
profile that still holds it, so a shared phone is registered to one account at a time) and
`apps/web/lib/push.ts` (sending).

### A development build is required

Expo Go cannot receive remote push on Android (dropped in SDK 53; iOS Expo Go still can), and this project
uses a development build on both platforms (docs/PLAN.md decision s), so push can only be tried in a
development build of this app (`expo-dev-client`, already installed). Because `expo-dev-client` is installed, `expo start` now
defaults to development-build mode; keep using Expo Go for everything except push with
`npx expo start --go` from `apps/mobile` (or press `s` in the Expo CLI to switch).

The app also skips registration on simulators and emulators (`Device.isDevice` is false) and logs the
reason in development; everything else keeps working without push. That is the plan's choice (docs/PLAN.md
§5 step 8: test on a physical device), not a hard limit — iOS Simulators on Xcode 14+ and Android emulators
with Google Play services can receive push, so remove that guard in `lib/notifications.ts` to test there.

### One-time setup

The Expo project already exists and is linked: `extra.eas.projectId` in `app.config.ts`, and
`ios.bundleIdentifier` / `android.package` are set. What remains is per-developer and per-platform:

1. An Expo account with access to the project: `npm i -g eas-cli && eas login`. (A fresh project would be
   created with `eas init` inside `apps/mobile`; it prints the id but cannot write to a dynamic config, so
   the id is pasted into `app.config.ts` by hand.)
2. Android signing: nothing to do up front. The first `eas build --platform android` offers to generate a
   keystore and stores it on EAS; `eas credentials` shows it afterwards.
3. Android push (FCM V1). In the Firebase console create a project and add an Android app whose package name
   matches `android.package` exactly. Then:
   - download `google-services.json`, save it as `apps/mobile/google-services.json` (gitignored) and add
     `android.googleServicesFile: "./google-services.json"` to `app.config.ts`;
   - Project settings → Service accounts → Generate new private key, then upload that JSON with
     `eas credentials` (Android → Google Service Account → FCM V1).
     Without both halves `getExpoPushTokenAsync` fails and registration is skipped.
4. iOS push: a paid Apple Developer account. `eas build` sets up the APNs key on first run, or run
   `eas credentials` (iOS → push key) yourself.

### Building and running a development build

- Cloud: `eas build --profile development --platform ios` (or `android`) using the `development` profile in
  `eas.json` (see Deploying), install the result on the device, then `npx expo start` and open the project from
  the dev build.
- Local: `npx expo run:ios` (needs Xcode and CocoaPods) or `npx expo run:android` from `apps/mobile`. This
  generates `apps/mobile/ios/` or `android/`, which are gitignored; the project stays managed.

On first sign-in the app asks for notification permission, fetches its Expo push token and stores it via
`POST /api/me/push-token`. In development the token is logged as `[push] registered ExponentPushToken[…]`;
paste it into [expo.dev/notifications](https://expo.dev/notifications) to send a test message (put
`{"claim_id": "<uuid>"}` in the data field to test the deep link).

### How sending works

`POST /api/admin/claims/:id/status` and `POST /api/admin/claims/:id/notes` (agent-visible notes only) call
`sendClaimPush()` after the response is sent, with `data: { claim_id }`. Only push _tickets_ are inspected —
no receipt polling, no queue (docs/PLAN.md decision i). A `DeviceNotRegistered` ticket nulls the token on
the agent's profile; the app re-registers on its next launch. That null-out is the only service-role write in
the codebase (`apps/web/lib/push.ts`); without `SUPABASE_SERVICE_ROLE_KEY` it is logged and skipped. The other
cross-account token write — `POST /api/me/push-token` clearing a newly registered token from any other profile,
so a shared phone is registered to one account — runs as the caller through the `release_push_token()`
database function (migration 5), not the service role.
A push failure never fails the admin action. Set `EXPO_ACCESS_TOKEN` in `apps/web/.env.local` only if
"Enhanced push security" is enabled on the Expo project.

## Deploying

Configuration only; nothing here runs a deploy.

### Web + API on Vercel

`apps/web/vercel.json` only declares the framework; everything else is a project setting in the Vercel dashboard:

1. Import the GitHub repository and set **Root Directory** to `apps/web`.
2. Keep **Include source files outside of the Root Directory in the Build Step** enabled (default for new
   projects). Without it `transpilePackages` cannot find `packages/*`.
3. Node.js version **22.x**.
4. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   and, if the Expo project has enhanced push security on, `EXPO_ACCESS_TOKEN`. Add `ENABLE_EXPERIMENTAL_COREPACK=1`
   so the `packageManager` pin in the root `package.json` decides the pnpm version.
5. Build command: leave the default. Vercel detects `turbo.json` and runs the web app's `build` task; `next build`
   directly also works.
6. After the first deploy, put the production URL into Supabase → Authentication → URL Configuration → Site URL,
   and into `apps/mobile/eas.json` (`EXPO_PUBLIC_API_URL` for the preview and production profiles).

Route handlers and the admin dashboard run on the Node.js runtime (the default); nothing uses the Edge runtime.

### Mobile on EAS

`apps/mobile/eas.json` defines three build profiles that all pin Node 22.23.1 and pnpm 10.34.4 (EAS build images
otherwise pick their own versions; a newer pnpm would install with an isolated layout that Expo cannot use).
Each profile names the EAS environment of the same name (`environment`), which is where the build reads its
EAS environment variables from:

| Profile       | Purpose                                                     | `EXPO_PUBLIC_API_URL`                                                                                                   |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `development` | development client for a physical device (push, deep links) | not in `eas.json`: the JavaScript comes from `expo start`, which reads `apps/mobile/.env` — put your Mac's LAN IP there |
| `preview`     | internal distribution (TestFlight / APK) against production | the Vercel URL (`env` block in `eas.json`)                                                                              |
| `production`  | store builds, build number auto-incremented                 | the Vercel URL (`env` block in `eas.json`)                                                                              |

A development build contains no JavaScript bundle, so none of the `EXPO_PUBLIC_*` values matter at build time
for it; the preview and production builds inline them, which is why those need the variables below.

Before the first build:

1. `npm install -g eas-cli` (the config requires 20 or newer; upgrading to the latest is recommended), then
   `eas login`.
2. In `apps/mobile`: `eas init`, then paste the printed project id into `app.config.ts` under `extra.eas.projectId`.
3. Set `ios.bundleIdentifier` and `android.package` in `app.config.ts` to your organisation's reverse-DNS
   identifiers (placeholders are committed).
4. Replace the `REPLACE-…` values in the `preview` and `production` `env` blocks of `eas.json`, and create
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables in **both** the
   `preview` and `production` environments (they are per environment; a variable that exists in only one leaves
   the other build with no Supabase config and the app shows its configuration-error screen):

   ```bash
   eas env:create --scope project --environment preview --environment production --visibility plaintext \
     --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co
   eas env:create --scope project --environment preview --environment production --visibility plaintext \
     --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_…
   ```

   The build log prints which environment it resolved and which variables it loaded.

5. iOS internal builds (`development` and `preview` use `distribution: internal`, i.e. ad-hoc signing) only
   install on devices whose UDIDs are in the provisioning profile: register each test phone with
   `eas device:create` (it sends a registration link) before the first iOS build, and run `eas build` again
   after adding a device so the profile is regenerated.
6. Credentials: `eas credentials` (Apple Developer account for iOS; the FCM V1 service-account JSON for Android,
   plus `google-services.json` next to `app.config.ts`, gitignored, referenced by `android.googleServicesFile`).

Then, for example:

```bash
cd apps/mobile && eas build --profile development --platform ios
```

`eas submit` is not configured beyond an empty production profile; fill in `submit.production` when store
accounts exist.

## Tooling notes (why things are the way they are)

- **ESLint 9, not 10.** `eslint-config-next` and `eslint-config-expo` both pull in `eslint-plugin-react`,
  `eslint-plugin-jsx-a11y` and `eslint-plugin-import`, none of which support ESLint 10 yet (the React plugin
  calls an API ESLint 10 removed). The registry marks ESLint 9 as unsupported, so pnpm prints a deprecation
  warning whenever the lockfile is re-resolved (for example `pnpm update`); expected until those plugins move.
  Bump every workspace's `eslint` range together when they do.
- **`pnpm typecheck` in `apps/web` runs `next typegen` first.** Next 16 generates route/prop types under
  `.next/types` (for example the global `LayoutProps`), so a plain `tsc` on a fresh clone fails before the first
  build or dev run.
- **Metro and pnpm.** `apps/mobile/metro.config.js` watches the whole monorepo and resolves from the app's
  `node_modules` then the hoisted root. `react` is pinned to the identical exact version in both apps
  (`react-dom`, web only, to the same one) and `@types/react` to the same range, so there is exactly one React
  under hoisting (`pnpm why -r react` should list one copy).
- **Expo Go for everything except push.** `expo-dev-client` is installed, so `expo start` defaults
  to development-build mode; see Push notifications → A development build is required for
  `npx expo start --go`. `expo start` picks the next free port if 8081 is busy; the web app does the same for 3000
  when run through the in-app preview, otherwise `next dev` uses 3000.
- **`packages/*` are raw TypeScript.** No build step: Next compiles them via `transpilePackages`, Metro via
  `watchFolders`; their `package.json` `exports` point straight at `.ts` files.
