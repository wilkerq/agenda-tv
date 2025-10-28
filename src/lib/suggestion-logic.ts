'use server';

import { getDay } from 'date-fns';
import type { TransmissionType, Event } from "./types";

interface Personnel {
    id: string;
    name: string;
    turn: 'Manhã' | 'Tarde' | 'Noite' | 'Geral';
}

interface ProductionPersonnel extends Personnel {
    isReporter: boolean;
    isProducer: boolean;
}

interface SuggestTeamParams {
    date: string;
    location: string;
    transmissionTypes: TransmissionType[];
    operators: Personnel[] | undefined;
    cinematographicReporters: Personnel[] | undefined;
    productionPersonnel: ProductionPersonnel[] | undefined;
    eventsToday: any[];
}


// ==========================================================================================
// FUNÇÕES HELPER CORRIGIDAS
// ==========================================================================================

/**
 * Normaliza o turno vindo do banco de dados para evitar erros.
 */
const normalizeTurn = (turn: string | undefined | null): 'Manhã' | 'Tarde' | 'Noite' | 'Geral' | null => {
    if (!turn) return null;
    const lower = turn.toLowerCase().trim();
    if (lower === 'manha' || lower === 'manhã') return 'Manhã';
    if (lower === 'tarde') return 'Tarde';
    if (lower === 'noite') return 'Noite';
    if (lower === 'geral') return 'Geral';
    return null; // Retorna null se for um valor desconhecido
};

/**
 * Calcula o turno do evento.
 */
const getEventTurn = (date: Date): 'Manhã' | 'Tarde' | 'Noite' => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã'; // Manhã (6h - 11:59h)
    if (hour >= 12 && hour < 18) return 'Tarde'; // Tarde (12h - 17:59h)
    return 'Noite'; // Noite (18h - 5:59h)
};

/**
 * Pega pessoal disponível, VERIFICANDO O TURNO CORRETAMENTE.
 */
const getAvailablePersonnel = (
    personnel: Personnel[], 
    assignedNames: Set<string>,
    eventTurn: 'Manhã' | 'Tarde' | 'Noite'
): Personnel[] => {
    return personnel.filter(p => {
        const isAvailable = !assignedNames.has(p.name);
        
        // CORREÇÃO: Normaliza o turno do banco ANTES de comparar
        const personTurn = normalizeTurn(p.turn);
        const worksTurn = personTurn === eventTurn || personTurn === 'Geral';
        
        return isAvailable && worksTurn;
    });
};

// ==========================================================================================
// LÓGICA DE SUGESTÃO CORRIGIDA
// ==========================================================================================

