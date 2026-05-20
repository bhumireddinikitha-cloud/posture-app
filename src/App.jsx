import { useState, useEffect, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { stretches } from './stretches'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Circular progress ring component
function ProgressRing({ score, maxScore }) {
  const radius = 55
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / maxScore) * circumference

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="var(--bg-secondary)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke={score >= 80? "#4ade80" : score >= 50? "#facc15" : "#ef4444"}
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' + circumference}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s' }}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="22" fontWeight="700" fill="var(--text-primary)">
        {score}
      </text>
    </svg>
  )
}

function App() {
  // Core state
  const [postureInterval, setPostureInterval] = useState(30)
  const [eyeInterval, setEyeInterval] = useState(20)
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '17:00' })
  const [soundTheme, setSoundTheme] = useState('chime')
  const [smartPause, setSmartPause] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [customStretches, setCustomStretches] = useState([])

  // Timers
  const [postureTime, setPostureTime] = useState(postureInterval * 60)
  const [eyeTime, setEyeTime] = useState(eyeInterval * 60)
  const [isRunning, setIsRunning] = useState(false)

  // UI state
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [currentStretch, setCurrentStretch] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)

  // Stats
  const [stats, setStats] = useState({ completed: 0, skipped: 0, streak: 0 })
  const [weeklyData, setWeeklyData] = useState([])
  const [complianceScore, setComplianceScore] = useState(100)
  const [lastActiveDate, setLastActiveDate] = useState(new Date().toDateString())

  // Refs
  const postureRef = useRef(null)
  const eyeRef = useRef(null)
  const lastActiveRef = useRef(Date.now())
  const audioRef = useRef(null)

  // Daily tips - now with actionable stretches
  const tips = [
    "Keep monitor at arm's length and top at eye level",
    "Feet flat on floor, knees at 90 degrees",
    "20-20-20 Rule: Every 20 min, look 20 ft away for 20 sec",
    "Stand up and move every 30 minutes",
    "Blink often to prevent dry eyes",
    "Use a headset for long calls",
    "Keep wrists straight while typing",
    "Quick stretch: Roll shoulders back 5 times",
    "Quick stretch: Neck tilt left/right, hold 5 sec each"
  ]
  const [dailyTip] = useState(tips[Math.floor(Math.random() * tips.length)])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('postureApp')
    if (saved) {
      const data = JSON.parse(saved)
      setPostureInterval(data.postureInterval || 30)
      setEyeInterval(data.eyeInterval || 20)
      setWorkingHours(data.workingHours || { start: '09:00', end: '17:00' })
      setSoundTheme(data.soundTheme || 'chime')
      setSmartPause(data.smartPause!== false)
      setDarkMode(data.darkMode || false)
      setStats(data.stats || { completed: 0, skipped: 0, streak: 0 })
      setWeeklyData(data.weeklyData || [])
      setLastActiveDate(data.lastActiveDate || new Date().toDateString())
      setCustomStretches(data.customStretches || [])
    } else {
      setShowSetup(true)
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('postureApp', JSON.stringify({
      postureInterval, eyeInterval, workingHours, soundTheme, smartPause, darkMode,
      stats, weeklyData, lastActiveDate, customStretches
    }))
  }, [postureInterval, eyeInterval, workingHours, soundTheme, smartPause, darkMode, stats, weeklyData, lastActiveDate, customStretches])

  // Update timers when intervals change
  useEffect(() => {
    setPostureTime(postureInterval * 60)
  }, [postureInterval])

  useEffect(() => {
    setEyeTime(eyeInterval * 60)
  }, [eyeInterval])

  // Check working hours
  const isWorkingHours = () => {
    const now = new Date()
    const current = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = workingHours.start.split(':').map(Number)
    const [endH, endM] = workingHours.end.split(':').map(Number)
    const start = startH * 60 + startM
    const end = endH * 60 + endM
    return current >= start && current <= end
  }

  // Smart pause - detect AFK
  useEffect(() => {
    const handleActivity = () => lastActiveRef.current = Date.now()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [])

  // Main timer logic
  useEffect(() => {
    if (!isRunning ||!isWorkingHours()) return

    const checkAFK = () => {
      if (smartPause && Date.now() - lastActiveRef.current > 300000) return true // 5min
      return false
    }

    postureRef.current = setInterval(() => {
      if (checkAFK()) return
      setPostureTime(prev => {
        if (prev <= 1) {
          triggerBreak('posture')
          return postureInterval * 60
        }
        return prev - 1
      })
    }, 1000)

    eyeRef.current = setInterval(() => {
      if (checkAFK()) return
      setEyeTime(prev => {
        if (prev <= 1) {
          triggerBreak('eye')
          return eyeInterval * 60
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(postureRef.current)
      clearInterval(eyeRef.current)
    }
  }, [isRunning, postureInterval, eyeInterval, smartPause, workingHours])

  // Streak calculation
  useEffect(() => {
    const today = new Date().toDateString()
    if (lastActiveDate!== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (lastActiveDate === yesterday.toDateString() && stats.completed > 0) {
        setStats(s => ({...s, streak: s.streak + 1 }))
      } else if (stats.completed === 0) {
        setStats(s => ({...s, streak: 0 }))
      }
      setLastActiveDate(today)
      setStats(s => ({...s, completed: 0, skipped: 0 }))
    }
  }, [])

  // Compliance score
  useEffect(() => {
    const total = stats.completed + stats.skipped
    setComplianceScore(total === 0? 100 : Math.round((stats.completed / total) * 100))
  }, [stats])

  // Trigger break
  const triggerBreak = (type) => {
    playSound()
    showNotification(type)
    setShowBreakModal(true)
    setCurrentStretch(0)
    const allStretches = [...stretches,...customStretches]
    if (allStretches.length > 0) {
      speakText(allStretches[0].instruction)
    }
  }

  // Play sound
  const playSound = () => {
    const sounds = {
      chime: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      digital: 'https://assets.mixkit.co/active_storage/sfx/235/235-preview.mp3'
    }
    audioRef.current = new Audio(sounds[soundTheme])
    audioRef.current.play().catch(() => { })
  }

  // Voice
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  // Notifications
  const showNotification = (type) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Time for a ${type} break!`, {
        body: 'Click to start your stretch routine',
        icon: '/vite.svg'
      })
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
    setShowSetup(false)
    setIsRunning(true)
  }

  // Break actions
  const handleComplete = () => {
    const newStats = {...stats, completed: stats.completed + 1 }
    setStats(newStats)
    updateWeeklyData(newStats)
    nextStretch()
  }

  const handleSkip = () => {
    const newStats = {...stats, skipped: stats.skipped + 1 }
    setStats(newStats)
    updateWeeklyData(newStats)
    nextStretch()
  }

  const handleSnooze = () => {
    setShowBreakModal(false)
    setTimeout(() => setPostureTime(300), 100) // 5min snooze
  }

  const nextStretch = () => {
    const allStretches = [...stretches,...customStretches]
    if (currentStretch < 2) {
      const next = currentStretch + 1
      setCurrentStretch(next)
      speakText(allStretches[next]?.instruction || 'Next stretch')
    } else {
      setShowBreakModal(false)
    }
  }

  // Weekly data
  const updateWeeklyData = (newStats) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
    const existing = weeklyData.find(d => d.day === today)
    if (existing) {
      setWeeklyData(weeklyData.map(d =>
        d.day === today? {...d, completed: newStats.completed, skipped: newStats.skipped } : d
      ))
    } else {
      setWeeklyData([...weeklyData.slice(-6), {
        day: today,
        completed: newStats.completed,
        skipped: newStats.skipped
      }])
    }
  }

  // Export CSV
  const exportCSV = () => {
    const csv = [
      ['Date', 'Completed', 'Skipped', 'Score'],
      [new Date().toLocaleDateString(), stats.completed, stats.skipped, complianceScore],
     ...weeklyData.map(d => [d.day, d.completed, d.skipped, ''])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'posture-stats.csv'
    a.click()
  }

  // Add to calendar
  const addToCalendar = () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Posture Break Reminder
DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(Date.now() + 1800000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
RRULE:FREQ=DAILY;INTERVAL=1
DESCRIPTION:Time for your posture and eye break
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'posture-breaks.ics'
    a.click()
  }

  // Custom stretch
  const addCustomStretch = (e) => {
    e.preventDefault()
    const form = e.target
    const newStretch = {
      name: form.name.value,
      instruction: form.instruction.value,
      gif: form.gif.value || 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif'
    }
    setCustomStretches([...customStretches, newStretch])
    setShowCustomForm(false)
    form.reset()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const allStretches = [...stretches,...customStretches]

  // Chart data
  const chartData = {
    labels: weeklyData.map(d => d.day),
    datasets: [
      {
        label: 'Completed',
        data: weeklyData.map(d => d.completed),
        backgroundColor: '#10b981'
      },
      {
        label: 'Skipped',
        data: weeklyData.map(d => d.skipped),
        backgroundColor: '#ef4444'
      }
    ]
  }

  return (
    <div className={`app ${darkMode? 'dark' : 'light'}`}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, color: darkMode? '#f9fafb' : '#111827' }}>
          Posture & Break Reminder
        </h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="theme-toggle"
          aria-label="Toggle theme"
        >
          {darkMode? '☀️' : '🌙'}
        </button>
      </div>

      {/* Progress Ring replaces text score */}
      <div className="score">
        <ProgressRing score={complianceScore} maxScore={100} />
      </div>

      <div className="streak">
        {stats.streak > 0 && `🔥 ${stats.streak} day streak`}
        <span className="stats-inline">Completed: {stats.completed} | Skipped: {stats.skipped}</span>
      </div>

      <div className="tip">💡 Daily Tip: {dailyTip}</div>

      {!isWorkingHours() && (
        <div className="warning">Outside working hours: {workingHours.start} - {workingHours.end}</div>
      )}

      <button onClick={() => setShowSettings(!showSettings)} className="settings-btn">
        {showSettings? 'Hide Settings' : 'Show Settings'}
      </button>

      {showSettings && (
        <div className="settings">
          <div className="setting">
            <label>Posture Break (min)</label>
            <select value={postureInterval} onChange={(e) => setPostureInterval(Number(e.target.value))}>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={45}>45</option>
              <option value={60}>60</option>
            </select>
          </div>
          <div className="setting">
            <label>Eye Break (min)</label>
            <select value={eyeInterval} onChange={(e) => setEyeInterval(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </div>
          <div className="setting">
            <label>Working Hours</label>
            <div className="time-inputs">
              <input type="time" value={workingHours.start} onChange={(e) => setWorkingHours({...workingHours, start: e.target.value })} />
              <span>to</span>
              <input type="time" value={workingHours.end} onChange={(e) => setWorkingHours({...workingHours, end: e.target.value })} />
            </div>
          </div>
          <div className="setting">
            <label>Sound Theme</label>
            <select value={soundTheme} onChange={(e) => setSoundTheme(e.target.value)}>
              <option value="chime">Chime</option>
              <option value="bell">Bell</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div className="setting">
            <label>
              <input type="checkbox" checked={smartPause} onChange={(e) => setSmartPause(e.target.checked)} />
              Smart Pause if inactive 5min
            </label>
          </div>
        </div>
      )}

      <div className="timers">
        <div className="timer-card">
          <div className="timer-value">{formatTime(postureTime)}</div>
          <div className="timer-label">Next posture break</div>
        </div>
        <div className="timer-card">
          <div className="timer-value">{formatTime(eyeTime)}</div>
          <div className="timer-label">Next 20-20-20 eye break</div>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => setIsRunning(!isRunning)} className="btn-primary primary">
          {isRunning? 'Pause' : 'Start'}
        </button>
        <button onClick={() => setShowSetup(true)} className="btn-secondary">Setup Guide</button>
        <button onClick={() => setShowStats(!showStats)} className="btn-secondary">Weekly Stats</button>
        <button onClick={exportCSV} className="btn-secondary">Export CSV</button>
      </div>

      <div className="actions">
        <button onClick={addToCalendar} className="btn-orange">Add to Calendar</button>
        <button onClick={() => setShowCustomForm(true)} className="btn-orange">+ Custom Stretch</button>
      </div>

      {showStats && (
        <div className="chart-container">
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      )}

      {showBreakModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Break Time! Stretch {currentStretch + 1} of 3</h2>
            <img src={allStretches[currentStretch]?.gif} alt="stretch" className="stretch-gif" />
            <p className="instruction">{allStretches[currentStretch]?.instruction}</p>
            <div className="modal-actions">
              <button onClick={handleComplete} className="btn-success">Complete</button>
              <button onClick={handleSkip} className="btn-warning">Skip</button>
              <button onClick={handleSnooze} className="btn-secondary">Snooze 5min</button>
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Welcome to Posture & Break Reminder</h2>
            <p>We'll send notifications when it's time to stretch and rest your eyes.</p>
            <p>Enable notifications to get started:</p>
            <button onClick={requestNotificationPermission} className="btn-primary primary">
              Enable Notifications & Start
            </button>
          </div>
        </div>
      )}

      {showCustomForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Custom Stretch</h2>
            <form onSubmit={addCustomStretch}>
              <input name="name" placeholder="Stretch name" required />
              <textarea name="instruction" placeholder="Instructions" required rows="3" />
              <input name="gif" placeholder="GIF URL (optional)" />
              <div className="modal-actions">
                <button type="submit" className="btn-primary primary">Add Stretch</button>
                <button type="button" onClick={() => setShowCustomForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default App