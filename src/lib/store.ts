import { useEffect, useState } from 'react';
import type { Perfil, Progresso } from '../types';

const P_PERFIS = 'reta-final-perfis-v1';
const P_ATIVO = 'reta-final-perfil-ativo';
const P_PROG = 'reta-final-progresso-v1';
const LEGADO = 'missao-ti-progresso-v1';

function ler<T>(chave: string, padrao: T): T {
  try {
    const r = localStorage.getItem(chave);
    return r ? (JSON.parse(r) as T) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave: string, valor: unknown): void {
  localStorage.setItem(chave, JSON.stringify(valor));
  subscribers.forEach((f) => f());
}
function gravarSilencio(k: string, v: unknown): void {
  localStorage.setItem(k, JSON.stringify(v));
}

// migração do formato legado na primeira carga
if (!localStorage.getItem(P_PERFIS)) {
  const perfil: Perfil = { id: 'p1', nome: 'Meu perfil', criadoEm: Date.now() };
  gravarSilencio(P_PERFIS, [perfil]);
  gravarSilencio(P_ATIVO, 'p1');
  const legado = localStorage.getItem(LEGADO);
  if (legado) gravarSilencio(P_PROG + ':p1', JSON.parse(legado));
}
if (ler<Perfil[]>(P_PERFIS, []).length === 0) {
  gravarSilencio(P_PERFIS, [{ id: 'p1', nome: 'Meu perfil', criadoEm: Date.now() }]);
}
if (!localStorage.getItem(P_ATIVO)) gravarSilencio(P_ATIVO, 'p1');

type Listener = () => void;
const subscribers = new Set<Listener>();
export const onStore = (f: Listener): (() => void) => {
  subscribers.add(f);
  return () => {
    subscribers.delete(f);
  };
};

export const getPerfis = (): Perfil[] => ler<Perfil[]>(P_PERFIS, []);
export const getPerfilAtivo = (): string => ler<string>(P_ATIVO, 'p1');

export function criarPerfil(nome: string): void {
  const p: Perfil = { id: 'p' + Date.now(), nome, criadoEm: Date.now() };
  gravar(P_PERFIS, [...getPerfis(), p]);
  gravar(P_ATIVO, p.id);
}
export function selecionarPerfil(id: string): void {
  gravar(P_ATIVO, id);
}
export function renomearPerfil(id: string, nome: string): void {
  gravar(P_PERFIS, getPerfis().map((p) => (p.id === id ? { ...p, nome } : p)));
}
export function removerPerfil(id: string): void {
  const ps = getPerfis().filter((p) => p.id !== id);
  gravar(P_PERFIS, ps.length ? ps : [{ id: 'p1', nome: 'Meu perfil', criadoEm: Date.now() }]);
  if (getPerfilAtivo() === id) gravar(P_ATIVO, getPerfis()[0].id);
  localStorage.removeItem(P_PROG + ':' + id);
}
export function resetPerfil(id: string): void {
  gravarSilencio(P_PROG + ':' + id, JSON.stringify(vazio()));
  subscribers.forEach((f) => f());
}

export const vazio = (): Progresso => ({
  respostas: {}, respostasIA: {}, simulados: [], lidos: {}, cronograma: {},
  metas: { diaria: 20 }, diasEstudo: {}, tempoQuestoes: {},
  anotacoes: {}, bandeiras: {}, srs: {}, diagnostico: null, ultimoBackup: 0,
});
const SOMA_INTERVALO = [1, 3, 7, 14, 30]; // SM-2 simplificado

export function definirAnotacao(id: string, texto: string): void {
  const p = getProgresso();
  if (texto.trim()) p.anotacoes[id] = texto;
  else delete p.anotacoes[id];
  setProgresso(p);
}
export function toggleBandeira(id: string, tipo: string): void {
  const p = getProgresso();
  const atuais = new Set(p.bandeiras[id] ?? []);
  if (atuais.has(tipo)) atuais.delete(tipo);
  else atuais.add(tipo);
  if (atuais.size) p.bandeiras[id] = [...atuais];
  else delete p.bandeiras[id];
  setProgresso(p);
}
export function registrarSrs(id: string, acertou: boolean): void {
  const p = getProgresso();
  const hoje = new Date();
  if (acertou) {
    const atual = p.srs[id];
    if (!atual) return;
    const idx = Math.min(SOMA_INTERVALO.indexOf(atual.intervalo) + 1, SOMA_INTERVALO.length - 1);
    if (atual.intervalo >= 30) delete p.srs[id]; // graduada
    else {
      const due = new Date(hoje);
      due.setDate(due.getDate() + SOMA_INTERVALO[idx]);
      p.srs[id] = { due: due.toISOString().slice(0, 10), intervalo: SOMA_INTERVALO[idx] };
    }
  } else {
    const due = new Date(hoje);
    due.setDate(due.getDate() + 1);
    p.srs[id] = { due: due.toISOString().slice(0, 10), intervalo: 1 };
  }
  setProgresso(p);
}
export function registrarDiagnostico(fracas: string[]): void {
  const p = getProgresso();
  p.diagnostico = { feito: true, quando: Date.now(), fracas };
  setProgresso(p);
}
export function registrarBackup(): void {
  const p = getProgresso();
  p.ultimoBackup = Date.now();
  setProgresso(p);
}

// tema global
export type Tema = 'claro' | 'escuro' | 'contraste';
const ORDEM_TEMA: Tema[] = ['claro', 'escuro', 'contraste'];
export function getTema(): Tema {
  const t = localStorage.getItem('reta-final-tema');
  return t === 'escuro' || t === 'contraste' ? t : 'claro';
}
export function proximoTema(): Tema {
  const i = ORDEM_TEMA.indexOf(getTema());
  return ORDEM_TEMA[(i + 1) % ORDEM_TEMA.length];
}
export function aplicarTema(t: Tema): void {
  localStorage.setItem('reta-final-tema', t);
  document.documentElement.dataset.tema = t;
}
const hojeISO = (): string => new Date().toISOString().slice(0, 10);

export function registrarDiaEstudo(): void {
  const p = getProgresso();
  p.diasEstudo[hojeISO()] = Date.now();
  setProgresso(p);
}
export function registrarTempoQuestao(id: string, seg: number): void {
  const p = getProgresso();
  const a = p.tempoQuestoes[id];
  p.tempoQuestoes[id] = { seg: (a?.seg ?? 0) + seg, ts: Date.now() };
  p.diasEstudo[hojeISO()] = Date.now();
  setProgresso(p);
}
export function calcularStreak(p: Progresso): number {
  let streak = 0;
  const d = new Date();
  if (!p.diasEstudo[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1); // hoje ainda pode estar em andamento
  while (p.diasEstudo[d.toISOString().slice(0, 10)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
export function definirMeta(diaria: number): void {
  const p = getProgresso();
  p.metas = { diaria: Math.max(1, Math.min(500, Math.round(diaria))) };
  setProgresso(p);
}
export function exportarProgresso(): string {
  return JSON.stringify({ versao: 1, quando: Date.now(), progresso: getProgresso() }, null, 1);
}
export function importarProgresso(bruto: string): string | null {
  try {
    const dados = JSON.parse(bruto) as { versao?: number; progresso?: Partial<Progresso> };
    const p = dados.progresso ?? (dados as Partial<Progresso>);
    if (!p || typeof p !== 'object' || (!p.respostas && !p.simulados)) {
      return 'Arquivo inválido: não contém progresso exportado pelo sistema.';
    }
    setProgresso({ ...vazio(), ...p });
    return null;
  } catch {
    return 'Arquivo inválido: JSON malformado.';
  }
}
export function getProgresso(perfilId: string = getPerfilAtivo()): Progresso {
  return { ...vazio(), ...ler<Progresso>(P_PROG + ':' + perfilId, vazio()) };
}
export function setProgresso(p: Progresso, perfilId: string = getPerfilAtivo()): void {
  p.simulados = p.simulados.slice(0, 100);
  gravar(P_PROG + ':' + perfilId, p);
}
export function responder(idQuestao: string, alternativa: string): void {
  const p = getProgresso();
  p.respostas[idQuestao] = alternativa;
  setProgresso(p);
}
export function responderIA(idQuestao: string, alternativa: string): void {
  const p = getProgresso();
  p.respostasIA[idQuestao] = alternativa;
  setProgresso(p);
}
export function registrarSimulado(s: Progresso['simulados'][number]): void {
  const p = getProgresso();
  p.simulados = [s, ...p.simulados].slice(0, 100);
  setProgresso(p);
}
export function marcarCronograma(itemId: string): void {
  const p = getProgresso();
  if (p.cronograma[itemId]) delete p.cronograma[itemId];
  else p.cronograma[itemId] = Date.now();
  setProgresso(p);
}
export function marcarLido(capId: string): void {
  const p = getProgresso();
  p.lidos[capId] = Date.now();
  setProgresso(p);
}

export function useStore<T>(fn: () => T): T {
  const [v, setV] = useState<T>(fn);
  useEffect(() => onStore(() => setV(fn())), [fn]);
  return v;
}
export const usePerfis = () => useStore(() => ({ perfis: getPerfis(), ativo: getPerfilAtivo() }));
export const useProgresso = () => useStore(() => getProgresso());