const suggestTransmissionOperator = (
    eventDate: Date,
    location: string,
    operators: Personnel[],
    eventsToday: any[]
): string | undefined => {
    const dayOfWeek = getDay(eventDate);
    const assignedOperators = new Set(eventsToday.map(e => e.transmissionOperator).filter(Boolean));
    const eventTurn = getEventTurn(eventDate);

    // REGRA DE EXCEÇÃO: CCJR
    if (location === 'Sala Julio da Retifica "CCJR"') {
        const mario = operators.find(op => op.name === "Mário Augusto");
        // Verifica se Mário existe E não está assignado
        if (mario && !assignedOperators.has(mario.name)) {
            // Não checa o turno dele, pois é uma regra de local
            return mario.name;
        }
    }
    
    // REGRA DE DIAS DE SEMANA (SEGUNDA A SEXTA)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        
        // Pega todos os operadores disponíveis para ESTE TURNO
        const availableForTurn = getAvailablePersonnel(operators, assignedOperators, eventTurn);
        if (availableForTurn.length === 0) {
             // Ninguém está disponível para este turno, sai da função
             return undefined;
        }

        if (eventTurn === 'Manhã') {
            const morningPriority = ["Rodrigo Sousa", "Ovidio Dias", "Mário Augusto"];
            // Para cada nome na lista de prioridade...
            for (const name of morningPriority) {
                // ...verifique se ele está na lista de DISPONÍVEIS
                const person = availableForTurn.find(p => p.name === name);
                if (person) return person.name; // Encontrado!
            }

            // Lógica do Bruno (só se não tiver evento à noite)
            const bruno = availableForTurn.find(p => p.name === "Bruno Almeida");
            if (bruno) {
                const nightEventsWithBruno = eventsToday.some(e => e.transmissionOperator === 'Bruno Almeida' && getEventTurn(new Date(e.date)) === 'Noite');
                if (!nightEventsWithBruno) return bruno.name;
            }
        } 
        else if (eventTurn === 'Tarde') {
            const afternoonPriority = ["Ovidio Dias", "Mário Augusto", "Bruno Almeida"];
            for (const name of afternoonPriority) {
                const person = availableForTurn.find(p => p.name === name);
                if (person) return person.name;
            }
        } 
        else { // Noite
            const nightPriority = ["Bruno Almeida", "Mário Augusto"];
            for (const name of nightPriority) {
                const person = availableForTurn.find(p => p.name === name);
                if (person) return person.name;
            }
        }
    }

    // REGRA DE FIM DE SEMANA (SÁBADO E DOMINGO)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        const weekendPoolNames = ["Bruno Almeida", "Mário Augusto", "Ovidio Dias"];
        // Pega SÓ os do fim de semana
        const weekendPool = operators.filter(p => weekendPoolNames.includes(p.name));
        // Pega os disponíveis (sem checar turno, pois é revezamento)
        const available = weekendPool.filter(p => !assignedOperators.has(p.name));
        
         for (const name of weekendPoolNames) {
            const person = available.find(p => p.name === name);
            if (person) return person.name; // Retorna em ordem de prioridade
        }
        // Se todos estiverem ocupados, faz rotação simples
        return weekendPool[eventsToday.length % weekendPool.length]?.name;
    }
    
    // Fallback final (se nenhuma regra se aplicar)
    const anyAvailable = getAvailablePersonnel(operators, assignedOperators, eventTurn);
    if (anyAvailable.length > 0) return anyAvailable[0].name;

    return undefined; // Ninguém encontrado
}

const suggestCinematographicReporter = (
    eventDate: Date,
    reporters: Personnel[],
    eventsToday: any[]
): string | undefined => {
    const assignedReporters = new Set(eventsToday.map(e => e.cinematographicReporter).filter(Boolean));
    const eventTurn = getEventTurn(eventDate);

    // REGRA: Evento à noite é coberto pela equipe da tarde
    if (eventTurn === 'Noite') {
        // Pega pessoal da TARDE ou GERAL
        const afternoonReporters = reporters.filter(r => {
            const personTurn = normalizeTurn(r.turn);
            return personTurn === 'Tarde' || personTurn === 'Geral';
        });
        // Filtra pelos que não estão ocupados
        const available = afternoonReporters.filter(r => !assignedReporters.has(r.name));
        
        if (available.length > 0) return available[eventsToday.length % available.length].name;
        if (afternoonReporters.length > 0) return afternoonReporters[eventsToday.length % afternoonReporters.length].name;
    }

    // REGRA: Evento de Manhã ou Tarde
    // Pega pessoal disponível para O TURNO DO EVENTO
    const availableForTurn = getAvailablePersonnel(reporters, assignedReporters, eventTurn);
     if (availableForTurn.length > 0) {
        // Faz rotação simples entre os disponíveis
        return availableForTurn[eventsToday.length % availableForTurn.length].name;
    }

    // Fallback: Pega qualquer um do 'Geral' que esteja livre
    const generalTurnAvailable = reporters.filter(r => {
        const personTurn = normalizeTurn(r.turn);
        return personTurn === 'Geral' && !assignedReporters.has(r.name);
    });
    if(generalTurnAvailable.length > 0) {
        return generalTurnAvailable[eventsToday.length % generalTurnAvailable.length].name;
    }

    return undefined;
};

