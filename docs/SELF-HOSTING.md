# Nepos Digital Edition: Self-Hosting Package

Cornelius Nepos, *De viris illustribus*: digital edition with entity layer,
assertion apparatus, map, network, and "Ask the Edition" (RAG).

## Contents

- `web/`: the complete website, pre-built static files (no build step needed)
- `server/`: the API server (Node.js), self-contained bundle with the corpus
  data included in `server/data/`. Powers the Latin dictionary lookups and the
  "Ask the Edition" feature.

## Requirements

- Any static web server (nginx, Apache, …) for `web/`
- Node.js 20+ for `server/`
- An OpenAI API key (only for the "Ask" feature)

## Setup

### 1. Serve the website

Copy the contents of `web/` to your web root. It is a single-page app: your
server must send `index.html` for unknown paths. nginx example:

```nginx
location / {
    root /var/www/nepos/web;
    try_files $uri /index.html;
}
```

### 2. Run the API server

```bash
cd server
OPENAI_API_KEY=sk-...           \
ASK_ANALYSIS_MODEL=gpt-4o-mini  \
ASK_ANSWER_MODEL=gpt-4o         \
PORT=8080 node index.mjs
```

Keep it running with systemd or pm2.

### 3. Proxy /api to the server

The website calls `/api/...` on the same domain. nginx example:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_buffering off;          # required: "Ask" streams its answers (SSE)
    proxy_read_timeout 120s;
}
```

### 4. (Optional) Google sign-in

When configured, readers can sign in with Google. Signed-in readers get their
vocabulary list saved to their account (synced across devices), and the paid
"Ask the Edition" feature becomes **restricted to signed-in readers**. Without
this configuration, the site works exactly as before (vocabulary stays in the
browser, Ask is open to everyone).

1. In [Google Cloud Console](https://console.cloud.google.com/) sign in and
   create a **New Project** (any name, e.g. "Nepos Edition").
2. Go to **APIs & Services → OAuth consent screen**: choose **External**, fill
   in only the required fields (app name, your email), save, and press
   **Publish app** so that any visitor can sign in (not just you).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**, type **Web application**.
   - Authorized redirect URI: `https://nepos.humanisticadigitalia.eu/api/auth/google/callback`
   - Press Create; note the **Client ID** and **Client secret** it shows.
4. Start the server with these extra variables:

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com \
GOOGLE_CLIENT_SECRET=GOCSPX-...                 \
SESSION_SECRET=$(openssl rand -hex 32)          \
APP_ORIGIN=https://nepos.humanisticadigitalia.eu                  \
OPENAI_API_KEY=sk-... PORT=8080 node index.mjs
```

- `SESSION_SECRET`: any long random string; keep it stable across restarts,
  otherwise all readers are signed out.
- `APP_ORIGIN`: your site's public URL; **required** for sign-in (it fixes the OAuth redirect URI and cookie security; nothing is derived from request headers).
- Vocabulary lists are stored as small JSON files under `server/user-data/`
  (override with `VOCAB_DATA_DIR`). No database needed. Back this folder up if
  readers' lists matter to you.

## Costs

- The edition itself (texts, map, network, assertions, search, dictionary) is
  static; **no AI cost, ever**, regardless of traffic.
- Only "Ask the Edition" calls OpenAI: two model calls per **new** question
  (typically a fraction of a cent with gpt-4o-mini/gpt-4o; see OpenAI pricing).
- **Repeated questions are free**: answers are cached in memory, so each
  distinct question is paid for once per server run.
- Built-in protections: 6 questions/minute per visitor, max 4 concurrent,
  and model calls are aborted the moment a visitor disconnects.

If you prefer to disable "Ask" entirely, simply run the server without
`OPENAI_API_KEY` (the rest of the edition is unaffected) or don't run the
API server at all (dictionary lookups will also be off).

---

## Οδηγίες στα ελληνικά (σύνοψη)

1. **Ιστοσελίδα**: αντιγράψτε το περιεχόμενο του `web/` στον web server σας
   (nginx/Apache). Είναι single-page app; ο server πρέπει να επιστρέφει το
   `index.html` για άγνωστες διαδρομές (`try_files $uri /index.html;`).
2. **API server**: χρειάζεται Node.js 20+. Εκκίνηση:
   `OPENAI_API_KEY=sk-... ASK_ANALYSIS_MODEL=gpt-4o-mini ASK_ANSWER_MODEL=gpt-4o PORT=8080 node index.mjs`
   (μέσα στον φάκελο `server/`). Κρατήστε τον ενεργό με systemd ή pm2.
3. **Proxy**: δρομολογήστε το `/api/` στη θύρα 8080, με `proxy_buffering off`
   (το «Ask» στέλνει την απάντηση σε ροή).
4. **Σύνδεση με Google (προαιρετική)**, βήμα προς βήμα:
   - Στο console.cloud.google.com δημιουργήστε νέο έργο (π.χ. «Nepos Edition»).
   - «APIs & Services» → «OAuth consent screen»: επιλέξτε External, συμπληρώστε
     μόνο τα υποχρεωτικά (όνομα εφαρμογής, email), αποθηκεύστε και πατήστε
     **Publish app** για να συνδέεται οποιοσδήποτε επισκέπτης.
   - «APIs & Services» → «Credentials» → «Create Credentials» → «OAuth client
     ID» (τύπος: Web application) με redirect URI
     `https://nepos.humanisticadigitalia.eu/api/auth/google/callback`. Κρατήστε το Client ID
     και το Client secret που θα εμφανιστούν.
   - Ξεκινήστε τον server
   με `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` (τυχαία
   συμβολοσειρά; σταθερή σε επανεκκινήσεις) και `APP_ORIGIN`. Με ενεργή
   σύνδεση: το λεξιλόγιο κάθε αναγνώστη αποθηκεύεται στον λογαριασμό του
   (φάκελος `server/user-data/`; κρατήστε αντίγραφα ασφαλείας), και το «Ask»
   επιτρέπεται **μόνο σε συνδεδεμένους**. Χωρίς αυτά, όλα λειτουργούν όπως
   πριν.
5. **Κόστος**: μόνο το «Ask» χρεώνεται (απευθείας στον λογαριασμό σας στην
   OpenAI), και μόνο για **νέες** ερωτήσεις; οι επαναλήψεις απαντώνται δωρεάν
   από την cache. Όλο το υπόλοιπο είναι στατικό και δωρεάν. Χωρίς
   `OPENAI_API_KEY` το «Ask» απενεργοποιείται· η υπόλοιπη έκδοση λειτουργεί
   κανονικά.
