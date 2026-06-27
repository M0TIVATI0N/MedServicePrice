import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";

const BASE = "https://invitro.kz";

const dispatcher = new Agent({
    connect: { rejectUnauthorized: false },
    connections: 10,
    keepAliveTimeout: 30000,
    bodyTimeout: 45000,
    headersTimeout: 15000
});

const HEADERS = {
    Accept: "text/html",
    "User-Agent": "Mozilla/5.0 (compatible; MedServicePriceBot/1.0)"
};

export interface InvitroOffice {
    id: string;
    name: string;
    address: string;
    location?: { lat: number; lng: number };
}

function parseCoords(html: string): Array<{ lat: number; lng: number }> {
    const out: Array<{ lat: number; lng: number }> = [];
    const seen = new Set<string>();

    for (const m of html.matchAll(/(\d{2}\.\d{4,})\s*,\s*(\d{2,3}\.\d{4,})/g)) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (lat < 40 || lat > 56 || lng < 46 || lng > 88) continue;
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ lat, lng });
    }

    return out;
}

export async function loadInvitroOffices(citySlug: string): Promise<InvitroOffice[]> {
    const url = `${BASE}/offices/${citySlug}/`;

    try {
        const res = await fetch(url, { dispatcher, headers: HEADERS });
        if (!res.ok) return [];

        const html = await res.text();
        const coords = parseCoords(html);
        const offices: InvitroOffice[] = [];
        const parts = html.split(/office-id="/).slice(1);

        parts.forEach((part, index) => {
            const id = part.match(/^(\d+)/)?.[1];
            if (!id) return;

            const $ = cheerio.load(`<div>${part.slice(0, 2500)}</div>`);
            const linkText = $(".offices_card__link").first().text().replace(/\s+/g, " ").trim();

            const addrMatch =
                part.match(/г\.\s*[А-Яа-яЁё\-]+,\s*[^<]{8,120}/)
                ?? part.match(/(?:ул\.|пр\.|просп|мкр)[^<]{8,120}/);

            const address = (addrMatch?.[0] ?? linkText ?? "").replace(/\s+/g, " ").trim();
            const name = linkText || `ИНВИТРО офис ${id}`;

            if (!address && !linkText) return;

            offices.push({
                id,
                name: name.startsWith("ИНВИТРО") ? name : `ИНВИТРО — ${name}`,
                address: address || name,
                location: coords[index]
            });
        });

        return offices;
    } catch {
        return [];
    }
}
