// src/pages/LoginPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error(
          "Supabase client is not available. Check src/lib/supabaseClient.ts export/import."
        );
      }

      if (mode === "signIn") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        // If session exists, navigate to home/dashboard
        if (data.session) {
          navigate("/", { replace: true });
        } else {
          setMessage("Signed in, but no session returned. Check auth configuration.");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        // Depending on Supabase email confirmation settings
        if (data.session) {
          navigate("/", { replace: true });
        } else {
          setMessage(
            "Account created. If email confirmation is enabled, check your inbox to confirm before signing in."
          );
        }
      }
    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Unexpected error. Check console logs.";
      setMessage(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage(null);
    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Adjust if your app uses a different reset route
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Password reset email sent (if the account exists).");
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to send reset email.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#111",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100%",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 24,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
          {mode === "signIn" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          {mode === "signIn"
            ? "Sign in to EvoComp."
            : "Create your EvoComp account."}
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          <label style={{ display: "block", fontSize: 13, opacity: 0.85 }}>
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              opacity: 0.85,
              marginTop: 12,
            }}
          >
            Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            placeholder="••••••••"
            style={inputStyle}
          />

          <button type="submit" disabled={!canSubmit} style={buttonStyle(canSubmit)}>
            {loading ? "Working..." : mode === "signIn" ? "Sign in" : "Sign up"}
          </button>

          {mode === "signIn" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                marginTop: 10,
                width: "100%",
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "10px 12px",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Forgot password
            </button>
          )}
        </form>

        {message && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 13,
              lineHeight: 1.35,
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.9 }}>
          {mode === "signIn" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signUp")}
                style={linkButtonStyle}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signIn")}
                style={linkButtonStyle}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  outline: "none",
};

function buttonStyle(enabled: boolean): React.CSSProperties {
  return {
    marginTop: 16,
    width: "100%",
    background: enabled ? "#fff" : "rgba(255,255,255,0.25)",
    color: enabled ? "#000" : "rgba(0,0,0,0.6)",
    border: "none",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: 600,
  };
}

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#9ad1ff",
  cursor: "pointer",
  padding: 0,
  fontSize: 13,
  textDecoration: "underline",
};
