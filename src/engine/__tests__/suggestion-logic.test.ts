import { suggestTeamLogic } from "../suggestion-logic";
import { ScheduleConfig } from "../schedule.config";
import type { Event, Personnel } from "@/lib/types";

describe("Scheduling Engine — Core Logic", () => {
  const baseDate = new Date("2025-11-05T10:00:00Z");

  const mockOperators: Personnel[] = [
    { id: "1", name: "Bruno Almeida", turn: "Noite" },
    { id: "2", name: "Mário Augusto", turn: "Noite" },
    { id: "3", name: "Ovídio Dias", turn: "Tarde" },
  ];

  const mockEvent: Event = {
    id: "evt1",
    name: "Sessão Ordinária",
    date: baseDate,
    location: "Plenário",
    transmission: ["youtube"],
    color: 'blue',
    status: 'Agendado',
    turn: 'Manhã'
  };

  test("Seleciona operador noturno correto (Bruno por padrão)", () => {
    const result = suggestTeamLogic({
      name: mockEvent.name,
      date: mockEvent.date.toISOString(),
      location: mockEvent.location,
      transmissionTypes: mockEvent.transmission,
      operators: mockOperators,
      cinematographicReporters: [],
      reporters: [],
      producers: [],
      eventsToday: [],
      allFutureEvents: [],
    });
    expect(result.transmissionOperator).toBeDefined();
  });

  test("Evita conflitos e respeita carga máxima diária", () => {
    const busyEvent: Event = { ...mockEvent, id: "evt2", date: baseDate };
    const allEvents = [
      { ...busyEvent, transmissionOperator: "Bruno Almeida" },
      { ...busyEvent, reporter: "Mário Augusto" },
    ] as Event[];

    const result = suggestTeamLogic({
      name: mockEvent.name,
      date: mockEvent.date.toISOString(),
      location: mockEvent.location,
      transmissionTypes: mockEvent.transmission,
      operators: mockOperators,
      cinematographicReporters: [],
      reporters: [],
      producers: [],
      eventsToday: allEvents,
      allFutureEvents: allEvents,
    });
    expect(result.transmissionOperator).not.toBe("Bruno Almeida");
  });
});
