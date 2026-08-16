import { pipeline } from "@huggingface/transformers";

/**
 * Local embeddings via transformers.js — runs entirely in-process inside the Next.js server
 * (Node.js runtime), using a small (~90MB) quantized ONNX model downloaded once from the
 * Hugging Face Hub and cached on disk thereafter. No separate application to install or run
 * (unlike Ollama, which this replaced after the user couldn't install it on a low-end machine),
 * no API key, no network dependency after the first download.
 */

const MODEL = "Xenova/all-MiniLM-L6-v2";

interface EmbeddingOutput {
  data: Float32Array;
}

/** Minimal shape for exactly what's used here — sidesteps fighting transformers.js's overloaded `pipeline()` return type. */
type FeatureExtractor = (text: string, options: { pooling: string; normalize: boolean }) => Promise<EmbeddingOutput>;

declare global {
  var _devNexusEmbeddingPipeline: Promise<FeatureExtractor> | undefined;
}

/** Cached on `global` (same pattern as the Mongo client/event bus) so dev-mode hot reload doesn't reload the model on every file change. */
function getExtractor(): Promise<FeatureExtractor> {
  if (!global._devNexusEmbeddingPipeline) {
    global._devNexusEmbeddingPipeline = (pipeline("feature-extraction", MODEL) as unknown as Promise<FeatureExtractor>).catch((err) => {
      // Don't leave a rejected promise cached — a failed first load (e.g. no network to
      // download the ~90MB model on first boot) would otherwise wedge every later call with
      // the same stale error until the process restarts. Clearing it lets the next call retry.
      global._devNexusEmbeddingPipeline = undefined;
      throw err;
    });
  }
  return global._devNexusEmbeddingPipeline;
}

/** Kicks off model loading without waiting on it — call once at server start so the first real search isn't the one paying for the download. */
export function warmUpEmbeddings(): void {
  // Errors are deliberately swallowed here — this is a best-effort warm-up, not a real call.
  // getExtractor() no longer caches a rejection, so the actual error (and a retry) happens
  // naturally the next time embedText() is called for real.
  getExtractor().catch(() => {});
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/** Assumes equal-length vectors from the same embedding model — mixing models/dimensions isn't supported. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
