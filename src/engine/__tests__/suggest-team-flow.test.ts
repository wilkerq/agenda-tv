import { suggestTeam } from "../suggest-team-flow";
import type { Personnel } from "@/lib/types";

describe("SuggestTeam Flow Integration", () => {
  const operators: Personnel[] = [
    { id: "1", name: "Bruno Almeida", turn: "Noite" },
    { id: "2", name: "Mário Augusto", turn: "Noite" },
  ];

  const reporters: Personnel[] = [
    { id: "3", name: "Ana Souza", turn: "Tarde" },
    { id: "4", name: "Carlos Lima", turn: "Noite" },
  ];

  test("Retorna uma sugestão completa de equipe", async () => {
    const result = await suggestTeam({
      name: "Evento Teste",
      date: "2025-11-10T19:00:00.000Z",
      time: "19:00",
      location: "Plenário",
      transmissionTypes: ["youtube"],
      operators,
      cinematographicReporters: [],
      reporters,
      producers: [],
      eventsToday: [],
      allFutureEvents: [],
    });

    expect(result).toHaveProperty("transmissionOperator");
  });
});
