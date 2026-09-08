/**
 * PoseTracker V3 exercise list — same registry as the public Demo App
 * (`PoseTracker Demo App/app/lib/exerciseEngine.ts`).
 */

export type MovementType = 'dynamic' | 'static';

export interface ExerciseInfo {
  key: string;
  name: string;
  movement_type?: MovementType;
  type: 'base' | 'custom';
}

export const EXERCISES: ExerciseInfo[] = [
  { key: 'squat', name: 'Squat', movement_type: 'dynamic', type: 'base' },
  { key: 'push_up', name: 'Push-up', movement_type: 'dynamic', type: 'base' },
  { key: 'lunge', name: 'Lunge', movement_type: 'dynamic', type: 'base' },
  { key: 'side_lunge', name: 'Side lunge', movement_type: 'dynamic', type: 'base' },
  { key: 'deadlift', name: 'Deadlift', movement_type: 'dynamic', type: 'base' },
  { key: 'bicep_curl', name: 'Bicep curl', movement_type: 'dynamic', type: 'base' },
  { key: 'hammer_curl', name: 'Hammer curl', movement_type: 'dynamic', type: 'base' },
  { key: 'tricep_dip', name: 'Tricep dip', movement_type: 'dynamic', type: 'base' },
  { key: 'shoulder_press', name: 'Shoulder press', movement_type: 'dynamic', type: 'base' },
  { key: 'lateral_raise', name: 'Lateral raise', movement_type: 'dynamic', type: 'base' },
  { key: 'glute_bridge', name: 'Glute bridge', movement_type: 'dynamic', type: 'base' },
  { key: 'calf_raise', name: 'Calf raise', movement_type: 'dynamic', type: 'base' },
  { key: 'mountain_climber', name: 'Mountain climber', movement_type: 'dynamic', type: 'base' },
  { key: 'high_knees', name: 'High knees', movement_type: 'dynamic', type: 'base' },
  { key: 'jumping_jack', name: 'Jumping jack', movement_type: 'dynamic', type: 'base' },
  { key: 'leg_raise', name: 'Leg raise', movement_type: 'dynamic', type: 'base' },
  { key: 'low_impact_jack', name: 'Low-impact jack', movement_type: 'dynamic', type: 'base' },
  { key: 'plank', name: 'Plank', movement_type: 'static', type: 'base' },
  { key: 'wall_sit', name: 'Wall sit', movement_type: 'static', type: 'base' },
  { key: 'balance_leg', name: 'Balance (single leg)', movement_type: 'static', type: 'base' },
  { key: 'balance_leg_left', name: 'Balance (left leg)', movement_type: 'static', type: 'base' },
  { key: 'balance_leg_right', name: 'Balance (right leg)', movement_type: 'static', type: 'base' },
  { key: 'jump_analysis', name: 'Jump analysis', movement_type: 'dynamic', type: 'custom' },
  { key: 'air_time_jump', name: 'Air-time jump', movement_type: 'dynamic', type: 'custom' },
];

/** Catalog compiled into engine-v4.bundle.js (opt-in channel). Jumps stay V3-only. */
export const V4_EXERCISES: ExerciseInfo[] = [
  { key: 'squat', name: 'Squat', movement_type: 'dynamic', type: 'base' },
  { key: 'shoulder_roll', name: 'Shoulder roll', movement_type: 'dynamic', type: 'base' },
  { key: 'shoulder_deep_breath', name: 'Shoulder deep breath', movement_type: 'dynamic', type: 'base' },
  { key: 'chair_forward_fold', name: 'Chair forward fold', movement_type: 'dynamic', type: 'base' },
  { key: 'chair_side_stretch', name: 'Chair side stretch', movement_type: 'dynamic', type: 'base' },
];

export function exercisesForEngine(channel: 'v3' | 'v4'): ExerciseInfo[] {
  return channel === 'v4' ? V4_EXERCISES : EXERCISES;
}

export function getExerciseInfo(key: string): ExerciseInfo | null {
  return EXERCISES.find((e) => e.key === key) ?? V4_EXERCISES.find((e) => e.key === key) ?? null;
}

export function requiresUserHeight(key: string): boolean {
  return key === 'jump_analysis';
}

export function isJumpExercise(key: string): boolean {
  return key === 'jump_analysis' || key === 'air_time_jump';
}
