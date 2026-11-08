# Deployment Guide

## Prerequisites

- Node.js 20+ and npm installed locally
- Accounts on: [Vercel](https://vercel.com), [Render](https://render.com), [MongoDB Atlas](https://cloud.mongodb.com)
- VAPID keys generated (`npx web-push generate-vapid-keys` in backend/)

---

## 1. MongoDB Atlas

1. Create a free cluster.
2. Create a database user with read/write access.
3. Whitelist `0.0.0.0/0` (or Render's static IPs).
4. Copy the connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/ai-habit-tracker?retryWrites=true&w=majority`

---

## 2. Deploy Backend to Render

1. In Render, click **New → Web Service**.
2. Connect your GitHub repo.
3. Set **Root Directory** to `backend`.
4. Render auto-detects `render.yaml` — confirm build command `npm install` and start command `node server.js`.
5. Set the following **Environment Variables** in the Render dashboard (marked `sync: false` in render.yaml mean they must be set manually):

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | Your Atlas connection string |
   | `JWT_SECRET` | A long random string |
   | `JWT_EXPIRES_IN` | `1d` |
   | `GROQ_API_KEY` | Your Groq API key |
   | `AI_MODEL` | e.g. `openai/gpt-oss-20b` |
   | `CLIENT_URL` | Your Vercel frontend URL (set after step 3) |
   | `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
   | `VAPID_PRIVATE_KEY` | From `npx web-push generate-vapid-keys` |
   | `VAPID_EMAIL` | `mailto:you@example.com` |

6. Click **Deploy**. Note the service URL, e.g. `https://ai-habit-tracker-backend.onrender.com`.
7. Verify: `curl https://ai-habit-tracker-backend.onrender.com/api/health` should return `{"status":"ok",...}`.

---

## 3. Deploy Frontend to Vercel

1. In Vercel, click **Add New → Project**.
2. Import your GitHub repo.
3. Set **Root Directory** to `frontend/ai-habit-tracker`.
4. Framework preset: **Vite** (auto-detected).
5. Set the following **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://ai-habit-tracker-backend.onrender.com/api` |
   | `VITE_VAPID_PUBLIC_KEY` | Your VAPID public key |

6. Click **Deploy**. Note the deployment URL, e.g. `https://your-app.vercel.app`.
7. The `vercel.json` SPA rewrite is already in the repo — all routes resolve to `index.html`.

---

## 4. Post-deploy: Update Backend CORS

In Render dashboard → your backend service → **Environment**:

- Set `CLIENT_URL` to your Vercel URL: `https://your-app.vercel.app`
- Click **Save Changes** — Render will redeploy automatically.

---

## 5. Post-deploy Checklist

- [ ] `https://your-backend.onrender.com/api/health` returns `{"status":"ok"}`
- [ ] Log in at your Vercel URL
- [ ] Dashboard loads with habits
- [ ] "Enable Notifications" flow completes without hanging
- [ ] AI weekly report generates
