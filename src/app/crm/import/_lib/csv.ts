/**
 * Минимал CSV parser. Quoted fields, escaped quote (""), CRLF/LF дэмжинэ.
 * HubSpot exports-д хангалттай.
 */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }
            cell += ch;
            i++;
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            i++;
            continue;
        }
        if (ch === ',') {
            row.push(cell);
            cell = '';
            i++;
            continue;
        }
        if (ch === '\r') {
            // \r\n
            i++;
            if (text[i] === '\n') i++;
            row.push(cell);
            cell = '';
            rows.push(row);
            row = [];
            continue;
        }
        if (ch === '\n') {
            row.push(cell);
            cell = '';
            rows.push(row);
            row = [];
            i++;
            continue;
        }

        cell += ch;
        i++;
    }
    // Сүүлчийн мөр
    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    // Хоосон мөрүүдийг устгах
    return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface CsvParsed {
    headers: string[];
    rows: Record<string, string>[];
}

export function parseCsvWithHeaders(text: string): CsvParsed {
    const rows = parseCsv(text);
    if (rows.length === 0) return { headers: [], rows: [] };
    const headers = rows[0].map((h) => h.trim());
    const data = rows.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            obj[h] = (r[idx] ?? '').trim();
        });
        return obj;
    });
    return { headers, rows: data };
}
