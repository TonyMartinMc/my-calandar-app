import { useState } from "react"
import { Link } from "react-router-dom"
import "./Auth.css"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    // Simulate sending — hook up to backend later
    await new Promise(r => setTimeout(r, 1000))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-page">

      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">✦</div>
          <h1 className="auth-tagline">No worries,<br />we've got you.</h1>
          <p className="auth-sub">We'll help you get back in.</p>
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
          {sent ? (
            <div className="auth-success-wrap">
              <div className="auth-success-icon">📬</div>
              <h2 className="auth-title">Check your email</h2>
              <p className="auth-hint">
                We sent a password reset link to <strong>{email}</strong>.
                Check your inbox and follow the link to reset your password.
              </p>
              <Link to="/login" className="auth-btn auth-btn-link">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="auth-title">Forgot password?</h2>
              <p className="auth-hint">
                Enter your email and we'll send you a reset link.
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="auth-switch">
                Remember it?{" "}
                <Link to="/login" className="auth-link">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>

    </div>
  )
}