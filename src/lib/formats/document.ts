import type { FormatInfo } from '../types';

export const DOCUMENT_FORMATS: FormatInfo[] = [
  { extension: 'json', mimeType: 'application/json', category: 'document', label: 'JSON', converterHint: 'document' },
  { extension: 'csv', mimeType: 'text/csv', category: 'document', label: 'CSV', converterHint: 'document' },
];
