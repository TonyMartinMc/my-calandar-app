import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { fetchProfile, updateProfile } from "../api/events"
import AvatarCropper from "../components/AvatarCropper/AvatarCropper"
import "./EditProfile.css"

export default function EditProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [avatarColor, setAvatarColor] = useState("#F472B6")
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProfile().then(data => {
      setProfile(data)
      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        username: data.username || "",
        email: data.email || "",
        password: "",
        confirm: "",
      })
      if (data.avatar_url) setAvatarPreview(data.avatar_url)
      const colors = ["#F472B6", "#A78BFA", "#60A5FA", "#34D399", "#FB923C"]
      const idx = data.username.charCodeAt(0) % colors.length
      setAvatarColor(colors[idx])
    }).catch(() => navigate("/login"))
  }, [])

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.readAsDataURL(file)
  }

  function handleCropComplete(blob) {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  function handleCropCancel() {
    setCropSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSave() {
    if (form.password && form.password !== form.confirm) {
      setError("Passwords don't match.")
      return
    }
    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      delete payload.confirm
      if (avatarFile) payload.avatar = avatarFile
      const result = await updateProfile(payload)
      setSuccess("Profile updated successfully!")
      if (result.avatar_url) setAvatarPreview(result.avatar_url)
      setAvatarFile(null)
      setForm(f => ({ ...f, password: "", confirm: "" }))
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  const initials = profile
    ? ((form.first_name?.[0] || form.username?.[0] || "?") +
       (form.last_name?.[0] || "")).toUpperCase()
    : "?"

  const avatarUrl = avatarPreview || profile?.avatar_url

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-header">
        <button className="edit-profile-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="edit-profile-title">Edit Profile</h1>
        <button
          className="edit-profile-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="edit-profile-body">
        <div className="edit-profile-card">

          {/* AVATAR */}
          <div className="ep-avatar-section">
            <div
              className="ep-avatar"
              style={avatarUrl ? {} : { background: avatarColor }}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="ep-avatar-img" />
                : initials
              }
              <div className="ep-avatar-overlay">📷</div>
            </div>
            <button
              className="ep-avatar-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Change photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="ep-divider" />

          <div className="ep-section-title">Personal Info</div>

          <div className="ep-row">
            <div className="ep-field">
              <label className="ep-label">First Name</label>
              <input
                className="ep-input"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div className="ep-field">
              <label className="ep-label">Last Name</label>
              <input
                className="ep-input"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Username</label>
            <input
              className="ep-input"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Username"
            />
          </div>

          <div className="ep-field">
            <label className="ep-label">Email</label>
            <input
              className="ep-input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email"
            />
          </div>

          <div className="ep-divider" />
          <div className="ep-section-title">Change Password</div>
          <p className="ep-section-hint">Leave blank to keep your current password</p>

          <div className="ep-field">
            <label className="ep-label">New Password</label>
            <input
              className="ep-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="ep-field">
            <label className="ep-label">Confirm Password</label>
            <input
              className="ep-input"
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>

          {error && <div className="ep-error">{error}</div>}
          {success && <div className="ep-success">{success}</div>}

        </div>
      </div>

      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}