import { useState, useEffect } from "react"
import dayjs from "dayjs"
import {
  fetchGoogleStatus,
  getGoogleAuthUrl,
  syncGoogleNow,
  disconnectGoogle,
} from "../../api/events"
import "./Sidebar.css"

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

export default function Sidebar({
  isOpen, onNewEvent, categories, checkedIds,
  toggleCategory, toggleSubcategory,
  createCategory, deleteCategory,
  currentDate, onDateClick,
}) {
  const today = dayjs()
  const startOfMonth = currentDate.startOf("month")
  const startOfGrid = startOfMonth.startOf("week")
  const miniDays = Array.from({ length: 35 }, (_, i) => startOfGrid.add(i, "day"))

  const [expandedCats, setExpandedCats] = useState(new Set())
  const [addingCat, setAddingCat] = useState(false)
  const [addingSubOf, setAddingSubOf] = useState(null)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#F472B6")
  const [googleConnected, setGoogleConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchGoogleStatus()
      .then(data => setGoogleConnected(data.connected))
      .catch(() => {})

    if (window.location.search.includes("google=connected")) {
      setGoogleConnected(true)
      window.history.replaceState({}, "", "/")
    }
  }, [])

  async function handleGoogleConnect() {
    try {
      const url = await getGoogleAuthUrl()
      window.location.href = url
    } catch (err) {
      console.error("Failed to get Google auth URL:", err)
    }
  }

  async function handleGoogleSync() {
    setSyncing(true)
    try {
      await syncGoogleNow()
      window.location.reload()
    } catch (err) {
      console.error("Sync failed:", err)
    } finally {
      setSyncing(false)
    }
  }

  async function handleGoogleDisconnect() {
    if (confirm("Disconnect Google Calendar? Events imported from Google will remain.")) {
      try {
        await disconnectGoogle()
        setGoogleConnected(false)
      } catch (err) {
        console.error("Disconnect failed:", err)
      }
    }
  }

  function toggleExpand(id) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function resetForm() {
    setNewName("")
    setNewColor("#F472B6")
    setAddingCat(false)
    setAddingSubOf(null)
  }

  async function handleAddCategory(parentId = null) {
    const trimmed = newName.trim()
    if (!trimmed) return
    try {
      await createCategory({ name: trimmed, color: newColor, parent: parentId || null })
      resetForm()
    } catch (err) {
      console.error("Failed to create category:", err.response?.data || err.message)
    }
  }

  async function handleDeleteCategory(id, name) {
    if (!confirm(`Delete "${name}"? All events under this category will also be deleted.`)) return
    try {
      await deleteCategory(id)
    } catch (err) {
      console.error("Failed to delete category:", err.response?.data || err.message)
    }
  }

  function isCatChecked(cat) {
    return checkedIds.has(cat.id)
  }

  function isCatIndeterminate(cat) {
    if (!cat.subcategories?.length) return false
    const subs = cat.subcategories
    const someChecked = subs.some(s => checkedIds.has(s.id))
    const allChecked = subs.every(s => checkedIds.has(s.id))
    return someChecked && !allChecked
  }

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <button className="new-event-btn" onClick={onNewEvent}>
        <span className="plus-icon">+</span> New Event
      </button>

      {/* MINI CALENDAR */}
      <div className="mini-cal">
        <div className="mini-cal-header">{currentDate.format("MMMM YYYY")}</div>
        <div className="mini-day-headers">
          {DAYS_SHORT.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mini-grid">
          {miniDays.map((day, i) => {
            const isToday = day.isSame(today, "day")
            const isSelected = day.isSame(currentDate, "day")
            const isCurrentMonth = day.month() === currentDate.month()
            return (
              <button
                key={i}
                className={`mini-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${!isCurrentMonth ? "other-month" : ""}`}
                onClick={() => onDateClick(day)}
              >
                {day.date()}
              </button>
            )
          })}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="sidebar-categories">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">Categories</span>
          <button
            className="add-cat-btn"
            onClick={() => {
              setAddingCat(true)
              setAddingSubOf(null)
              setNewName("")
              setNewColor("#F472B6")
            }}
            title="Add category"
          >+</button>
        </div>

        {addingCat && (
          <div className="new-cat-form">
            <input
              className="cat-input"
              placeholder="Category name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              autoFocus
            />
            <div className="cat-color-picker-row">
              <input
                type="color"
                className="cat-color-wheel"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
              />
              <div className="cat-color-preview" style={{ background: newColor }}>
                <span className="cat-color-hex">{newColor}</span>
              </div>
            </div>
            <div className="cat-form-actions">
              <button className="cat-cancel" onClick={resetForm}>Cancel</button>
              <button
                className="cat-save"
                style={{ background: newColor }}
                onClick={() => handleAddCategory()}
              >Add</button>
            </div>
          </div>
        )}

        {categories.map(cat => {
          const hasSubs = cat.subcategories?.length > 0
          const isExpanded = expandedCats.has(cat.id)
          const checked = isCatChecked(cat)
          const indeterminate = isCatIndeterminate(cat)

          return (
            <div key={cat.id} className="cat-group">
              <div className="cat-row">
                <button
                  className="cat-expand-btn"
                  onClick={() => hasSubs && toggleExpand(cat.id)}
                  style={{ opacity: hasSubs ? 1 : 0, cursor: hasSubs ? "pointer" : "default" }}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
                <input
                  type="checkbox"
                  className="cat-checkbox"
                  checked={checked}
                  ref={el => { if (el) el.indeterminate = indeterminate }}
                  onChange={() => toggleCategory(cat)}
                />
                <span className="cat-dot" style={{ background: cat.color }} />
                <span className="cat-name">{cat.name}</span>
                <div className="cat-actions">
                  <button
                    className="add-sub-btn"
                    onClick={() => {
                      setAddingSubOf(cat.id)
                      setAddingCat(false)
                      setNewName("")
                      setNewColor(cat.color)
                    }}
                    title="Add subcategory"
                  >+</button>
                  <button
                    className="delete-cat-btn"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    title="Delete category"
                  >✕</button>
                </div>
              </div>

              {addingSubOf === cat.id && (
                <div className="new-cat-form sub-form">
                  <input
                    className="cat-input"
                    placeholder="Subcategory name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddCategory(cat.id)}
                    autoFocus
                  />
                  <div className="cat-color-picker-row">
                    <input
                      type="color"
                      className="cat-color-wheel"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                    />
                    <div className="cat-color-preview" style={{ background: newColor }}>
                      <span className="cat-color-hex">{newColor}</span>
                    </div>
                  </div>
                  <div className="cat-form-actions">
                    <button className="cat-cancel" onClick={resetForm}>Cancel</button>
                    <button
                      className="cat-save"
                      style={{ background: newColor }}
                      onClick={() => handleAddCategory(cat.id)}
                    >Add</button>
                  </div>
                </div>
              )}

              {isExpanded && hasSubs && (
                <div className="subcats">
                  {cat.subcategories.map(sub => (
                    <div key={sub.id} className="cat-row sub-row">
                      <input
                        type="checkbox"
                        className="cat-checkbox"
                        checked={checkedIds.has(sub.id)}
                        onChange={() => toggleSubcategory(sub, cat)}
                      />
                      <span className="cat-dot" style={{ background: sub.color }} />
                      <span className="cat-name">{sub.name}</span>
                      <button
                        className="delete-cat-btn"
                        onClick={() => handleDeleteCategory(sub.id, sub.name)}
                        title="Delete subcategory"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* GOOGLE CALENDAR */}
      <div className="sidebar-google">
        <div className="sidebar-section-title">Google Calendar</div>
        {googleConnected ? (
          <div className="google-connected">
            <span className="google-dot" />
            <span className="google-label">Connected</span>
            <button className="google-sync-btn" onClick={handleGoogleSync}>
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <button className="google-disconnect-btn" onClick={handleGoogleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="google-connect-btn" onClick={handleGoogleConnect}>
            <span>🗓</span> Connect Google Calendar
          </button>
        )}
      </div>

    </aside>
  )
}