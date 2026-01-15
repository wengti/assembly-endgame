import { useState, useMemo, useEffect } from "react"
import { clsx } from "clsx"
import { languages } from "./languages"
import { getFarewellText, getRandomWord } from "./utils"
import { useReward } from 'react-rewards'

export default function AssemblyEndgame() {

  const timeLimit = 90*1000
  const hintPenalty = timeLimit * 1/3

  // State values
  const [currentWord, setCurrentWord] = useState(() => getRandomWord()) //() => getRandomWord()
  const [guessedLetters, setGuessedLetters] = useState([])
  const [isHintAllowed, setIsHintAllowed] = useState(false)
  const [isHintUsed, setIsHintUsed] = useState(false)
  const [timer, setTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  // Static values
  const alphabet = "abcdefghijklmnopqrstuvwxyz"

  const { reward: lossConfetti, isAnimating: isLossConfettiAnimating } = useReward(
    "confetti-section", "emoji", { angle: 270, emoji: ['🗑️', '💀', '👎', '😠', '😞'], startVelocity: 15, spread: 180 })
  const { reward: winConfetti, isAnimating: isWinConfettiAnimating } = useReward(
    "confetti-section", "confetti", { angle: 270, startVelocity: 15, spread: 180 })

  // Derived values
  const trueTimeLeft = timeLeft - (isHintUsed > 0 ? hintPenalty : 0) // Take into account whether the hint is used
  const timeLeftMin = String(trueTimeLeft < 0 ? 0 : Math.floor((trueTimeLeft / (60 * 1000)))).padStart(2, "0")
  const timeLeftSec = String(trueTimeLeft < 0 ? 0 : Math.floor((trueTimeLeft % (60 * 1000)) / 1000)).padStart(2, "0")


  const numGuessesLeft = languages.length - 1
  const wrongGuessCount =
    guessedLetters.filter(letter => !currentWord.includes(letter)).length
  const isGameLost = (wrongGuessCount >= numGuessesLeft) || (trueTimeLeft < 0)
  const isGameWon =
    (currentWord.split("").every(letter => guessedLetters.includes(letter))) && !isGameLost
  const isGameOver = isGameWon || isGameLost
  const lastGuessedLetter = guessedLetters[guessedLetters.length - 1]
  const isLastGuessIncorrect = lastGuessedLetter && !currentWord.includes(lastGuessedLetter)

  if (isGameOver && timer !== null) {
    clearInterval(timer)
    setTimer(null)
    setIsHintAllowed(false)
  }

  function addGuessedLetter(letter) {

    if (timer === null) {

      setIsHintUsed(false)
      setIsHintAllowed(true)

      const now = new Date()
      setTimer(setInterval(() => {
        setTimeLeft(() => checkTimeLeft(now))
      }, 100))
    }

    setGuessedLetters(prevLetters =>
      prevLetters.includes(letter) ?
        prevLetters :
        [...prevLetters, letter]
    )
  }

  function checkTimeLeft(now) {
    const calcTimeLeft = timeLimit - (new Date() - now)
    return calcTimeLeft
  }

  function handleHint() {
    //Check if hint is used
    if (!isHintUsed && isHintAllowed) {
      setIsHintUsed(true)
      setIsHintAllowed(false)
      // Select the character to add
      // call add guessed letter
      addGuessedLetter(currentWord[Math.floor(Math.random() * (currentWord.length))])
    }
  }

  function startNewGame() {
    setCurrentWord(getRandomWord()) //getRandomWord()
    setGuessedLetters([])
    setIsHintUsed(false)
    setTimeLeft(timeLimit)
  }


  const languageElements = languages.map((lang, index) => {
    const isLanguageLost = index < wrongGuessCount
    const styles = {
      backgroundColor: lang.backgroundColor,
      color: lang.color
    }
    const className = clsx("chip", isLanguageLost && "lost")
    return (
      <span
        className={className}
        style={styles}
        key={lang.name}
      >
        {lang.name}
      </span>
    )
  })

  const letterElements = currentWord.split("").map((letter, index) => {
    const shouldRevealLetter = isGameLost || guessedLetters.includes(letter)
    const letterClassName = clsx(
      isGameLost && !guessedLetters.includes(letter) && "missed-letter"
    )
    return (
      <span key={index} className={letterClassName}>
        {shouldRevealLetter ? letter.toUpperCase() : ""}
      </span>
    )
  })

  const keyboardElements = alphabet.split("").map(letter => {
    const isGuessed = guessedLetters.includes(letter)
    const isCorrect = isGuessed && currentWord.includes(letter)
    const isWrong = isGuessed && !currentWord.includes(letter)
    const className = clsx({
      correct: isCorrect,
      wrong: isWrong
    })

    return (
      <button
        className={className}
        key={letter}
        disabled={isGameOver}
        aria-disabled={guessedLetters.includes(letter)}
        aria-label={`Letter ${letter}`}
        onClick={() => addGuessedLetter(letter)}
      >
        {letter.toUpperCase()}
      </button>
    )
  })

  const gameStatusClass = clsx("game-status", {
    won: isGameWon,
    lost: isGameLost,
    farewell: !isGameOver && isLastGuessIncorrect
  })


  const gameStatus = useMemo(() => {
    return renderGameStatus()
  }, [guessedLetters, isGameOver])


  function renderGameStatus() {
    if (!isGameOver && isLastGuessIncorrect) {
      return (
        <p className="farewell-message">
          {getFarewellText(languages[wrongGuessCount - 1].name)}
        </p>
      )
    }

    if (isGameLost) {

      if (!isLossConfettiAnimating) {
        lossConfetti()
      }

      return (
        <>
          <h2>Game over!</h2>
          <p>You lose! Better start learning Assembly 😭</p>
        </>
      )
    }

    if (isGameWon) {

      if (!isWinConfettiAnimating) {
        winConfetti()
      }

      return (
        <>
          <h2>You win!</h2>
          <p>Well done! 🎉</p>
        </>
      )
    }

    return null
  }

  const timeStyle = {
    color: trueTimeLeft < hintPenalty ? "#EC5D49" : "inherit"
  }

  //hsl(0, 0%, 15%) to hsl(0, 59%, 29%)
  let mainStyle = {}
  if (!isGameWon) {
    const timeRatio = (timeLimit - timeLeft) / timeLimit
    const guessRatio = wrongGuessCount / (languages.length - 1)
    const ratio = timeRatio >= guessRatio ? timeRatio : guessRatio
    const hue = 0
    const saturation = 59 * ratio
    const light = 15 + (29 - 15) * ratio
    mainStyle = {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${light}%)`
    }
  }



  return (
    <main id='main' style={mainStyle}>

      <section id="confetti-section">
      </section>

      <header>
        <h1>Assembly: Endgame</h1>
        <p>Guess the word within 8 attempts and 90s to keep the
          programming world safe from Assembly!</p>
      </header>

      <section
        aria-live="polite"
        role="status"
        className={gameStatusClass}
      >
        {gameStatus}
      </section>

      <section className="language-chips">
        {languageElements}
      </section>

      <p className='time-left'>Time Left: <span style={timeStyle}>{timeLeftMin}:{timeLeftSec}</span></p>

      <section className="word">
        {letterElements}
      </section>

      {/* Combined visually-hidden aria-live region for status updates */}
      <section
        className="sr-only"
        aria-live="polite"
        role="status"
      >
        <p>
          {currentWord.includes(lastGuessedLetter) ?
            `Correct! The letter ${lastGuessedLetter} is in the word.` :
            `Sorry, the letter ${lastGuessedLetter} is not in the word.`
          }
          You have {numGuessesLeft} attempts left.
        </p>
        <p>Current word: {currentWord.split("").map(letter =>
          guessedLetters.includes(letter) ? letter + "." : "blank.")
          .join(" ")}</p>

      </section>

      <button
        className='hint-btn'
        onClick={handleHint}
        disabled={!isHintAllowed || trueTimeLeft < hintPenalty} // 
      >{`Spend ${hintPenalty / 1000}s for a hint`}</button>

      <section className="keyboard">
        {keyboardElements}
      </section>

      {isGameOver &&
        <button
          className="new-game"
          onClick={startNewGame}
        >New Game</button>}
    </main>
  )
}
