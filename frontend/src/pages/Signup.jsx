import { useState } from "react"
import { Link } from "react-router-dom"
import { signup, getGoogleLoginUrl } from "../api/events"
import "./Auth.css"

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score: 20, label: "Too weak", color: "#E11D48" }
  if (score === 2) return { score: 40, label: "Weak", color: "#F97316" }
  if (score === 3) return { score: 60, label: "Fair", color: "#EAB308" }
  if (score === 4) return { score: 80, label: "Good", color: "#22C55E" }
  return { score: 100, label: "Strong", color: "#16A34A" }
}

export default function Signup({ onSignup }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(form.password)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: "" }))
  }

  function touch(field) {
    setTouched(t => ({ ...t, [field]: true }))
    validateField(field, form[field])
  }

  function validateField(field, value) {
    let error = ""

    if (field === "first_name") {
      if (!value.trim()) error = "First name can't be empty."
    }

    if (field === "last_name") {
      if (!value.trim()) error = "Last name can't be empty."
    }

    if (field === "username") {
      if (!value.trim()) {
        error = "Username can't be empty."
      } else if (value.length < 3) {
        error = `Username is too short — needs at least 3 characters (you have ${value.length}).`
      } else if (value.length > 20) {
        error = "Username is too long — max 20 characters."
      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        error = "Username can only use letters, numbers, and underscores."
      }
    }

    if (field === "email") {
      if (!value.trim()) {
        error = "Email can't be empty."
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "That doesn't look like a valid email address."
      }
    }

    if (field === "password") {
      if (!value) {
        error = "Password can't be empty."
      } else if (value.length < 8) {
        error = `Password is too short — needs at least 8 characters (you have ${value.length}).`
      }
    }

    if (field === "confirm") {
      if (!value) {
        error = "Please confirm your password."
      } else if (value !== form.password) {
        error = "Passwords don't match."
      }
    }

    setErrors(e => ({ ...e, [field]: error }))
    return error
  }

  function validate() {
    const fields = ["first_name", "last_name", "username", "email", "password", "confirm"]
    const errs = {}
    fields.forEach(f => {
      const err = validateField(f, form[f])
      if (err) errs[f] = err
    })
    setTouched({ first_name: true, last_name: true, username: true, email: true, password: true, confirm: true })
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    const errs = validate()
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await signup(
        form.username.trim(),
        form.email.trim(),
        form.password,
        form.first_name.trim(),
        form.last_name.trim()
      )
      onSignup()
    } catch (err) {
      const data = err.response?.data
      if (data?.username) {
        setErrors(e => ({ ...e, username: `"${form.username}" is already taken.` }))
      }
      if (data?.email) {
        setErrors(e => ({ ...e, email: `An account with ${form.email} already exists.` }))
      }
      if (data?.error) {
        setErrors(e => ({ ...e, general: data.error }))
      }
      if (!data) {
        setErrors(e => ({ ...e, general: "Something went wrong. Please try again." }))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      const url = await getGoogleLoginUrl()
      window.location.href = url
    } catch (err) {
      setErrors(e => ({ ...e, general: "Could not connect to Google. Please try again." }))
    }
  }

  return (
    <div className="auth-page">

      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">✦</div>
          <h1 className="auth-tagline">Start fresh,<br />stay organised.</h1>
          <p className="auth-sub">Create your account and make it yours.</p>
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
          <h2 className="auth-title">Create account</h2>
          <p className="auth-hint">Set up your personal calendar</p>

          {/* GOOGLE BUTTON */}
          <button type="button" className="google-signin-btn" onClick={handleGoogleLogin}>
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

            {/* FIRST + LAST NAME */}
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label">First Name</label>
                <input
                  className={`auth-input ${errors.first_name ? "auth-input-error" : touched.first_name && !errors.first_name && form.first_name ? "auth-input-success" : ""}`}
                  type="text"
                  placeholder="First name"
                  value={form.first_name}
                  onChange={e => set("first_name", e.target.value)}
                  onBlur={() => touch("first_name")}
                  autoFocus
                />
                {errors.first_name && <span className="auth-field-error">{errors.first_name}</span>}
              </div>
              <div className="auth-field">
                <label className="auth-label">Last Name</label>
                <input
                  className={`auth-input ${errors.last_name ? "auth-input-error" : touched.last_name && !errors.last_name && form.last_name ? "auth-input-success" : ""}`}
                  type="text"
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={e => set("last_name", e.target.value)}
                  onBlur={() => touch("last_name")}
                />
                {errors.last_name && <span className="auth-field-error">{errors.last_name}</span>}
              </div>
            </div>

            {/* USERNAME */}
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                className={`auth-input ${errors.username ? "auth-input-error" : touched.username && !errors.username && form.username ? "auth-input-success" : ""}`}
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={e => set("username", e.target.value)}
                onBlur={() => touch("username")}
              />
              {errors.username
                ? <span className="auth-field-error">{errors.username}</span>
                : touched.username && form.username && !errors.username
                  ? <span className="auth-field-success">Looks good!</span>
                  : null
              }
            </div>

            {/* EMAIL */}
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className={`auth-input ${errors.email ? "auth-input-error" : touched.email && !errors.email && form.email ? "auth-input-success" : ""}`}
                type="text"
                placeholder="Enter your email address"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                onBlur={() => touch("email")}
              />
              {errors.email
                ? <span className="auth-field-error">{errors.email}</span>
                : touched.email && form.email && !errors.email
                  ? <span className="auth-field-success">Valid email!</span>
                  : null
              }
            </div>

            {/* PASSWORD */}
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className={`auth-input ${errors.password ? "auth-input-error" : touched.password && !errors.password && form.password ? "auth-input-success" : ""}`}
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                onBlur={() => touch("password")}
              />
              {errors.password && (
                <span className="auth-field-error">{errors.password}</span>
              )}
              {form.password && (
                <div className="auth-password-strength">
                  <div className="auth-strength-bar">
                    <div
                      className="auth-strength-fill"
                      style={{ width: `${strength.score}%`, background: strength.color }}
                    />
                  </div>
                  <span className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* CONFIRM */}
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <input
                className={`auth-input ${errors.confirm ? "auth-input-error" : touched.confirm && !errors.confirm && form.confirm ? "auth-input-success" : ""}`}
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={e => set("confirm", e.target.value)}
                onBlur={() => touch("confirm")}
              />
              {errors.confirm
                ? <span className="auth-field-error">{errors.confirm}</span>
                : touched.confirm && form.confirm && !errors.confirm
                  ? <span className="auth-field-success">Passwords match!</span>
                  : null
              }
            </div>

            {errors.general && (
              <div className="auth-error">{errors.general}</div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>

    </div>
  )
}