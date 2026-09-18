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
  tipo: 'estudo' | 'revisao';
  disciplina: string;
  concurso: string;
  duracaoMin: number;
  questoes: number;
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

export function gerarCronograma(concurso: string, inicioISO: string): DiaCronograma[] {
  const base = dataBase(inicioISO);
  const topicosLista = topicos(concurso);
  const dataDoDia = (dia: number): string => {
    const d = new Date(base);
    d.setDate(d.getDate() + dia);
    return d.toISOString().slice(0, 10);
  };

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

    for (const p of elegiveis) {
      const dur = p.tipo === 'estudo' ? ESTUDO_MIN : REVISAO_MIN;
      if (dur > cap) continue;
      cap -= dur;
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
          : 15,
      });
      pendentes.splice(pendentes.indexOf(p), 1);
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
