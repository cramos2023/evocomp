# E2E Verification: SMTP & Password Recovery

Use this checklist to verify that the EvoComp platform correctly handles
password recovery and transactional emails.

## 1. Supabase Infrastructure Check

Navigate to **Authentication > Settings > SMTP** in the Supabase Dashboard and
verify these values:

- [ ] **SMTP Enabled**: ON
- [ ] **Host**: `smtp.resend.com`
- [ ] **Port**: `587`
- [ ] **User**: `resend`
- [ ] **Password**: `re_...` (Your Resend API Key)
- [ ] **Sender Email**: `no-reply@yourdomain.com` (Must be verified in Resend)

## 2. Resend Testing Mode Validation

If you do **not** have a verified domain yet:

- [ ] Verify you are using the Account Owner email
      (`carlos_ramos20@hotmail.com`) as the recipient.
- [ ] Attempt a "Forgot Password" with a different email and confirm the UI
      shows the specific "Resend Testing Mode" error (550).

## 3. UI/UX Verification

Open the application at `/login`:

- [ ] **Action**: Click "Reset?" without an email.
- [ ] **Result**: UI shows "Enter your email first."
- [ ] **Action**: Enter a valid email and click "Reset?".
- [ ] **Result (Success)**: UI shows "Security link sent! Check your inbox."
- [ ] **Result (SMTP Error 550)**: UI shows a descriptive error about Resend
      Testing Mode.
- [ ] **Result (SMTP Error 535)**: UI shows a descriptive error about SMTP
      Authentication (Username/Password).

## 4. Console Evidence (Dev Mode)

- [ ] Open Browser DevTools (F12).
- [ ] Trigger a recovery email.
- [ ] Verify the full Supabase error object is logged to the console for
      debugging.

---

**Status:** ⚪ Not Started | 🟡 In Progress | ✅ Verified
