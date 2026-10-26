import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  logout, fetchProfile,
  fetchGoogleStatus, getGoogleAuthUrl, disconnectGoogle
} from "../../api/events"
import "./AccountMenu.css"

export default function AccountMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState("menu")
  const [profile, setProfile] = useState(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [avatarColor, setAvatarColor] = useState("#F472B6")
  const menuRef = useRef(null)

  useEffect(() => {
    fetchProfile().then(data => {
      setProfile(data)
      const colors = ["#F472B6", "#A78BFA", "#60A5FA", "#34D399", "#FB923C"]
      const idx = data.username.charCodeAt(0) % colors.length
      setAvatarColor(colors[idx])
    }).catch(() => {})

    fetchGoogleStatus()
      .then(data => setGoogleConnected(data.connected))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
        setView("menu")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleGoogleConnect() {
    const url = await getGoogleAuthUrl()
    window.location.href = url
  }

  async function handleGoogleDisconnect() {
    if (confirm("Disconnect Google Calendar?")) {
      await disconnectGoogle()
      setGoogleConnected(false)
    }
  }

  const initials = profile
    ? ((profile.first_name?.[0] || profile.username?.[0] || "?") +
       (profile.last_name?.[0] || "")).toUpperCase()
    : "?"

  const avatarUrl = profile?.avatar_url

  return (
    <div className="account-menu-wrapper" ref={menuRef}>
      <button
        className="avatar-btn"
        style={avatarUrl ? {} : { background: avatarColor }}
        onClick={() => { setOpen(o => !o); setView("menu") }}
        title="Account"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="avatar-img" />
          : initials
        }
      </button>

      {open && (
        <div className="account-dropdown">

          {view === "menu" && (
            <>
              <div className="dropdown-header">
                <div
                  className="dropdown-avatar"
                  style={avatarUrl ? {} : { background: avatarColor }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="avatar-img" />
                    : initials
                  }
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-username">
                    {profile?.first_name
                      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
                      : profile?.username}
                  </span>
                  <span className="dropdown-email">{profile?.email}</span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <button
                className="dropdown-item"
                onClick={() => { setOpen(false); navigate("/profile/edit") }}
              >
                <span className="dropdown-item-icon">👤</span>
                Edit Profile
              </button>

              <button
                className="dropdown-item"
                onClick={() => { setOpen(false); navigate("/settings") }}
              >
                <span className="dropdown-item-icon">⚙️</span>
                Settings
              </button>

              <button className="dropdown-item" onClick={() => setView("accounts")}>
                <span className="dropdown-item-icon">🔗</span>
                Connected Accounts
                {googleConnected && <span className="dropdown-badge">1</span>}
              </button>

              <div className="dropdown-divider" />

              <button className="dropdown-item dropdown-item-danger" onClick={logout}>
                <span className="dropdown-item-icon">🚪</span>
                Sign out
              </button>
            </>
          )}

          {view === "accounts" && (
            <>
              <div className="dropdown-back-header">
                <button className="dropdown-back" onClick={() => setView("menu")}>
                  ← Back
                </button>
                <span className="dropdown-back-title">Connected Accounts</span>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-accounts">
                <div className="dropdown-account-row">
                  <span className="dropdown-account-icon">🗓</span>
                  <div className="dropdown-account-info">
                    <span className="dropdown-account-name">Google Calendar</span>
                    <span className={`dropdown-account-status ${googleConnected ? "connected" : ""}`}>
                      {googleConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  {googleConnected ? (
                    <button
                      className="dropdown-account-btn disconnect"
                      onClick={handleGoogleDisconnect}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="dropdown-account-btn connect"
                      onClick={handleGoogleConnect}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  )
}