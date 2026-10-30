# Put the Sabino app on the web (Vercel + your own domain)

The app already runs in a browser (you use it on localhost:8081). These steps build it as a
real website, host it on Vercel and attach your domain.

## 1. Prepare the project (once, on your computer)
Run everything from the **frontend project root** (the folder that contains `app`).

```
node scripts/prepare-web.js
```
It tells you if any web package is missing and fixes `app.json` for you (backups saved as `*.bak`).
If it prints an install command, run it, for example:
```
npx expo install react-dom react-native-web @expo/metro-runtime
```
Then build and test the site locally:
```
npm run build:web          # creates the "dist" folder
npx serve dist -s          # open the address it prints, e.g. http://localhost:3000
```
Log in, open Score Entry, register a test school. If it works here it will work on Vercel.

> Why `"output": "single"`: the app uses `localStorage`, which does not exist while a static
> site is being pre-rendered at build time. "single" builds one app shell that runs in the browser.

## 2. Host it on Vercel
1. Push the frontend project to GitHub/GitLab (`vercel.json` and `.vercelignore` are already in it;
   `.vercelignore` keeps your `credentials/` folder, which holds the Android keystore, out of the upload).
   Do **not** put the keystore in a public repository.
2. Vercel dashboard -> **Add New -> Project** -> import the repo.
3. Settings: Framework Preset **Other**. If the repo also contains the backend, set
   **Root Directory** to the frontend folder. Build command, output folder and the "all pages ->
   index.html" rule come from `vercel.json`. Node.js version 20 or newer.
4. Deploy. You get an address like `https://something.vercel.app`.

This must be a **separate Vercel project** from the backend.

## 3. Connect your domain
1. Project -> **Settings -> Domains -> Add**, type the address you want, e.g. `app.yourdomain.com`
   (or `yourdomain.com` and `www.yourdomain.com`).
2. At your domain registrar's DNS page add exactly what Vercel shows. Normally:
   - subdomain (`app`): **CNAME** `app` -> `cname.vercel-dns.com`
   - root domain (`yourdomain.com`): **A** record `@` -> `76.76.21.21`
3. Wait a few minutes. Vercel shows a green check and issues the HTTPS certificate by itself.

## 4. Let the backend accept the website (do not skip)
Your backend only answers browsers from approved addresses. In the **backend** Vercel project:
**Settings -> Environment Variables -> add**
```
CLIENT_URL = https://app.yourdomain.com
```
Several addresses are allowed, separated by commas:
`https://app.yourdomain.com,https://www.yourdomain.com,https://something.vercel.app`
Then **redeploy the backend** (a new variable only applies after a redeploy).
Symptom if forgotten: the page loads but every request fails with "CORS" in the browser console.

## 5. What works / differs on the web
- Same screens, same login, same backend and database as the phone app.
- Payment on the web uses the Flutterwave option already in the app. Google Play billing
  (RevenueCat) exists only in the Android app.
- Push notifications and anything that needs the phone's hardware are mobile-only.

## Troubleshooting
| What you see | Cause / fix |
|---|---|
| Build fails with `localStorage is not defined` | `web.output` is not `"single"` - run `node scripts/prepare-web.js` again |
| Build fails: cannot find `react-native-web` / `react-dom` | run the `npx expo install ...` line from step 1 |
| Page loads, then every action fails (CORS in console) | step 4 not done or backend not redeployed |
| 404 when refreshing a page | `vercel.json` missing from the project root |
| Domain says "Invalid configuration" | DNS record not added yet / not propagated |
