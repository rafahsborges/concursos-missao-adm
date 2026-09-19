import banco from '../data/banco.json';
import type { Questao } from '../types';

const Q = banco as Questao[];

// espaçamento: revisões em +1, +3, +7 e +14 dias após o estudo
const REVISOES = [1, 3, 7, 14];
export const DIA_MIN = 180;   // 3h por dia
const ESTUDO_MIN = 120;       // 2h: teoria/apostila + questões
const REVISAO_MIN = 60;       // 1h: revisão espaçada + questões erradas
const ANTECIPA_DIAS = 1;      // permite revisar 1 dia antes se houver espaço

export interface Topico {
  concurso: string;
  disciplina: string;
  total: number; // questões disponíveis
}

export interface ItemCronograma {
  id: string;
  dia: number;
  data: string; // ISO
  tipo: 'estudo' | 'revisao' | 'simulado';
  disciplina: string;
  concurso: string;
  duracaoMin: number;
  questoes: number;
  erradas: number; // questões erradas pendentes da revisão
}

export interface DiaCronograma {
  dia: number;
  data: string;
  itens: ItemCronograma[];
  totalMin: number;
}

export function topicos(concurso: string): Topico[] {
  const m = new Map<string, number>();
  for (const q of Q) {
    if (concurso && q.concurso !== concurso) continue;
    const k = q.concurso + '|' + q.disciplina;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([k, total]) => {
      const i = k.indexOf('|');
      return { concurso: k.slice(0, i), disciplina: k.slice(i + 1), total };
    })
    .sort((a, b) => a.concurso.localeCompare(b.concurso) || b.total - a.total);
}

function dataBase(inicioISO: string): Date {
  const d = new Date(inicioISO + 'T09:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function ehDiaUtil(d: Date): boolean {
  return d.getDay() !== 0 && d.getDay() !== 6; // sem sábado e domingo
}

function proximoDiaUtil(d: Date): Date {
  const r = new Date(d);
  while (!ehDiaUtil(r)) r.setDate(r.getDate() + 1);
  return r;
}

function addDiasUteis(base: Date, n: number): Date {
  const d = new Date(base);
  let restam = n;
  while (restam > 0) {
    d.setDate(d.getDate() + 1);
    if (ehDiaUtil(d)) restam--;
  }
  return d;
}

export function gerarCronograma(concurso: string, inicioISO: string, erradasPorTopico?: Record<string, number>, prioridade?: Set<string>): DiaCronograma[] {
  const base = proximoDiaUtil(dataBase(inicioISO));
  let topicosLista = topicos(concurso);
  if (prioridade && prioridade.size > 0) {
    topicosLista = [...topicosLista].sort((a, b) =>
      (prioridade.has(a.disciplina) ? 0 : 1) - (prioridade.has(b.disciplina) ? 0 : 1));
  }
  const dataDoDia = (dia: number): string => addDiasUteis(base, dia).toISOString().slice(0, 10);

  interface Pendente { topico: Topico; tipo: 'estudo' | 'revisao'; due: number; }
  const pendentes: Pendente[] = topicosLista.map((topico) => ({ topico, tipo: 'estudo' as const, due: 0 }));
  const dias: DiaCronograma[] = [];
  let protecao = 0;

  while (pendentes.length > 0 && protecao < 2000) {
    protecao++;
    const diaIdx = dias.length;
    const itens: ItemCronograma[] = [];
    let cap = DIA_MIN;

    const elegiveis = pendentes
      .filter((p) => p.due <= diaIdx + ANTECIPA_DIAS)
      .sort((a, b) =>
        a.tipo === b.tipo ? a.due - b.due : a.tipo === 'revisao' ? -1 : 1);

    // simulado semanal: a cada 5 dias úteis, sexta-feira de prova completa (3h)
    if (diaIdx % 5 === 4) {
      itens.push({
        id: 'SIMULADO|' + diaIdx,
        dia: diaIdx,
        data: dataDoDia(diaIdx),
        tipo: 'simulado',
        disciplina: concurso || 'Todos os concursos',
        concurso: concurso || 'Todos os concursos',
        duracaoMin: DIA_MIN,
        questoes: 0,
        erradas: 0,
      });
      cap = 0;
    }
    const chavesDoDia = new Set<string>(); // impede repetição da mesma matéria no mesmo dia
    for (const p of elegiveis) {
      const chave = p.topico.concurso + '|' + p.topico.disciplina;
      if (chavesDoDia.has(chave)) continue;
      const dur = p.tipo === 'estudo' ? ESTUDO_MIN : REVISAO_MIN;
      if (dur > cap) continue;
      cap -= dur;
      const chaveTopico = p.topico.concurso + '|' + p.topico.disciplina;
      const erradas = erradasPorTopico?.[chaveTopico] ?? 0;
      itens.push({
        id: p.topico.concurso + '|' + p.topico.disciplina + '|' + p.tipo + '|' + diaIdx,
        dia: diaIdx,
        data: dataDoDia(diaIdx),
        tipo: p.tipo,
        disciplina: p.topico.disciplina,
        concurso: p.topico.concurso,
        duracaoMin: dur,
        questoes: p.tipo === 'estudo'
          ? Math.max(10, Math.min(30, Math.round(p.topico.total * 0.15)))
          : (erradas > 0 ? Math.min(erradas, 20) : 15),
        erradas,
      });
      pendentes.splice(pendentes.indexOf(p), 1);
      chavesDoDia.add(chave);
      if (p.tipo === 'estudo') {
        for (const r of REVISOES) {
          pendentes.push({ topico: p.topico, tipo: 'revisao', due: diaIdx + r });
        }
      }
    }
    dias.push({ dia: diaIdx, data: dataDoDia(diaIdx), itens, totalMin: DIA_MIN - cap });
    if (itens.length === 0 && pendentes.every((p) => p.due > diaIdx + ANTECIPA_DIAS)) {
      // nada elegível hoje: avança o dia (revisões futuras)
      continue;
    }
  }
  return dias;
}

export function fmtData(iso: string): string {
  return new Date(iso + 'T09:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}
