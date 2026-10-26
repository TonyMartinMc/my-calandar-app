import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { login, getGoogleLoginUrl } from "../api/events"
import "./Auth.css"

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error")) {
      setError("Google sign in failed. Please try again or use email/password.")
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(identifier, password)
      onLogin()
    } catch (err) {
      setError("Incorrect username/email or password.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      const url = await getGoogleLoginUrl()
      window.location.href = url
    } catch (err) {
      setError("Could not connect to Google. Please try again.")
    }
  }

  return (
    <div className="auth-page">

      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">✦</div>
          <h1 className="auth-tagline">Your calendar,<br />your way.</h1>
          <p className="auth-sub">Beautiful, simple, and made just for you.</p>
        </div>
        <div className="auth-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-hint">Sign in to your calendar</p>

          {/* GOOGLE BUTTON */}
          <button className="google-signin-btn" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Username or Email</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Password</label>
                <Link to="/forgot-password" className="auth-link-small">
                  Forgot password?
                </Link>
              </div>
              <input
                className="auth-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">Sign up</Link>
          </p>
        </div>
      </div>

    </div>
  )
}