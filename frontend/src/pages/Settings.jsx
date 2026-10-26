import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { loadSettings, saveSettings, applyTheme, DEFAULT_SETTINGS } from "../hooks/useTheme"
import "./Settings.css"

const PRESET_COLORS = [
  { label: "Pink", value: "#F472B6" },
  { label: "Purple", value: "#A78BFA" },
  { label: "Blue", value: "#60A5FA" },
  { label: "Green", value: "#34D399" },
  { label: "Orange", value: "#FB923C" },
  { label: "Red", value: "#F87171" },
  { label: "Teal", value: "#2DD4BF" },
  { label: "Yellow", value: "#FBBF24" },
]

export default function Settings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(loadSettings())
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)

  function update(key, value) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    applyTheme(next)
  }

  function handleSave() {
    saveSettings(settings)
    applyTheme(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    if (!confirm("Reset all settings to defaults?")) return
    setSettings({ ...DEFAULT_SETTINGS })
    saveSettings({ ...DEFAULT_SETTINGS })
    applyTheme({ ...DEFAULT_SETTINGS })
  }

  function handleBgUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      update("bgImage", reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveBg() {
    update("bgImage", null)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="settings-title">Settings</h1>
        <button className="settings-save-btn" onClick={handleSave}>
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="settings-body">
        <div className="settings-card">

          {/* THEME */}
          <div className="settings-section">
            <div className="settings-section-title">Appearance</div>
            <div className="settings-section-desc">Choose how the app looks on your device</div>

            <div className="theme-options">
              {[
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "system", label: "System", icon: "💻" },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`theme-option ${settings.theme === opt.value ? "active" : ""}`}
                  onClick={() => update("theme", opt.value)}
                >
                  <span className="theme-option-icon">{opt.icon}</span>
                  <span className="theme-option-label">{opt.label}</span>
                  {settings.theme === opt.value && (
                    <span className="theme-option-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-divider" />

          {/* ACCENT COLOR */}
          <div className="settings-section">
            <div className="settings-section-title">Accent Color</div>
            <div className="settings-section-desc">Changes buttons, highlights, and event colors throughout the app</div>

            <div className="color-presets">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`color-preset ${settings.accentColor === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  onClick={() => update("accentColor", c.value)}
                  title={c.label}
                >
                  {settings.accentColor === c.value && (
                    <span className="color-check">✓</span>
                  )}
                </button>
              ))}

              {/* Custom color picker */}
              <div className="color-custom-wrap" title="Custom color">
                <input
                  type="color"
                  className="color-custom-input"
                  value={settings.accentColor}
                  onChange={e => update("accentColor", e.target.value)}
                />
                <span className="color-custom-label">Custom</span>
              </div>
            </div>

            <div className="color-preview-row">
              <div className="color-preview-swatch" style={{ background: settings.accentColor }} />
              <span className="color-preview-hex">{settings.accentColor}</span>
              <span className="color-preview-name">Current accent</span>
            </div>
          </div>

          <div className="settings-divider" />

          {/* BACKGROUND IMAGE */}
          <div className="settings-section">
            <div className="settings-section-title">Calendar Background</div>
            <div className="settings-section-desc">Add a background image to the calendar grid. It will show softly behind your events.</div>

            {settings.bgImage ? (
              <div className="bg-preview-wrap">
                <div
                  className="bg-preview"
                  style={{ backgroundImage: `url(${settings.bgImage})` }}
                >
                  <div className="bg-preview-overlay" />
                  <span className="bg-preview-label">Preview</span>
                </div>

                <div className="bg-opacity-row">
                  <label className="bg-opacity-label">Transparency</label>
                  <div className="bg-opacity-slider-wrap">
                    <span className="bg-opacity-hint">More visible</span>
                    <input
                      type="range"
                      min={0.05}
                      max={0.5}
                      step={0.01}
                      value={settings.bgOpacity}
                      onChange={e => update("bgOpacity", Number(e.target.value))}
                      className="bg-opacity-slider"
                    />
                    <span className="bg-opacity-hint">Less visible</span>
                  </div>
                </div>

                <div className="bg-actions">
                  <button className="bg-change-btn" onClick={() => fileInputRef.current?.click()}>
                    Change image
                  </button>
                  <button className="bg-remove-btn" onClick={handleRemoveBg}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="bg-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="bg-upload-icon">🖼️</span>
                <div className="bg-upload-text">
                  <span className="bg-upload-title">Choose a background image</span>
                  <span className="bg-upload-hint">JPG, PNG or WebP — shown softly behind your calendar</span>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleBgUpload}
            />
          </div>

          <div className="settings-divider" />

          {/* RESET */}
          <div className="settings-section">
            <div className="settings-section-title">Reset</div>
            <div className="settings-section-desc">Restore all appearance settings to their defaults</div>
            <button className="settings-reset-btn" onClick={handleReset}>
              Reset to defaults
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}