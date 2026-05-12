// All timestamps are ISO 8601 strings e.g. "2026-04-07T05:15:00Z"
// epochSecond and syncedAt are unix integers

export interface HeartRateRecord {
  beatsPerMinute: number
  minuteBucket: number
  sampleCount: number
  source: string
  time: string
  syncedAt: number
}

export interface StepsRecord {
  count: number
  startTime: string
  endTime: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface SleepRecord {
  startTime: string
  endTime: string
  durationMinutes: number
  title?: string
  source: string
  syncedAt: number
}

export interface SpO2Record {
  percentage: number
  time: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface HRVRecord {
  rmssd: number
  time: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface RespiratoryRateRecord {
  rate: number
  time: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface RestingHeartRateRecord {
  beatsPerMinute: number
  time: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface DistanceRecord {
  distanceMeters: number
  startTime: string
  endTime: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface CaloriesRecord {
  calories: number
  startTime: string
  endTime: string
  epochSecond: number
  source: string
  syncedAt: number
}

export interface ExerciseSet {
  startTime?: string
  endTime?: string
  reps?: number
  weightKg?: number
}

export interface ExerciseSessionRecord {
  id?: string
  startTime: string
  endTime: string
  exerciseType: number
  title?: string
  notes?: string
  sets?: ExerciseSet[]
  totalCalories?: number
  totalDistance?: number
  avgHeartRate?: number
  maxHeartRate?: number
  source?: string
  syncedAt?: number
}

export const EXERCISE_TYPE_LABELS: Record<number, string> = {
  0: 'Other', 2: 'Biking', 4: 'Boxing', 8: 'Calisthenics',
  11: 'Elliptical', 20: 'HIIT', 21: 'Hiking', 31: 'Pilates',
  38: 'Running', 39: 'Running (Treadmill)', 42: 'Stair Climbing',
  51: 'Strength Training', 52: 'Stretching', 54: 'Swimming (Open Water)',
  55: 'Swimming (Pool)', 57: 'Tennis', 59: 'Walking', 61: 'Weightlifting', 63: 'Yoga',
}
