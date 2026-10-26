import { useState, useEffect } from "react"
import CalendarGrid from "./components/CalendarGrid/CalendarGrid"
import EventModal from "./components/EventModal/EventModal"
import ViewSwitcher from "./components/ViewSwitcher/ViewSwitcher"
import Sidebar from "./components/Sidebar/Sidebar"
import AccountMenu from "./components/AccountMenu/AccountMenu"
import { useEvents } from "./hooks/useEvents"
import { useTheme, loadSettings, subscribeToSettings } from "./hooks/useTheme"
import dayjs from "dayjs"
import "./App.css"

export default function App() {
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [view, setView] = useState("month")
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settings, setSettings] = useState(loadSettings())

  useTheme()

  // Re-read settings whenever they change from Settings page
  useEffect(() => {
    const unsub = subscribeToSettings(() => setSettings(loadSettings()))
    return unsub
  }, [])

  const {
    events, categories, checkedIds,
    toggleCategory, toggleSubcategory,
    createEvent, updateEvent, deleteEvent,
    createCategory, deleteCategory,
  } = useEvents(currentDate, view)

  function handleDayClick(date) {
    setSelectedDate(date)
    setSelectedEvent(null)
    setShowModal(true)
  }

  function handleEventClick(event) {
    setSelectedEvent(event)
    setShowModal(true)
  }

  function handleModalClose() {
    setShowModal(false)
    setSelectedEvent(null)
    setSelectedDate(null)
  }

  function handleNewEvent() {
    setSelectedDate(dayjs())
    setSelectedEvent(null)
    setShowModal(true)
  }

  function handlePrev() {
    setCurrentDate(prev =>
      prev.subtract(1, view === "day" ? "day" : view === "week" ? "week" : "month")
    )
  }

  function handleNext() {
    setCurrentDate(prev =>
      prev.add(1, view === "day" ? "day" : view === "week" ? "week" : "month")
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
            <span className={`hamburger-icon ${sidebarOpen ? "open" : ""}`}>
              <span /><span /><span />
            </span>
          </button>
          <h1 className="app-title">My Calendar</h1>
          <button className="today-btn" onClick={() => setCurrentDate(dayjs())}>Today</button>
          <div className="nav-arrows">
            <button onClick={handlePrev}>‹</button>
            <button onClick={handleNext}>›</button>
          </div>
          <span className="current-label">
            {view === "month" && currentDate.format("MMMM YYYY")}
            {view === "week" && `Week of ${currentDate.startOf("week").format("MMM D, YYYY")}`}
            {view === "day" && currentDate.format("dddd, MMMM D YYYY")}
          </span>
        </div>
        <div className="header-right">
          <ViewSwitcher view={view} setView={setView} />
          <AccountMenu />
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          isOpen={sidebarOpen}
          onNewEvent={handleNewEvent}
          categories={categories}
          checkedIds={checkedIds}
          toggleCategory={toggleCategory}
          toggleSubcategory={toggleSubcategory}
          createCategory={createCategory}
          deleteCategory={deleteCategory}
          currentDate={currentDate}
          onDateClick={(date) => setCurrentDate(date)}
        />

        {/* CALENDAR WRAPPER with live background image */}
        <div
          className="calendar-wrapper"
          style={settings.bgImage ? {
            backgroundImage: `url(${settings.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}}
        >
          {settings.bgImage && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--white)",
                opacity: 1 - settings.bgOpacity,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {showModal && (
        <EventModal
          event={selectedEvent}
          selectedDate={selectedDate}
          categories={categories}
          onClose={handleModalClose}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
        />
      )}
    </div>
  )
}