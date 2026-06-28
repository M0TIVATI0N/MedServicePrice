export const SOURCES = [
    { id: "KDL", label: "KDL", prefix: "kdl" },
    { id: "DOQ", label: "DOQ", prefix: "doq" },
    { id: "INVITRO", label: "ИНВИТРО", prefix: "invitro" },
    { id: "HELIX", label: "Helix", prefix: "helix" },
    { id: "GEMOTEST", label: "Гемотест", prefix: "gemotest" }
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

/**
 * Detect source from clinic_id.
 *
 * Supports:
 *   kdl22
 *   KDL22
 *   kdl-22
 *   KDL-22
 */
export function sourceFromClinicId(clinicId: string): SourceId | null {
    if (!clinicId) return null;

    const normalized = clinicId.trim().toLowerCase();

    for (const s of SOURCES) {
        if (
            normalized.startsWith(s.prefix) ||
            normalized.startsWith(`${s.prefix}-`)
        ) {
            return s.id;
        }
    }

    return null;
}

/**
 * Mongo filter for a single source.
 */
export function sourceClinicFilter(
    source: string
): Record<string, unknown> | null {
    const entry = SOURCES.find(
        s => s.id === source.trim().toUpperCase()
    );

    if (!entry) return null;

    return {
        $or: [
            {
                clinic_id: {
                    $regex: `^${entry.prefix}-?`,
                    $options: "i"
                }
            },
            {
                source: entry.id
            }
        ]
    };
}

/**
 * Mongo filter for multiple sources.
 */
export function sourcesClinicFilter(
    sourceIds: string[]
): Record<string, unknown> | null {

    const orClauses: Record<string, unknown>[] = [];

    for (const id of sourceIds) {
        const entry = SOURCES.find(
            s => s.id === id.trim().toUpperCase()
        );

        if (!entry) continue;

        orClauses.push({
            clinic_id: {
                $regex: `^${entry.prefix}-?`,
                $options: "i"
            }
        });

        orClauses.push({
            source: entry.id
        });
    }

    if (!orClauses.length) {
        return null;
    }

    if (orClauses.length === 1) {
        return orClauses[0];
    }

    return {
        $or: orClauses
    };
}