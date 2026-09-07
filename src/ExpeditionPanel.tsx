import { useState } from 'react'
import { EXPEDITIONS, type Expedition, type ExpeditionGoal } from './expeditions'

function Challenge({ goal, complete, onVisit, onComplete }: {
  goal: ExpeditionGoal; complete: boolean
  onVisit: (kind: 'landmark' | 'district', target: string) => void
  onComplete: (id: string) => void
}) {
  const [feedback, setFeedback] = useState('')
  const options = goal.kind === 'quiz'
    ? [...goal.options].sort((a, b) => ((Number(a.id) + Number(goal.id.slice(0, 4))) % 3) - ((Number(b.id) + Number(goal.id.slice(0, 4))) % 3))
    : []
  return <article className={`challenge-card ${complete ? 'complete' : ''}`}>
    <div className="challenge-title"><span aria-hidden="true">{complete ? '✓' : goal.kind === 'quiz' ? '?' : '◇'}</span><h3>{goal.title}</h3></div>
    {goal.kind === 'quiz' ? <>
      <p>{goal.question}</p>
      <div className="quiz-options">{options.map((option) => <button key={option.id} disabled={complete} onClick={() => {
        if (option.id === goal.answer) { onComplete(goal.id); setFeedback('') }
        else setFeedback('Not quite. Open the hint, then try again—there is no penalty.')
      }}>{option.text}</button>)}</div>
      {complete && <p className="discovery-answer">{goal.explanation}</p>}
      {feedback && !complete && <p className="quiz-feedback" role="status">{feedback}</p>}
    </> : <button className="quiet-button challenge-visit" onClick={() => onVisit(goal.kind, goal.target)}>{complete ? 'Visit again' : 'Scout this place'}<span aria-hidden="true">→</span></button>}
    <details className="challenge-hint"><summary>Field hint</summary><p>{goal.hint}</p></details>
  </article>
}

export default function ExpeditionPanel({ expedition, completed, warning, onVisit, onComplete }: {
  expedition: Expedition; completed: Set<string>; warning: string
  onVisit: (kind: 'landmark' | 'district', target: string) => void
  onComplete: (id: string) => void
}) {
  const count = expedition.goals.filter((goal) => completed.has(goal.id)).length
  const badges = EXPEDITIONS.filter((entry) => entry.goals.every((goal) => completed.has(goal.id))).length
  return <div className="expedition-panel">
    <span className="eyebrow">ERA EXPEDITION / {expedition.year}</span>
    <h1>{expedition.title}</h1>
    <p className="expedition-intro">Scout, observe, discover. Three short challenges bring this chapter to life. Hints and retries are part of learning.</p>
    <div className="expedition-progress"><strong>{count} / 3</strong><span>discoveries made</span><progress max={3} value={count} aria-label="Era expedition progress" /></div>
    {count === 3 && <div className="era-badge" role="status"><span aria-hidden="true">✦</span><span>CHAPTER BADGE EARNED<strong>{expedition.badge}</strong></span></div>}
    {expedition.goals.map((goal) => <Challenge key={goal.id} goal={goal} complete={completed.has(goal.id)} onVisit={onVisit} onComplete={onComplete} />)}
    <p className="expedition-total">{completed.size} / 24 discoveries · {badges} / 8 chapter badges</p>
    <p className="quiet-note">{warning || 'Saved on this browser only. No account, tracking or competitive ranking.'}</p>
  </div>
}
