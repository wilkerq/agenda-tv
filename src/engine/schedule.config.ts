// =============================
// schedule.config.ts
// Configurações centrais da Scheduling Engine determinística
// =============================

export const ScheduleConfig = {
  // Tempo máximo diário permitido por operador
  MAX_HOURS_PER_DAY: 6,

  // Duração padrão de um evento em horas
  DEFAULT_EVENT_DURATION: 1,

  // Margem (em minutos) para considerar conflito entre eventos
  CONFLICT_MARGIN_MINUTES: 45,

  // Janela usada para calcular fairness (dias antes e depois)
  FAIRNESS_WINDOW_DAYS: 30,

  // Revezamento de operadores nos finais de semana
  WEEKEND_ROTATION: ["Bruno Almeida", "Mário Augusto", "Ovídio Dias"],

  // Operadores noturnos padrão
  NIGHT_OPERATORS: ["Bruno Almeida", "Mário Augusto"],

  // Operador fixo em eventos “Deputados Aqui”
  FIXED_OPERATOR_DEPUTADOS_AQUI: "Wilker Quirino",

  // Período mínimo de descanso após viagem (em dias)
  TRAVEL_REST_DAYS: 1,

  // Liga/desliga logs detalhados
  DEBUG: true,
};

export default ScheduleConfig;