const suggestProductionMember = (
    eventDate: Date,
    personnel: ProductionPersonnel[],
    eventsToday: any[],
    role: 'reporter' | 'producer'
): string | undefined => {
    const assignedPersonnel = new Set(
        eventsToday.flatMap(e => [e.reporter, e.producer]).filter(Boolean)
    );
    const eventTurn = getEventTurn(eventDate);

    // 1. Filtra candidatos para a FUNÇÃO
    const candidates = personnel.filter(p => (role === 'reporter' ? p.isReporter : p.isProducer));
    
    // 2. Filtra candidatos para o TURNO (já checando disponibilidade)
    const availableForTurn = getAvailablePersonnel(candidates, assignedPersonnel, eventTurn);
    if (availableForTurn.length > 0) {
        return availableForTurn[eventsToday.length % availableForTurn.length].name;
    }

    // 3. Fallback: Pega 'Geral' disponível (se ninguém do turno foi encontrado)
   const generalTurn = candidates.filter(p => normalizeTurn(p.turn) === 'Geral');
    const availableGeneral = getAvailablePersonnel(generalTurn, assignedPersonnel, eventTurn); // (o turno aqui não importa, pois já filtramos por 'Geral')
    
    if(availableGeneral.length > 0) {
        return availableGeneral[eventsToday.length % availableGeneral.length].name;
    }

    // 4. Fallback final: Pega qualquer candidato daquela função, mesmo fora do turno (melhor do que nada)
    if (candidates.length > 0) {
        const anyAvailable = candidates.filter(p => !assignedPersonnel.has(p.name));
        if (anyAvailable.length > 0) {
            return anyAvailable[eventsToday.length % anyAvailable.length].name;
        }
    }

    return undefined;
}


/**
 * Função principal
 */
export const suggestTeam = async (params: SuggestTeamParams) => {
    // CORREÇÃO: Adiciona valores padrão para robustez
    const { 
      date, 
      location, 
      transmissionTypes,
      operators = [], // Garante que não seja 'undefined'
      cinematographicReporters = [], // Garante que não seja 'undefined'
      productionPersonnel = [], // Garante que não seja 'undefined'
    } = params;

    // **FIX: Deserialize ISO strings back to Date objects**
    const eventsToday = params.eventsToday.map(e => ({
        ...e,
        date: e.date ? new Date(e.date) : null,
        departure: e.departure ? new Date(e.departure) : null,
        arrival: e.arrival ? new Date(e.arrival) : null,
    })).filter(e => e.date); // Filter out any events that failed to parse
    
    const eventDate = new Date(date);

    try {
        let suggestedOperator: string | undefined;
        let suggestedCinematographer: string | undefined;
        let suggestedReporter: string | undefined;
        let suggestedProducer: string | undefined;
        
        if (location === "Deputados Aqui") {
            suggestedOperator = "Wilker Quirino";
            // Lógica de "Deputados Aqui" não parece se importar com turno, apenas rotação
            const assignedCines = new Set(eventsToday.map(e => e.cinematographicReporter).filter(Boolean));
            const availableCines = cinematographicReporters.filter(c => !assignedCines.has(c.name));
            suggestedCinematographer = availableCines.length > 0 ? availableCines[eventsToday.length % availableCines.length].name : cinematographicReporters[0]?.name;

            suggestedReporter = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'reporter');
            suggestedProducer = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'producer');
        } else {
             suggestedOperator = suggestTransmissionOperator(eventDate, location, operators, eventsToday);
             suggestedCinematographer = suggestCinematographicReporter(eventDate, cinematographicReporters, eventsToday);
             suggestedReporter = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'reporter');
             suggestedProducer = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'producer');
        }
        
        return {
            transmissionOperator: suggestedOperator,
            cinematographicReporter: suggestedCinematographer,
            reporter: suggestedReporter,
            producer: suggestedProducer,
            transmission: location === "Plenário Iris Rezende Machado" ? ["tv" as TransmissionType, "youtube" as TransmissionType] : ["youtube" as TransmissionType],
        };
    } catch (error) {
        console.error("An unexpected error occurred in suggestTeam logic:", error);
        throw new Error("Failed to suggest team due to an unexpected logic error.");
    }
};

    