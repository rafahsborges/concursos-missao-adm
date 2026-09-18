import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';

export interface DadosIA {
  questoes: Record<string, unknown>;
  dicas: Record<string, string>;
  explicacoes: Record<string, string>;
}
// conversa do tutor fica somente em memória (não persistida)
export const tutorMemoria: { quando: number; papel: 'user' | 'assistant'; texto: string }[] = [];

const ARQ = process.env.DADOS_IA_PATH ?? 'dados-ia.local.json';
let dados: DadosIA = { questoes: {}, dicas: {}, explicacoes: {} };
if (existsSync(ARQ)) {
  try {
    const lido = JSON.parse(readFileSync(ARQ, 'utf8')) as Partial<DadosIA>;
    dados = { questoes: lido.questoes ?? {}, dicas: lido.dicas ?? {}, explicacoes: lido.explicacoes ?? {} };
  } catch { /* arquivo corrompido: começa limpo */ }
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function salvar(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = ARQ + '.tmp';
    writeFileSync(tmp, JSON.stringify(dados));
    renameSync(tmp, ARQ); // rename atômico
  }, 300);
}
export const getDados = (): DadosIA => dados;
