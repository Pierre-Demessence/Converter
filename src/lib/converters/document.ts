import type { FormatInfo } from '../types';

export async function convertDocument(
  file: File,
  inputFormat: FormatInfo,
  outputFormat: FormatInfo,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  onProgress?.(20);

  const text = await file.text();
  onProgress?.(50);

  let result: string;

  if (inputFormat.extension === 'json' && outputFormat.extension === 'csv') {
    result = jsonToCsv(text);
  } else if (inputFormat.extension === 'csv' && outputFormat.extension === 'json') {
    result = csvToJson(text);
  } else {
    throw new Error(`Unsupported: ${inputFormat.label} → ${outputFormat.label}`);
  }

  onProgress?.(100);
  return new Blob([result], { type: outputFormat.mimeType });
}

function jsonToCsv(jsonStr: string): string {
  const data: unknown = JSON.parse(jsonStr);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('JSON must be a non-empty array of objects');
  }

  if (typeof data[0] !== 'object' || data[0] === null) {
    throw new Error('JSON array elements must be objects');
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);

  const escape = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = (data as Record<string, unknown>[]).map(
    row => headers.map(h => escape(row[h])).join(','),
  );

  return [headers.map(escape).join(','), ...rows].join('\n');
}

function csvToJson(csv: string): string {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).filter(line => line.trim().length > 0).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });

  return JSON.stringify(rows, null, 2);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
