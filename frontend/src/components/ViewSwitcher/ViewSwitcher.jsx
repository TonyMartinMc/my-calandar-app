export default function ViewSwitcher({ view, setView }) {
  return (
    <div className="view-switcher">
      {["month", "week", "day"].map(v => (
        <button
          key={v}
          className={`view-btn ${view === v ? "active" : ""}`}
          onClick={() => setView(v)}
        >
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  )
}