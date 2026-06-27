/**
 * flow.ts — the Title → Creator → Story → Ending state machine.
 *
 * GameApp owns the heavy logic; this just declares the legal transitions so an
 * accidental jump (e.g. Creator → Ending) is caught in one place. Kept tiny and
 * data-driven on purpose.
 */

import type { FlowPhase } from './AppState'

const TRANSITIONS: Record<FlowPhase, FlowPhase[]> = {
  boot: ['title'],
  title: ['creator', 'story'], // new game → creator; continue → story
  creator: ['story', 'title'],
  story: ['ending', 'title'],
  ending: ['title', 'creator', 'story'],
}

export function canTransition(from: FlowPhase, to: FlowPhase): boolean {
  return from === to || TRANSITIONS[from].includes(to)
}

/** Throws in dev if a transition is illegal; returns `to` for chaining. */
export function assertTransition(from: FlowPhase, to: FlowPhase): FlowPhase {
  if (!canTransition(from, to)) {
    console.warn(`[flow] illegal transition ${from} → ${to}`)
  }
  return to
}
