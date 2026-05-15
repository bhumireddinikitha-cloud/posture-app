export const stretches = [
  {
    id: 1,
    name: "Neck Rolls",
    category: "Neck",
    gif: "https://media.giphy.com/media/3o6ZsVGl3vY9DJtjO8/giphy.gif",
    duration: 30,
    instruction: "Slowly roll your head in a circle. 5 times each direction."
  },
  {
    id: 2, 
    name: "Shoulder Shrugs",
    category: "Shoulders",
    gif: "https://media.giphy.com/media/l0HlQXlQ3nHyLMvte/giphy.gif",
    duration: 30,
    instruction: "Lift shoulders to ears, hold 3 sec, release. Repeat 10x."
  },
  {
    id: 3,
    name: "Wrist Stretches", 
    category: "Wrists",
    gif: "https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif",
    duration: 30,
    instruction: "Extend arm, pull fingers back gently. 15 sec each hand."
  },
  {
    id: 4,
    name: "Seated Spinal Twist",
    category: "Lower Back", 
    gif: "https://media.giphy.com/media/xT9IgG50Fb7Mi0udBC/giphy.gif",
    duration: 30,
    instruction: "Twist torso, hold chair back. 15 sec each side."
  },
  {
    id: 5,
    name: "Chin Tucks",
    category: "Neck",
    gif: "https://media.giphy.com/media/3o6ZsUJ44ffpnAW7Dy/giphy.gif", 
    duration: 30,
    instruction: "Pull chin straight back, like making a double chin. Hold 5 sec."
  }
]

export const getRandomRoutine = () => {
  const shuffled = [...stretches].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3) // #10 Randomized Routines - pick 3
}