import { suggestTeamLogic, Personnel, EventInput } from './suggestion_debug/suggestion-logic'; // Ajuste o caminho

// =============================================================
// DADOS DE TESTE (MOCK)
// =============================================================

const mockOps: Personnel[] = [
    { id: 'op1', name: 'Bruno Almeida', shifts: ['night', 'geral'] },
    { id: 'op2', name: 'Mário Augusto', shifts: ['morning', 'afternoon'] },
    { id: 'op3', name: 'Ovídio Dias', shifts: ['morning', 'afternoon'] },
    { id: 'op4', name: 'Wilker Quirino', shifts: ['all'] },
    { id: 'op5', name: 'Operador Cansado', shifts: ['morning'] },
];

const mockCine: Personnel[] = [
    { id: 'cine1', name: 'Dione Maciel', shifts: ['morning'] },
    { id: 'cine2', name: 'Felipe', shifts: ['afternoon'] },
];

const mockRep: Personnel[] = [
    { id: 'rep1', name: 'Patrícia Lee', shifts: ['afternoon'] },
    { id: 'rep2', name: 'Daniela', shifts: ['morning'] },
];

const mockProd: Personnel[] = [
    { id: 'prod1', name: 'Pepeu Vargas', shifts: ['all'], isProducer: true },
    // Repórter que também é produtor
    { id: 'rep1', name: 'Patrícia Lee', shifts: ['afternoon'], isReporter: true, isProducer: true },
];

const today = new Date();
const morningEventDate = new Date(today);
morningEventDate.setHours(9, 0, 0, 0);

const afternoonEventDate = new Date(today);
afternoonEventDate.setHours(15, 0, 0, 0);

const nightEventDate = new Date(today);
nightEventDate.setHours(20, 0, 0, 0);

// =============================================================
// SUÍTE DE TESTES
// =============================================================

describe('Suggestion Logic', () => {

    it('should assign by turn correctly for a morning event', () => {
        const event: EventInput = { name: 'Sessão Matutina', date: morningEventDate, location: 'Plenário' , transmissionTypes: ['tv']};
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: []
        });

        // Mário (op2) ou Ovídio (op3) devem ser escolhidos para a manhã.
        expect(['op2', 'op3']).toContain(result.transmissionOperatorId);
        // Dione (cine1) é da manhã
        expect(result.cinematographicReporterId).toBe('cine1');
        // Daniela (rep2) é da manhã
        expect(result.reporterId).toBe('rep2');
    });

    it('should assign night shift correctly', () => {
        const event: EventInput = { name: 'Sessão Noturna', date: nightEventDate, location: 'Plenário', transmissionTypes: ['tv'] };
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: []
        });
        
        // Regra da noite: Bruno (op1) é o padrão
        expect(result.transmissionOperatorId).toBe('op1');
        // Regra da noite: cinegrafista da tarde (Felipe, cine2)
        expect(result.cinematographicReporterId).toBe('cine2');
         // Regra da noite: repórter da tarde (Patrícia, rep1)
        expect(result.reporterId).toBe('rep1');
    });

    it('should apply "Deputados Aqui" rule', () => {
        const event: EventInput = { name: 'Deputados Aqui', date: afternoonEventDate, location: 'Estúdio', transmissionTypes: ['tv'] };
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: []
        });
        // Regra "Deputados Aqui" fixa Wilker (op4)
        expect(result.transmissionOperatorId).toBe('op4');
    });

     it('should apply "CCJR" rule', () => {
        const event: EventInput = { name: 'CCJR', date: afternoonEventDate, location: 'Sala Julio da Retifica "CCJR"', transmissionTypes: ['tv'] };
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: []
        });
        // Regra "CCJR" fixa Mário (op2)
        expect(result.transmissionOperatorId).toBe('op2');
    });

    it('should avoid assigning a person who is already busy', () => {
        const conflictingEvent: EventInput = {
            id: 'evt1',
            name: 'Evento Conflitante',
            date: morningEventDate,
            location: 'Plenário',
            transmissionTypes: ['tv'],
            transmissionOperatorId: 'op2' // Mário está ocupado
        };

        const event: EventInput = { name: 'Novo Evento', date: morningEventDate, location: 'Auditório', transmissionTypes: ['tv'] };
        
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: [conflictingEvent]
        });

        // Mário (op2) está ocupado, então deve escalar Ovídio (op3) que também é da manhã.
        expect(result.transmissionOperatorId).toBe('op3');
    });

    it('should avoid assigning a reporter as a producer if another producer is free', () => {
        const event: EventInput = { name: 'Evento de Tarde', date: afternoonEventDate, location: 'Plenário', transmissionTypes: ['tv'] };
        
        // Patrícia Lee (rep1) é repórter e produtora
        // Pepeu (prod1) é só produtor
        const result = suggestTeamLogic({
            event,
            transmissionOps: mockOps,
            cinematographicReporters: mockCine,
            reporters: mockRep,
            producers: mockProd,
            allEvents: []
        });
        
        // Repórter da tarde: Patrícia Lee (rep1)
        expect(result.reporterId).toBe('rep1');
        // Produtor: Como Patrícia já é repórter, deve escalar Pepeu (prod1)
        expect(result.producerId).toBe('prod1');
    });

});