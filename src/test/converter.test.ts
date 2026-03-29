import { describe, it, expect } from 'vitest';
import { convertFile } from '../lib/converter';
import { FORMATS } from '../lib/formats';

const JSON_FORMAT = FORMATS.find(f => f.extension === 'json')!;
const CSV_FORMAT = FORMATS.find(f => f.extension === 'csv')!;

async function blobText(blob: Blob): Promise<string> {
  return blob.text();
}

describe('JSON → CSV conversion', () => {
  it('converts a simple array of objects', async () => {
    const input = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const file = new File([input], 'data.json', { type: 'application/json' });

    const result = await convertFile(file, JSON_FORMAT, CSV_FORMAT);
    const text = await blobText(result);

    expect(text).toContain('name,age');
    expect(text).toContain('Alice,30');
    expect(text).toContain('Bob,25');
  });

  it('escapes fields containing commas', async () => {
    const input = JSON.stringify([
      { city: 'New York, NY', population: 8336817 },
    ]);
    const file = new File([input], 'cities.json', { type: 'application/json' });

    const result = await convertFile(file, JSON_FORMAT, CSV_FORMAT);
    const text = await blobText(result);

    expect(text).toContain('"New York, NY"');
  });

  it('escapes fields containing double quotes', async () => {
    const input = JSON.stringify([
      { title: 'He said "hello"', id: 1 },
    ]);
    const file = new File([input], 'quotes.json', { type: 'application/json' });

    const result = await convertFile(file, JSON_FORMAT, CSV_FORMAT);
    const text = await blobText(result);

    expect(text).toContain('"He said ""hello"""');
  });

  it('rejects non-array JSON', async () => {
    const file = new File(['{"key": "value"}'], 'obj.json', { type: 'application/json' });
    await expect(convertFile(file, JSON_FORMAT, CSV_FORMAT)).rejects.toThrow('non-empty array');
  });

  it('rejects empty array', async () => {
    const file = new File(['[]'], 'empty.json', { type: 'application/json' });
    await expect(convertFile(file, JSON_FORMAT, CSV_FORMAT)).rejects.toThrow('non-empty array');
  });
});

describe('CSV → JSON conversion', () => {
  it('converts basic CSV to JSON array', async () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const file = new File([csv], 'data.csv', { type: 'text/csv' });

    const result = await convertFile(file, CSV_FORMAT, JSON_FORMAT);
    const parsed = JSON.parse(await blobText(result));

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ name: 'Alice', age: '30' });
    expect(parsed[1]).toEqual({ name: 'Bob', age: '25' });
  });

  it('handles quoted fields with commas', async () => {
    const csv = 'city,state\n"New York, NY",active\nLA,active';
    const file = new File([csv], 'cities.csv', { type: 'text/csv' });

    const result = await convertFile(file, CSV_FORMAT, JSON_FORMAT);
    const parsed = JSON.parse(await blobText(result));

    expect(parsed[0].city).toBe('New York, NY');
  });

  it('handles escaped double quotes in fields', async () => {
    const csv = 'title,id\n"He said ""hello""",1';
    const file = new File([csv], 'quotes.csv', { type: 'text/csv' });

    const result = await convertFile(file, CSV_FORMAT, JSON_FORMAT);
    const parsed = JSON.parse(await blobText(result));

    expect(parsed[0].title).toBe('He said "hello"');
  });

  it('handles Windows-style CRLF line endings', async () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const file = new File([csv], 'win.csv', { type: 'text/csv' });

    const result = await convertFile(file, CSV_FORMAT, JSON_FORMAT);
    const parsed = JSON.parse(await blobText(result));

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ a: '1', b: '2' });
  });

  it('rejects CSV with only a header row', async () => {
    const file = new File(['name,age'], 'header-only.csv', { type: 'text/csv' });
    await expect(convertFile(file, CSV_FORMAT, JSON_FORMAT)).rejects.toThrow('header row');
  });
});

describe('JSON ↔ CSV roundtrip', () => {
  it('preserves data through JSON → CSV → JSON', async () => {
    const original = [
      { name: 'Alice', score: '95' },
      { name: 'Bob', score: '87' },
    ];
    const jsonFile = new File([JSON.stringify(original)], 'data.json', { type: 'application/json' });

    const csvBlob = await convertFile(jsonFile, JSON_FORMAT, CSV_FORMAT);
    const csvFile = new File([csvBlob], 'data.csv', { type: 'text/csv' });

    const jsonBlob = await convertFile(csvFile, CSV_FORMAT, JSON_FORMAT);
    const roundtripped = JSON.parse(await blobText(jsonBlob));

    expect(roundtripped).toEqual(original);
  });
});
