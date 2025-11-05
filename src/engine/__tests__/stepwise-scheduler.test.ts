import { suggestNextRole } from "../stepwise-scheduler";
import type { EventInput, Personnel } from "@/lib/types";

test("Stepwise: sugere transmissionOperator primeiro", () => {
  const baseDate = new Date("2025-11-05T20:00:00Z"); // noite
  const event: EventInput = {
    id: "e1", name: "Noite", date: baseDate, durationHours: 1,
    location: "Plenario", transmissionTypes: ["youtube"],
  };
  const pools = {
    transmissionOps: [{ id: "1", name: "Bruno Almeida", turn: "Noite" }],
    cinematographicReporters: [],
    reporters: [],
    producers: [],
  };
  const res = suggestNextRole({ event, partialAllocations: {}, pools, allEvents: [] });
  expect(res.nextRole).toBe("transmissionOperator");
  expect(res.candidate).toBeDefined();
});
