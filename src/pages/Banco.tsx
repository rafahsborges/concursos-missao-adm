import { useEffect, useMemo, useState } from 'react';
import banco from '../data/banco.json';
import type { Questao } from '../types';
import QuestaoView from '../components/QuestaoView';
import { useProgresso, responder } from '../lib/store';
import { useAIStatus } from '../lib/trpc';

const Q = banco as Questao[];

interface Filtro { concurso: string; prova: string; disciplina: string; status: string; busca: string; anuladas: boolean; }

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function Banco({ preset }: { preset?: { concurso: string; disciplina: string } | null }) {
  useEffect(() => {
    if (preset) {
      setF({ concurso: preset.concurso, prova: '', disciplina: preset.disciplina, status: 'todas', busca: '', anuladas: false });
      setAtual(0);
    }
  }, [preset]);
  const [f, setF] = useState<Filtro>({ concurso: '', prova: '', disciplina: '', status: 'todas', busca: '', anuladas: false });
  const [atual, setAtual] = useState(0);
  const [corrigida, setCorrigida] = useState<Set<string>>(new Set());
  const prog = useProgresso();
  const ia = useAIStatus();

  const lista = useMemo(
    () =>
      Q.filter((q) => {
        if (f.concurso && q.concurso !== f.concurso) return false;
        if (f.prova && q.prova !== f.prova) return false;
        if (f.disciplina && q.disciplina !== f.disciplina) return false;
        if (!f.anuladas && q.anulada) return false;
        if (f.busca && !norm(q.enunciado).includes(norm(f.busca))) return false;
        const r = prog.respostas[q.id];
        if (f.status === 'nao' && r) return false;
        if (f.status === 'certas' && !(r && r === q.gabarito)) return false;
        if (f.status === 'erradas' && !(r && r !== q.gabarito)) return false;
        return true;
      }),
    [f, prog.respostas]
  );

  const opcoes = (campo: 'concurso' | 'prova' | 'disciplina'): string[] =>
    [...new Set(Q.map((x) => x[campo]))].sort();
  const q = lista[atual];

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Banco de questões · somente questões reais com gabarito oficial</p>
      <h2 className="font-prova text-3xl font-semibold mb-4">Resolver questões</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={f.concurso} onChange={(e) => { setF({ ...f, concurso: e.target.value, prova: '' }); setAtual(0); }}>
          <option value="">Concurso: todos</option>
          {opcoes('concurso').map((o) => (<option key={o}>{o}</option>))}
        </select>
        <select value={f.prova} onChange={(e) => { setF({ ...f, prova: e.target.value }); setAtual(0); }}>
          <option value="">Prova: todas</option>
          {opcoes('prova')
            .filter((o) => !f.concurso || Q.some((x) => x.prova === o && x.concurso === f.concurso))
            .map((o) => (<option key={o}>{o}</option>))}
        </select>
        <select value={f.disciplina} onChange={(e) => { setF({ ...f, disciplina: e.target.value }); setAtual(0); }}>
          <option value="">Disciplina: todas</option>
          {opcoes('disciplina').map((o) => (<option key={o}>{o}</option>))}
        </select>
        <select value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setAtual(0); }}>
          <option value="todas">Status: todas</option>
          <option value="nao">Não respondidas</option>
          <option value="certas">Acertadas</option>
          <option value="erradas">Erradas</option>
        </select>
        <input
          placeholder="Buscar no enunciado…"
          value={f.busca}
          onChange={(e) => { setF({ ...f, busca: e.target.value }); setAtual(0); }}
        />
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={f.anuladas} onChange={(e) => { setF({ ...f, anuladas: e.target.checked }); setAtual(0); }} />
          incluir anuladas
        </label>
      </div>
      <div className="flex flex-wrap gap-1 mb-6 max-h-28 overflow-y-auto">
        {lista.map((x, i) => {
          const r = prog.respostas[x.id];
          const cor = r == null ? 'bg-white' : x.anulada || r === x.gabarito ? 'alt-certa' : 'alt-errada';
          return (
            <button
              key={x.id}
              className={`w-9 h-8 text-xs ${cor} ${i === atual ? 'outline outline-2 outline-black' : ''}`}
              onClick={() => setAtual(i)}
            >
              {x.numero}
            </button>
          );
        })}
      </div>
      {q ? (
        <>
          <QuestaoView
            questao={q}
            modo="estudo"
            marcada={prog.respostas[q.id] ?? null}
            corrigida={corrigida.has(q.id)}
            onMarcar={(alt) => { if (!corrigida.has(q.id)) responder(q.id, alt); }}
            ia={ia?.disponivel ? { disponivel: true, mostrarDica: !corrigida.has(q.id), mostrarExplicar: corrigida.has(q.id) } : undefined}
          />
          <div className="flex gap-3">
            <button
              disabled={!prog.respostas[q.id] || corrigida.has(q.id)}
              className="btn-ink"
              onClick={() => setCorrigida(new Set(corrigida).add(q.id))}
            >
              Corrigir com gabarito oficial
            </button>
            <button disabled={atual === 0} onClick={() => setAtual(atual - 1)}>Anterior</button>
            <button disabled={atual >= lista.length - 1} onClick={() => setAtual(atual + 1)}>Próxima</button>
          </div>
          <p className="text-xs text-neutral-500 mt-3">{atual + 1} de {lista.length}</p>
        </>
      ) : (
        <p>Nenhuma questão com esses filtros.</p>
      )}
    </div>
  );
}
