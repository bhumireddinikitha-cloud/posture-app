import { useState, useEffect, useRef } from 'react'
import { stretches, getRandomRoutine } from './stretches'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function App() {
  // #1 Customizable Intervals
  const [postureInterval, setPostureInterval] = useState(() =>
    localStorage.getItem('postureInterval') || '30'
  )
  const [eyeInterval, setEyeInterval] = useState(() =>
    localStorage.getItem('eyeInterval') || '20'
  )

  // #2 Working Hours
  const [startTime, setStartTime] = useState(() => localStorage.getItem('startTime') || '09:00')
  const [endTime, setEndTime] = useState(() => localStorage.getItem('endTime') || '17:00')
  const [isWithinHours, setIsWithinHours] = useState(true)

  // #3 Dark Mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode')!== 'false')

  // #12 Sound Themes
  const [soundTheme, setSoundTheme] = useState(() => localStorage.getItem('soundTheme') || 'chime')

  // Timers
  const [postureTime, setPostureTime] = useState(parseInt(postureInterval) * 60)
  const [eyeTime, setEyeTime] = useState(parseInt(eyeInterval) * 60)
  const [isRunning, setIsRunning] = useState(false)

  // #14, #15 Compliance Tracking
  const [completed, setCompleted] = useState(() =>
    parseInt(localStorage.getItem('completed') || '0')
  )
  const [skipped, setSkipped] = useState(() =>
    parseInt(localStorage.getItem('skipped') || '0')
  )
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('streak') || '0'))

  // #17 Weekly Stats
  const [weeklyData, setWeeklyData] = useState(() => {
    const saved = localStorage.getItem('weeklyData')
    return saved? JSON.parse(saved) : { labels: [], completed: [], skipped: [] }
  })

  // #5 Snooze
  const [isSnoozed, setIsSnoozed] = useState(false)
  const [snoozeTimeLeft, setSnoozeTimeLeft] = useState(0)

  // #7 Stretch Modal State
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [currentRoutine, setCurrentRoutine] = useState([])
  const [currentStretchIndex, setCurrentStretchIndex] = useState(0)
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // #18 Setup Guide
  const [showSetup, setShowSetup] = useState(() =>!localStorage.getItem('hasSetup'))

  // #13 Daily Posture Tip
  const tips = [
    "Squeeze shoulder blades together every hour",
    "Keep screen at arm's length away",
    "Feet flat on floor, knees at 90 degrees",
    "Top of monitor at eye level",
    "Take a deep breath and roll shoulders back",
    "Sit back in chair so back is supported",
    "Elbows bent at 90 degrees when typing",
    "Avoid phone between ear and shoulder",
    "Stand up and reach for ceiling every hour",
    "Check: ears over shoulders over hips"
  ]
  const [dailyTip] = useState(() => {
    const today = new Date().getDate()
    return tips[today % tips.length]
  })

  // #4 Pause on Screen Lock
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRunning) setIsRunning(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isRunning])

  // #2 Working Hours Check
  useEffect(() => {
    const checkHours = () => {
      const now = new Date()
      const current = now.getHours() * 60 + now.getMinutes()
      const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
      const within = current >= start && current <= end
      setIsWithinHours(within)
      if (!within && isRunning) setIsRunning(false)
    }
    checkHours()
    const interval = setInterval(checkHours, 60000)
    return () => clearInterval(interval)
  }, [startTime, endTime, isRunning])

  // Save settings
  useEffect(() => {
    localStorage.setItem('postureInterval', postureInterval)
    setPostureTime(parseInt(postureInterval) * 60)
  }, [postureInterval])

  useEffect(() => {
    localStorage.setItem('eyeInterval', eyeInterval)
    setEyeTime(parseInt(eyeInterval) * 60)
  }, [eyeInterval])

  useEffect(() => localStorage.setItem('startTime', startTime), [startTime])
  useEffect(() => localStorage.setItem('endTime', endTime), [endTime])
  useEffect(() => localStorage.setItem('darkMode', darkMode), [darkMode])
  useEffect(() => localStorage.setItem('soundTheme', soundTheme), [soundTheme])
  useEffect(() => document.body.className = darkMode? 'dark' : 'light', [darkMode])

  // #16 Streak + #17 Daily Reset
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
    const lastDate = localStorage.getItem('lastDate')
    if (lastDate && lastDate!== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-US', { weekday: 'short' })

      // Update streak
      if (completed > skipped && completed > 0) {
        setStreak(prev => {
          const newStreak = prev + 1
          localStorage.setItem('streak', newStreak)
          return newStreak
        })
      } else if (lastDate === yesterdayStr) {
        setStreak(0)
        localStorage.setItem('streak', 0)
      }

      // Update weekly chart
      setWeeklyData(prev => {
        const newData = {...prev }
        if (newData.labels.length >= 7) {
          newData.labels.shift()
          newData.completed.shift()
          newData.skipped.shift()
        }
        newData.labels.push(lastDate)
        newData.completed.push(completed)
        newData.skipped.push(skipped)
        localStorage.setItem('weeklyData', JSON.stringify(newData))
        return newData
      })

      setCompleted(0)
      setSkipped(0)
      localStorage.setItem('completed', '0')
      localStorage.setItem('skipped', '0')
    }
    if (!lastDate) localStorage.setItem('lastDate', today)
  }, [])

  // Main timer logic
  useEffect(() => {
    let interval
    if (isRunning &&!isSnoozed &&!showBreakModal && isWithinHours) {
      interval = setInterval(() => {
        setPostureTime(prev => {
          if (prev <= 1) {
            triggerBreak()
            return parseInt(postureInterval) * 60
          }
          return prev - 1
        })
        setEyeTime(prev => {
          if (prev <= 1) {
            notifyUser('Eye Break!', 'Look 20 feet away for 20 seconds')
            playSound()
            return parseInt(eyeInterval) * 60
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, isSnoozed, showBreakModal, postureInterval, eyeInterval, isWithinHours])

  // Snooze countdown
  useEffect(() => {
    let interval
    if (isSnoozed && snoozeTimeLeft > 0) {
      interval = setInterval(() => {
        setSnoozeTimeLeft(prev => {
          if (prev <= 1) {
            setIsSnoozed(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSnoozed, snoozeTimeLeft])

  const playSound = () => {
    const audio = new Audio()
    if (soundTheme === 'chime') audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3'
    else if (soundTheme === 'bell') audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3'
    else audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3'
    audio.play().catch(() => {})
  }

  const notifyUser = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/vite.svg' })
    }
  }

  const requestNotification = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        playSound()
        new Notification('Notifications enabled!', {
          body: 'We\'ll remind you to stretch and rest your eyes',
          icon: '/vite.svg'
        })
      }
    })
  }

  const triggerBreak = () => {
    setCurrentRoutine(getRandomRoutine())
    setCurrentStretchIndex(0)
    setShowBreakModal(true)
    playSound()
    notifyUser('Posture Break!', 'Time for your 3-stretch routine')
  }

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    if (showBreakModal && currentRoutine.length > 0) {
      speak(`Stretch ${currentStretchIndex + 1}. ${currentRoutine[currentStretchIndex].instruction}`)
    }
  }, [showBreakModal, currentStretchIndex, currentRoutine])

  const handleComplete = () => {
    const newCompleted = completed + 1
    setCompleted(newCompleted)
    localStorage.setItem('completed', newCompleted)
    setShowBreakModal(false)
    window.speechSynthesis.cancel()
  }

  const handleSkip = () => {
    const newSkipped = skipped + 1
    setSkipped(newSkipped)
    localStorage.setItem('skipped', newSkipped)
    setShowBreakModal(false)
    window.speechSynthesis.cancel()
  }

  const nextStretch = () => {
    if (currentStretchIndex < currentRoutine.length - 1) {
      setCurrentStretchIndex(currentStretchIndex + 1)
    } else {
      handleComplete()
    }
  }

  const handleSnooze = () => {
    setIsSnoozed(true)
    setSnoozeTimeLeft(5 * 60)
    setShowBreakModal(false)
    window.speechSynthesis.cancel()
  }

  // #11 Export CSV
  const exportCSV = () => {
    let csv = 'Day,Completed,Skipped\n'
    weeklyData.labels.forEach((day, i) => {
      csv += `${day},${weeklyData.completed[i]},${weeklyData.skipped[i]}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'posture-stats.csv'
    a.click()
  }

  const completeSetup = () => {
    setShowSetup(false)
    localStorage.setItem('hasSetup', 'true')
    requestNotification()
  }

  const total = completed + skipped
  const dailyScore = total === 0? 100 : Math.round((completed / total) * 100)

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const chartData = {
    labels: weeklyData.labels,
    datasets: [
      { label: 'Completed', data: weeklyData.completed, backgroundColor: '#4CAF50' },
      { label: 'Skipped', data: weeklyData.skipped, backgroundColor: '#f44336' },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: darkMode? '#fff' : '#000' } },
      title: { display: true, text: 'Weekly Progress', color: darkMode? '#fff' : '#000' },
    },
    scales: {
      y: { ticks: { color: darkMode? '#fff' : '#000' }, grid: { color: darkMode? '#333' : '#ddd' } },
      x: { ticks: { color: darkMode? '#fff' : '#000' }, grid: { color: darkMode? '#333' : '#ddd' } }
    }
  }

  return (
    <div className={`app ${darkMode? 'dark' : 'light'}`}>
      <div className="header">
        <h1>Posture & Break Reminder</h1>
        <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
          {darkMode? '☀️' : '🌙'}
        </button>
      </div>

      <div className="score">Daily Score: {dailyScore}/100 {streak > 0 && `🔥 ${streak} day streak`}</div>
      <div className="stats">Completed: {completed} | Skipped: {skipped}</div>
      {!isWithinHours && <div className="out-of-hours">Outside working hours: {startTime} - {endTime}</div>}
      <div className="tip">💡 Daily Tip: {dailyTip}</div>

      <button onClick={() => setShowSettings(!showSettings)} className="settings-toggle">
        {showSettings? 'Hide Settings' : 'Show Settings'}
      </button>

      {showSettings && (
        <div className="settings">
          <label>Posture Break:
            <select value={postureInterval} onChange={e => setPostureInterval(e.target.value)} disabled={isRunning}>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
          <label>Eye Break:
            <select value={eyeInterval} onChange={e => setEyeInterval(e.target.value)} disabled={isRunning}>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
            </select>
          </label>
          <label>Start:
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isRunning} />
          </label>
          <label>End:
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isRunning} />
          </label>
          <label>Sound:
            <select value={soundTheme} onChange={e => setSoundTheme(e.target.value)}>
              <option value="chime">Chime</option>
              <option value="bell">Bell</option>
              <option value="beep">Beep</option>
            </select>
          </label>
        </div>
      )}

      <div className="timers">
        <div className="timer">
          <div className="time">{formatTime(postureTime)}</div>
          <p>Next posture break</p>
        </div>
        <div className="timer">
          <div className="time">{formatTime(eyeTime)}</div>
          <p>Next 20-20-20 eye break</p>
        </div>
      </div>

      {isSnoozed && <div className="snoozed">Snoozed for {formatTime(snoozeTimeLeft)}...</div>}

      <div className="controls">
        <button onClick={() => setIsRunning(!isRunning)} className="start" disabled={!isWithinHours}>
          {isRunning? 'Pause' : 'Start'}
        </button>
        <button onClick={() => setShowSetup(true)} className="setup">Setup Guide</button>
        <button onClick={() => setShowStats(!showStats)} className="stats-btn">Weekly Stats</button>
        <button onClick={exportCSV} className="export-btn">Export CSV</button>
      </div>

      {showStats && (
        <div className="chart-container">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {showSetup && (
        <div className="break-modal">
          <div className="break-content">
            <h2>Welcome! Let's set up</h2>
            <p>1. Allow notifications so we can remind you</p>
            <p>2. Set your working hours in Settings</p>
            <p>3. Choose how often you want breaks</p>
            <p>4. Click Start when ready</p>
            <button onClick={completeSetup} className="next-btn">Enable Notifications & Start</button>
          </div>
        </div>
      )}

      {showBreakModal && currentRoutine.length > 0 && (
        <div className="break-modal">
          <div className="break-content">
            <h2>Break Time! {currentStretchIndex + 1}/3</h2>
            <h3>{currentRoutine[currentStretchIndex].name}</h3>
            <span className="category">{currentRoutine[currentStretchIndex].category}</span>
            <img src={currentRoutine[currentStretchIndex].gif} alt="Stretch demo" className="stretch-gif" />
            <p className="instruction">{currentRoutine[currentStretchIndex].instruction}</p>
            <p className="duration">Hold for {currentRoutine[currentStretchIndex].duration}s</p>
            <div className="break-controls">
              <button onClick={nextStretch} className="next-btn">
                {currentStretchIndex < 2? 'Next Stretch →' : 'Done ✓'}
              </button>
              <button onClick={handleSnooze} className="snooze-btn">Snooze 5min</button>
              <button onClick={handleSkip} className="skip-btn">Skip ✗</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App