export interface TransformedIncidents {
    metadata: Record<string, string[]>;
    fullTimeScore: {
        homeScore: number;
        awayScore: number;
    };
    halfTimeScore: {
        homeScore: number;
        awayScore: number;
    };
    home: TeamIncidentSummary;
    away: TeamIncidentSummary;
}

export interface TeamIncidentSummary {
    points: number;
    result: string;
    goalFor: number;
    goalAgainst: number;
    incidents: {
        goal: GoalIncident[];
        assist: AssistIncident[];
        card: CardIncident[];
        injury: InjuryIncident[];
        penalty: PenaltyIncident[];
    };
}

export interface GoalIncident {
    id: number | null;
    name: string;
    incidentClass: string;
    time: string;
    footballPassingNetworkAction?: unknown;
}

export interface AssistIncident {
    id: number;
    name: string;
}

export interface CardIncident {
    id: number;
    name: string;
    time: string;
    incidentType: string;
    incidentClass: string;
    reason: string;
}

export interface InjuryIncident {
    id: number;
    name: string;
    time: string;
    incidentClass: string;
}

export interface PenaltyIncident {
    id?: number;
    name?: string;
    time: string;
    incidentClass: string;
    incidentType: string;
    description: string;
    reason: string;
    GK?: true;
}
