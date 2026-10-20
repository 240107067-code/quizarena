import type { QuizApi } from './api';
import { mockApi } from './mockApi';
import { httpApi } from './httpApi';
declare const __API__: string;
/** Build-time switch (frontend/build.mjs): API=mock (iteration 1) or API=http (iteration 5). */
export const api: QuizApi = __API__ === 'http' ? httpApi : mockApi;
