/**
 * Applied to every outbound call this app makes to a third-party API (Gmail, GitHub, AI
 * providers) so a hung/slow external service can't stall a Dev Nexus request indefinitely —
 * previously none of these calls had any timeout at all. 20s comfortably covers a slower LLM
 * completion while still failing well before a browser's own request would time out.
 */
export const EXTERNAL_FETCH_TIMEOUT_MS = 20_000;
