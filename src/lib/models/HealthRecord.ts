import mongoose, { Schema, Model } from 'mongoose'

const HealthRecordSchema = new Schema({
  sourceId:   { type: String, required: true, unique: true },
  data:       { type: Schema.Types.Mixed, required: true },
  recordedAt: { type: Date, required: true },
  syncedAt:   { type: Date, default: Date.now },
})

HealthRecordSchema.index({ recordedAt: -1 })

// Map health type → MongoDB collection name
export const COLLECTION_NAME: Record<string, string> = {
  // Activity
  heart_rate:            'health_heart_rate',
  steps:                 'health_steps',
  distance:              'health_distance',
  active_calories:       'health_active_calories',
  total_calories:        'health_total_calories',
  exercise_session:      'health_exercise',
  floors_climbed:        'health_floors',
  elevation_gained:      'health_elevation',
  speed:                 'health_speed',
  power:                 'health_power',
  vo2_max:               'health_vo2max',
  wheelchair_pushes:     'health_wheelchair',
  // Vitals
  hrv:                   'health_hrv',
  resting_heart_rate:    'health_resting_hr',
  spo2:                  'health_spo2',
  respiratory_rate:      'health_respiratory',
  blood_pressure:        'health_blood_pressure',
  blood_glucose:         'health_blood_glucose',
  body_temperature:      'health_body_temp',
  basal_body_temperature:'health_basal_body_temp',
  // Body
  weight:                'health_weight',
  height:                'health_height',
  body_fat:              'health_body_fat',
  lean_body_mass:        'health_lean_mass',
  bone_mass:             'health_bone_mass',
  basal_metabolic_rate:  'health_bmr',
  body_water_mass:       'health_body_water',
  // Nutrition
  nutrition:             'health_nutrition',
  hydration:             'health_hydration',
  // Sleep
  sleep:                 'health_sleep',
  // Cycle
  menstruation_flow:          'health_menstruation',
  menstruation_period:        'health_menstruation_period',
  cervical_mucus:             'health_cervical_mucus',
  ovulation_test:             'health_ovulation',
  sexual_activity:            'health_sexual_activity',
  intermenstrual_bleeding:    'health_intermenstrual',
}

// Returns (or creates) a model bound to the correct collection
export function getHealthModel(type: string): Model<any> {
  const col = COLLECTION_NAME[type] ?? `health_${type}`
  return mongoose.models[col] ?? mongoose.model(col, HealthRecordSchema, col)
}
