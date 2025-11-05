// src/engine/schedule.config.ts

/**
 * Configuration parameters for the scheduling engine.
 * This allows for easy adjustments to business rules without changing the core logic.
 */
export const ScheduleConfig = {
  // Maximum number of events a person can be assigned to in a single day.
  MAX_HOURS_PER_DAY: 6,

  // Default duration in hours for an event if not specified.
  DEFAULT_EVENT_DURATION: 1,

  // Margin in minutes before and after an event to consider a person "busy".
  CONFLICT_MARGIN_MINUTES: 45,

  // Window in days for calculating trip fairness.
  FAIRNESS_WINDOW_DAYS: 30,

  // Operators designated for weekend rotation.
  WEEKEND_ROTATION: ["Bruno Almeida", "Mário Augusto", "Ovídio Dias"],

  // Operators designated for night shifts, in order of preference.
  NIGHT_OPERATORS: ["Bruno Almeida", "Mário Augusto"],

  // Fixed operator for the "Deputados Aqui" event.
  FIXED_OPERATOR_DEPUTADOS_AQUI: "Wilker Quirino",
};
