import { InterviewState, InterviewSessionRuntime } from '../types/session.types';
import { createLogger } from './logger';

// ── Finite State Machine: Explicit Interview State Transitions ─────────────
// Every transition is validated. No hidden state. Idempotent replays.

/** Valid transitions map: from → [allowed destinations] */
const VALID_TRANSITIONS: Record<InterviewState, InterviewState[]> = {
  CREATED:                 ['WAITING_FOR_CANDIDATE'],
  WAITING_FOR_CANDIDATE:   ['INITIALIZING_CONTEXT'],
  INITIALIZING_CONTEXT:    ['GENERATING_FIRST_QUESTION', 'ERROR'],
  GENERATING_FIRST_QUESTION: ['WAITING_FOR_ANSWER', 'ERROR'],
  WAITING_FOR_ANSWER:      ['EVALUATING', 'COMPLETED', 'ERROR'],
  EVALUATING:              ['UPDATING_STATE', 'ERROR'],
  UPDATING_STATE:          ['GENERATING_NEXT_QUESTION', 'COMPLETED'],
  GENERATING_NEXT_QUESTION: ['WAITING_FOR_ANSWER', 'ERROR'],
  COMPLETED:               ['REPORT_GENERATED'],
  REPORT_GENERATED:        ['ARCHIVED'],
  ARCHIVED:                [],
  ERROR:                   ['WAITING_FOR_ANSWER', 'GENERATING_NEXT_QUESTION', 'COMPLETED'], // recovery paths
};

export interface TransitionResult {
  success: boolean;
  previousState: InterviewState;
  newState: InterviewState;
  reason?: string;
}

/**
 * Attempt a state transition on the session. Returns success/failure.
 * Transitions are idempotent: transitioning to the current state is a no-op success.
 */
export function transition(
  session: InterviewSessionRuntime,
  targetState: InterviewState,
  correlationId: string
): TransitionResult {
  const logger = createLogger('StateMachine', correlationId);
  const previousState = session.state;

  // Idempotent: same state = no-op
  if (previousState === targetState) {
    logger.debug('transition_idempotent', { from: previousState, to: targetState });
    return { success: true, previousState, newState: targetState };
  }

  const allowed = VALID_TRANSITIONS[previousState];
  if (!allowed || !allowed.includes(targetState)) {
    const reason = `Invalid transition: ${previousState} → ${targetState}. Allowed: [${allowed?.join(', ') || 'none'}]`;
    logger.warn('transition_rejected', { from: previousState, to: targetState, reason });
    return { success: false, previousState, newState: previousState, reason };
  }

  // Apply transition
  session.state = targetState;
  session.lastActivityTime = Date.now();

  logger.info('transition_applied', {
    from: previousState,
    to: targetState,
    sessionId: session.sessionId,
    questionCounter: session.questionCounter,
  });

  return { success: true, previousState, newState: targetState };
}

/** Check if a transition is valid without applying it */
export function canTransition(currentState: InterviewState, targetState: InterviewState): boolean {
  if (currentState === targetState) return true;
  const allowed = VALID_TRANSITIONS[currentState];
  return allowed?.includes(targetState) ?? false;
}

/** Get all valid next states from the current state */
export function getValidNextStates(currentState: InterviewState): InterviewState[] {
  return VALID_TRANSITIONS[currentState] || [];
}
