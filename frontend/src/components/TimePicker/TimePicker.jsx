import { useState, useEffect, useRef } from "react"
import "./TimePicker.css"

export default function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)

  function parseTime(val) {
    if (!val) return [12, 0, "AM"]
    const [h, m] = val.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour = h % 12 === 0 ? 12 : h % 12
    return [hour, m, period]
  }

  const [parsedHour, parsedMinute, parsedPeriod] = parseTime(value)
  const [hour, setHour] = useState(parsedHour)
  const [minute, setMinute] = useState(parsedMinute)
  const [period, setPeriod] = useState(parsedPeriod)
  const [hourText, setHourText] = useState(String(parsedHour))
  const [minuteText, setMinuteText] = useState(String(parsedMinute).padStart(2, "0"))

  const hourScrollRef = useRef(null)
  const minuteScrollRef = useRef(null)

  useEffect(() => {
    const [h, m, p] = parseTime(value)
    setHour(h)
    setMinute(m)
    setPeriod(p)
    setHourText(String(h))
    setMinuteText(String(m).padStart(2, "0"))
  }, [value])

  // Scroll selected item into view when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        hourScrollRef.current?.querySelector(".tp-selected")?.scrollIntoView({ block: "center" })
        minuteScrollRef.current?.querySelector(".tp-selected")?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [open])

  function toHHMM(h, m, p) {
    let hour24 = h % 12
    if (p === "PM") hour24 += 12
    return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  function handleHourClick(h) {
    setHour(h)
    setHourText(String(h))
    onChange(toHHMM(h, minute, period))
  }

  function handleMinuteClick(m) {
    setMinute(m)
    setMinuteText(String(m).padStart(2, "0"))
    onChange(toHHMM(hour, m, period))
  }

  function handlePeriod(p) {
    setPeriod(p)
    onChange(toHHMM(hour, minute, p))
  }

  // Typing in the hour scroll column
  function handleHourType(e, h) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setHourText(raw)
    const num = parseInt(raw)
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setHour(num)
      onChange(toHHMM(num, minute, period))
    }
  }

  function handleHourBlur() {
    const num = parseInt(hourText)
    const clamped = isNaN(num) ? 12 : Math.min(12, Math.max(1, num))
    setHour(clamped)
    setHourText(String(clamped))
    onChange(toHHMM(clamped, minute, period))
  }

  // Typing in the minute scroll column
  function handleMinuteType(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setMinuteText(raw)
    const num = parseInt(raw)
    if (!isNaN(num) && num >= 0 && num <= 59) {
      setMinute(num)
      onChange(toHHMM(hour, num, period))
    }
  }

  function handleMinuteBlur() {
    const num = parseInt(minuteText)
    const clamped = isNaN(num) ? 0 : Math.min(59, Math.max(0, num))
    setMinute(clamped)
    setMinuteText(String(clamped).padStart(2, "0"))
    onChange(toHHMM(hour, clamped, period))
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  // Full 0-59 minutes for the scroll list
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const displayValue = value
    ? `${hour}:${String(minute).padStart(2, "0")} ${period}`
    : "Pick a time"

  return (
    <div className="timepicker-wrapper">
      <button
        type="button"
        className="timepicker-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span className="timepicker-value">{displayValue}</span>
        <span className="timepicker-caret">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="timepicker-popover">
          <div className="tp-columns">

            {/* HOURS */}
            <div className="tp-column">
              <div className="tp-column-label">Hour</div>
              <div className="tp-scroll" ref={hourScrollRef}>
                {hours.map(h => (
                  <div
                    key={h}
                    className={`tp-item ${hour === h ? "tp-selected" : ""}`}
                    onClick={() => handleHourClick(h)}
                  >
                    {hour === h ? (
                      <input
                        className={`tp-item-input tp-selected`}
                        value={hourText}
                        onChange={handleHourType}
                        onBlur={handleHourBlur}
                        onClick={e => e.stopPropagation()}
                        maxLength={2}
                      />
                    ) : h}
                  </div>
                ))}
              </div>
            </div>

            <div className="tp-col-divider" />

            {/* MINUTES — full 0-59 */}
            <div className="tp-column">
              <div className="tp-column-label">Min</div>
              <div className="tp-scroll" ref={minuteScrollRef}>
                {minutes.map(m => (
                  <div
                    key={m}
                    className={`tp-item ${minute === m ? "tp-selected" : ""}`}
                    onClick={() => handleMinuteClick(m)}
                  >
                    {minute === m ? (
                      <input
                        className={`tp-item-input tp-selected`}
                        value={minuteText}
                        onChange={handleMinuteType}
                        onBlur={handleMinuteBlur}
                        onClick={e => e.stopPropagation()}
                        maxLength={2}
                      />
                    ) : String(m).padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>

            <div className="tp-col-divider" />

            {/* AM/PM */}
            <div className="tp-column tp-period-col">
              <div className="tp-column-label"> </div>
              <div className="tp-period">
                {["AM", "PM"].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`tp-period-btn ${period === p ? "tp-selected" : ""}`}
                    onClick={() => handlePeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="tp-footer">
            <div className="tp-preview">
              {hour}:{String(minute).padStart(2, "0")} {period}
            </div>
            <button
              type="button"
              className="tp-done"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}