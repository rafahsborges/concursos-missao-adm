export interface Msg { role: 'system' | 'user' | 'assistant'; content: string; }

const MOCK = process.env.AI_MOCK === '1';
const BASE = process.env.DEFAULT_AI_BASE_URL ?? '';
const KEY = process.env.DEFAULT_AI_API_KEY ?? '';
const MODEL = process.env.DEFAULT_AI_MODEL ?? 'gpt-4o-mini';

export async function disponivel(): Promise<boolean> {
  if (MOCK) return true;
  return Boolean(BASE && KEY);
}

export async function chat(system: string, user: string): Promise<string> {
  if (MOCK) {
    return '[MOCK — IA desativada]\n\nPara: ' + user.slice(0, 120) +
      '...\n\nAqui viria a resposta do modelo "' + MODEL +
      '" no tom de professor de concursos, sem emojis, sem contestar o gabarito oficial.';
  }
  const r = await fetch(BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error('IA indisponível: ' + r.status);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return j.choices[0].message.content;
}
