import { useState, useEffect } from "react"
import dayjs from "dayjs"
import DatePicker from "../DatePicker/DatePicker"
import TimePicker from "../TimePicker/TimePicker"
import "./ReminderPicker.css"

const QUICK_OPTIONS = [
  { label: "At event time", minutes: 0 },
  { label: "5 minutes before", minutes: 5 },
  { label: "10 minutes before", minutes: 10 },
  { label: "15 minutes before", minutes: 15 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 },
  { label: "Custom date & time", minutes: null },
]

const REPEAT_OPTIONS = [
  { label: "No repeat", value: null },
  { label: "Every 5 minutes", value: 5 },
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every hour", value: 60 },
]

export default function ReminderPicker({ value, eventDate, eventStartTime, onChange }) {
  const [mode, setMode] = useState("quick") // "quick" | "custom"
  const [selectedQuick, setSelectedQuick] = useState(null)
  const [repeatInterval, setRepeatInterval] = useState(null)
  const [customDate, setCustomDate] = useState("")
  const [customTime, setCustomTime] = useState("09:00")
  const [showRepeat, setShowRepeat] = useState(false)

  // Parse existing value on load
  useEffect(() => {
    if (value) {
      setMode("custom")
      const d = dayjs(value)
      setCustomDate(d.format("YYYY-MM-DD"))
      setCustomTime(d.format("HH:mm"))
    }
  }, [])

  function getEventDateTime() {
    if (eventDate && eventStartTime) {
      return dayjs(`${eventDate}T${eventStartTime}`)
    }
    return null
  }

  function handleQuickSelect(opt) {
    if (opt.minutes === null) {
      // Custom mode
      setMode("custom")
      setSelectedQuick(null)
      return
    }

    setSelectedQuick(opt.minutes)
    setMode("quick")

    const eventDT = getEventDateTime()
    if (eventDT) {
      const reminderTime = eventDT.subtract(opt.minutes, "minute")
      onChange(reminderTime.toISOString())
    } else {
      // No event time set yet — store offset as a signal
      onChange(`offset:${opt.minutes}`)
    }
  }

  function handleCustomDate(val) {
    setCustomDate(val)
    if (val && customTime) {
      onChange(dayjs(`${val}T${customTime}`).toISOString())
    }
  }

  function handleCustomTime(val) {
    setCustomTime(val)
    if (customDate && val) {
      onChange(dayjs(`${customDate}T${val}`).toISOString())
    }
  }

  function handleRepeat(val) {
    setRepeatInterval(val)
    // Pass repeat info up as a separate signal you can extend later
    // For now encode it in a custom format the backend can parse
  }

  function handleClear() {
    setSelectedQuick(null)
    setMode("quick")
    setCustomDate("")
    setCustomTime("09:00")
    setRepeatInterval(null)
    setShowRepeat(false)
    onChange("")
  }

  // Display string
  function getSummary() {
    if (!value) return null
    if (value.startsWith("offset:")) {
      const mins = parseInt(value.replace("offset:", ""))
      const opt = QUICK_OPTIONS.find(o => o.minutes === mins)
      return opt?.label || "Custom reminder"
    }
    return dayjs(value).format("MMM D [at] h:mm A")
  }

  const summary = getSummary()

  return (
    <div className="rp-wrapper">

      {/* QUICK OPTIONS */}
      <div className="rp-section-label">Notify me</div>
      <div className="rp-quick-list">
        {QUICK_OPTIONS.map(opt => {
          const isCustom = opt.minutes === null
          const isSelected = isCustom
            ? mode === "custom"
            : selectedQuick === opt.minutes

          return (
            <button
              key={opt.label}
              type="button"
              className={`rp-quick-btn ${isSelected ? "rp-quick-selected" : ""}`}
              onClick={() => handleQuickSelect(opt)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* CUSTOM DATE & TIME */}
      {mode === "custom" && (
        <div className="rp-custom">
          <div className="rp-custom-row">
            <span className="rp-custom-label">Date</span>
            <DatePicker value={customDate} onChange={handleCustomDate} />
          </div>
          <div className="rp-custom-divider" />
          <div className="rp-custom-row">
            <span className="rp-custom-label">Time</span>
            <TimePicker value={customTime} onChange={handleCustomTime} />
          </div>
        </div>
      )}

      {/* REPEAT REMINDER */}
      <div className="rp-repeat-toggle" onClick={() => setShowRepeat(o => !o)}>
        <span className="rp-repeat-label">
          {repeatInterval
            ? REPEAT_OPTIONS.find(r => r.value === repeatInterval)?.label
            : "Repeat reminder"}
        </span>
        <span className="rp-repeat-caret">{showRepeat ? "▴" : "▾"}</span>
      </div>

      {showRepeat && (
        <div className="rp-repeat-list">
          {REPEAT_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              className={`rp-quick-btn ${repeatInterval === opt.value ? "rp-quick-selected" : ""}`}
              onClick={() => { handleRepeat(opt.value); setShowRepeat(false) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* FOOTER */}
      {value && (
        <div className="rp-footer">
          <span className="rp-summary">
            {summary}
            {repeatInterval && ` · ${REPEAT_OPTIONS.find(r => r.value === repeatInterval)?.label.toLowerCase()}`}
          </span>
          <button type="button" className="rp-clear" onClick={handleClear}>Clear</button>
        </div>
      )}

    </div>
  )
}