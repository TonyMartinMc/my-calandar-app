import { useEffect } from "react"

export const DEFAULT_SETTINGS = {
  theme: "light",
  accentColor: "#F472B6",
  bgImage: null,
  bgOpacity: 0.15,
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem("calendarSettings")
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

// Simple pub/sub so components react to settings changes
const listeners = new Set()

export function subscribeToSettings(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifySettingsChanged() {
  listeners.forEach(fn => fn())
}

export function saveSettings(settings) {
  localStorage.setItem("calendarSettings", JSON.stringify(settings))
  notifySettingsChanged()
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "244, 114, 182"
}

function darken(hex, amount = 40) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = Math.max(0, parseInt(result[1], 16) - amount)
  const g = Math.max(0, parseInt(result[2], 16) - amount)
  const b = Math.max(0, parseInt(result[3], 16) - amount)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function ultraLight(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "#FDF2F8"
  const r = Math.min(255, Math.round(parseInt(result[1], 16) * 0.08 + 247))
  const g = Math.min(255, Math.round(parseInt(result[2], 16) * 0.08 + 242))
  const b = Math.min(255, Math.round(parseInt(result[3], 16) * 0.08 + 248))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function midLight(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "#FBCFE8"
  const r = Math.min(255, Math.round(parseInt(result[1], 16) * 0.25 + 191))
  const g = Math.min(255, Math.round(parseInt(result[2], 16) * 0.25 + 180))
  const b = Math.min(255, Math.round(parseInt(result[3], 16) * 0.25 + 200))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export function applyTheme(settings) {
  const root = document.documentElement
  const { theme, accentColor, bgImage, bgOpacity } = settings

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = theme === "dark" || (theme === "system" && prefersDark)

  root.setAttribute("data-theme", isDark ? "dark" : "light")

  root.style.setProperty("--pink", accentColor)
  root.style.setProperty("--pink-dark", darken(accentColor, 40))
  root.style.setProperty("--pink-mid", midLight(accentColor))
  root.style.setProperty("--pink-light", ultraLight(accentColor))
  root.style.setProperty("--pink-rgb", hexToRgb(accentColor))

  if (bgImage) {
    root.style.setProperty("--cal-bg-image", `url(${bgImage})`)
    root.style.setProperty("--cal-bg-opacity", String(bgOpacity ?? 0.15))
  } else {
    root.style.setProperty("--cal-bg-image", "none")
    root.style.setProperty("--cal-bg-opacity", "0")
  }
}

// Apply immediately on import so theme is set before first paint
applyTheme(loadSettings())

export function useTheme() {
  useEffect(() => {
    applyTheme(loadSettings())

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const s = loadSettings()
      if (s.theme === "system") applyTheme(s)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
}