export const SOURCES = [
    { id: "KDL", label: "KDL", prefix: "kdl-" },
    { id: "DOQ", label: "DOQ", prefix: "doq-" },
    { id: "INVITRO", label: "ИНВИТРО", prefix: "invitro-" },
    { id: "HELIX", label: "Helix", prefix: "helix-" },
    { id: "GEMOTEST", label: "Гемотест", prefix: "gemotest-" }
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

export function sourceFromClinicId(clinicId: string): SourceId | null {
    for (const s of SOURCES) {
        if (clinicId.startsWith(s.prefix)) return s.id;
    }
    return null;
}

export function sourceClinicFilter(source: string): Record<string, unknown> | null {
    const entry = SOURCES.find(s => s.id === source.toUpperCase());
    if (!entry) return null;
    return {
        $or: [
            { clinic_id: { $regex: `^${entry.prefix}` } },
            { source: entry.id }
        ]
    };
}

export function sourcesClinicFilter(sourceIds: string[]): Record<string, unknown> | null {
    const prefixes: string[] = [];
    const ids: string[] = [];

    for (const id of sourceIds) {
        const entry = SOURCES.find(s => s.id === id.toUpperCase());
        if (entry) {
            prefixes.push(entry.prefix);
            ids.push(entry.id);
        }
    }

    if (!prefixes.length) return null;

    const orClauses: Record<string, unknown>[] = [
        ...prefixes.map(p => ({ clinic_id: { $regex: `^${p}` } })),
        ...ids.map(id => ({ source: id }))
    ];

    if (orClauses.length === 1) return orClauses[0];
    return { $or: orClauses };
}
