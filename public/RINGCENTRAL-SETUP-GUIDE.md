# Connecting RingCentral to ClaimKing.AI — Step-by-Step Guide

This guide walks you through connecting your company's RingCentral phone system
to ClaimKing.AI so your calls appear in the dashboard automatically — including
**who answered** each call.

You will do this **once**, as the **RingCentral account owner / admin**. It takes
about 10 minutes. You only ever paste values **into ClaimKing** — you never share
your RingCentral password with anyone, and ClaimKing never asks for it.

> **Only the RingCentral account owner (or a Super Admin) can create the app in
> Step 1.** If that isn't you, forward Steps 1–3 to whoever owns your company's
> RingCentral account. Steps 4–5 (pasting into ClaimKing) can be done by your
> ClaimKing admin.

---

## What you'll end up with

Three values that you paste into ClaimKing:

1. **Client ID**
2. **Client Secret**
3. **JWT Token**

Keep them private — treat them like a password.

---

## Step 1 — Create a RingCentral app

1. Go to the RingCentral Developer Console: **https://developers.ringcentral.com**
2. Sign in with your **company RingCentral account** (the one that owns your phone system).
3. Click **Console → Apps → Create App**.
4. Choose:
   - **App type:** *REST API App*
   - **Do you intend to publish this app?** *No / Private* (it's only for your company)
   - **Platform type / Auth:** *Server-only (No UI)* — this is the JWT auth flow
     (a machine-to-machine connection, no login pop-ups).
5. Give it a name like **"ClaimKing Call Sync"** and a short description.

---

## Step 2 — Set the app permissions (scopes)

On the app's **Auth & Security** (or **Settings**) page, enable these permissions:

| Permission | Why ClaimKing needs it |
|---|---|
| **Read Accounts** | Read your account + extension list (to show *who answered*) |
| **Read Call Log** | Pull call history into the dashboard |
| **Read Presence** | Know call/agent status |
| **Webhook Subscriptions** | Receive new calls in real time |
| **RingOut** *(optional)* | Let staff click-to-call from ClaimKing (the "Call" button) |

Set the **Auth method** to **JWT** (JSON Web Token).

Save the app.

---

## Step 3 — Get your three values

**Client ID + Client Secret**

- On the app's **Credentials** page, copy the **Client ID** and **Client Secret**.

**JWT Token**

1. Go to **https://developers.ringcentral.com/console → Credentials → JWT** (or your profile → **Credentials**).
2. Click **Create JWT**.
3. Scope it to **this app** (select the "ClaimKing Call Sync" app you just made) and to your production environment.
4. Copy the generated **JWT token** — it's a long string. This is the only time
   it's shown in full, so copy it now.

> You now have **Client ID**, **Client Secret**, and **JWT Token**. Do not email
> or message these to anyone. You'll paste them straight into ClaimKing next.

---

## Step 4 — Paste into ClaimKing

1. In ClaimKing, open **AI Call Center → Settings (gear icon) → RingCentral**.
2. Paste your **Client ID**, **Client Secret**, and **JWT Token** into the three fields.
3. Click **Connect Phone**.

ClaimKing exchanges the JWT for a secure token, stores everything **encrypted**,
and sets up the real-time webhook automatically.

---

## Step 5 — Test the connection

1. Click **Test Connection**.
2. A green message confirms it worked and shows your **account name**, **main
   number**, and **extension count**, plus whether **real-time call events are
   active**.
3. If it's red, the message tells you what to fix — usually a mistyped value or a
   missing app permission from Step 2. Fix it and click **Connect Phone** again,
   then **Test Connection**.

---

## After connecting

- New calls flow into **AI Call Center** automatically, tagged with **who
  answered** (the extension → employee mapping).
- To make names show instead of raw extensions, open **Settings → Answered-By
  mapping** and match each RingCentral extension to a team member.
- ClaimKing renews the webhook subscription automatically — you don't need to
  reconnect unless you regenerate your credentials.

---

## Troubleshooting

| Message | Fix |
|---|---|
| *"Credentials were rejected"* / 401 | Re-check the Client ID / Secret / JWT for typos or extra spaces. Regenerate the JWT if unsure. |
| *"Webhook subscription is not active"* | Click **Reconnect Phone**. If it persists, confirm **Webhook Subscriptions** permission is enabled on the app (Step 2). |
| Calls connect but no name shows | Set up **Answered-By mapping** (extension → employee). |
| Test says connected but no new calls appear | Make sure the app is in your **production** environment (not sandbox) and the JWT is scoped to production. |

---

### Security notes

- ClaimKing **never** asks for your RingCentral **password** — only the app
  credentials above, which you can revoke any time from the RingCentral console.
- All three values are stored **encrypted** in ClaimKing.
- To disconnect, use **Disconnect** in the RingCentral settings; ClaimKing
  removes the webhook and clears the stored tokens.
