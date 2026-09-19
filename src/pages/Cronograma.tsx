import { useMemo, useState } from 'react';
import { useRef } from 'react';
import banco from '../data/banco.json';
import type { Questao } from '../types';
import { gerarCronograma, fmtData } from '../lib/cronograma';
import { useProgresso, marcarCronograma } from '../lib/store';

const Q = banco as Questao[];

export default function Cronograma({
  irBanco,
  irSimulado,
}: {
  irBanco: (concurso: string, disciplina: string) => void;
  irSimulado: () => void;
}) {
  const concursos = useMemo(() => [...new Set(Q.map((q) => q.concurso))].sort(), []);
  const [concurso, setConcurso] = useState('');
  const [inicio, setInicio] = useState(new Date().toISOString().slice(0, 10));
  const prog = useProgresso();
  const erradas = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of Q) {
      const r = prog.respostas[q.id];
      if (r && r !== q.gabarito && !q.anulada) {
        const k = q.concurso + '|' + q.disciplina;
        m[k] = (m[k] ?? 0) + 1;
      }
    }
    return m;
  }, [prog.respostas]);
  const prioridade = useMemo(
    () => new Set(prog.diagnostico?.feito ? prog.diagnostico.fracas : []),
    [prog.diagnostico]
  );
  const plano = useMemo(() => gerarCronograma(concurso, inicio, erradas, prioridade), [concurso, inicio, erradas, prioridade]);

  const totalItens = plano.reduce((s, d) => s + d.itens.length, 0);
  const feitos = plano.reduce(
    (s, d) => s + d.itens.filter((i) => prog.cronograma[i.id]).length,
    0
  );
  const pct = totalItens ? Math.round((feitos / totalItens) * 100) : 0;
  const horasTotais = plano.reduce((s, d) => s + d.totalMin, 0) / 60;

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Cronograma · 3h/dia · revisões espaçadas em +1, +3, +7 e +14 dias</p>
      <h2 className="font-prova text-3xl font-semibold mb-4">Plano de estudo</h2>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <label className="eyebrow">Concurso:</label>
        <select value={concurso} onChange={(e) => setConcurso(e.target.value)}>
          <option value="">Todos os concursos</option>
          {concursos.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="eyebrow ml-2">Início:</label>
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>

      <div className="border border-[var(--line)] p-4 mb-6 max-w-md">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-prova font-semibold">Progresso do plano</span>
          <span>{feitos}/{totalItens} itens ({pct}%)</span>
        </div>
        <div className="barra">
          <div style={{ width: pct + '%', background: pct >= 70 ? 'var(--green)' : pct >= 50 ? '#eab308' : 'var(--red)' }} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {plano.length} dias · {horasTotais.toFixed(0)}h de estudo · cada dia tem no máximo 3h
        </p>
      </div>

      {plano.map((d) => {
        const feitosDia = d.itens.filter((i) => prog.cronograma[i.id]).length;
        return (
          <section key={d.dia} className="mb-6">
            <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-1 mb-2">
              <h3 className="font-prova text-lg font-semibold">
                Dia {d.dia + 1} · {fmtData(d.data)}
              </h3>
              <span className="eyebrow">
                {Math.floor(d.totalMin / 60)}h{String(d.totalMin % 60).padStart(2, '0')} · {feitosDia}/{d.itens.length}
              </span>
            </div>
            {d.itens.map((it) => {
              const feito = Boolean(prog.cronograma[it.id]);
              return (
                <div
                  key={it.id}
                  className={`flex flex-wrap items-center gap-2 sm:gap-3 border-b border-[var(--line)] py-2 ${feito ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={feito}
                    onChange={() => marcarCronograma(it.id)}
                    title={feito ? 'Desmarcar' : 'Marcar como concluído'}
                  />
                  <span className={`eyebrow w-16 ${it.tipo === 'estudo' ? '' : 'text-neutral-400'}`}>
                    {it.tipo === 'estudo' ? 'Estudo' : it.tipo === 'revisao' ? 'Revisão' : 'Simulado'}
                  </span>
                  <div className="flex-1">
                    <span className={`font-prova font-semibold ${feito ? 'line-through' : ''}`}>{it.disciplina}</span>
                    <span className="block text-xs text-neutral-500">
                      {it.concurso} · {Math.floor(it.duracaoMin / 60)}h ·{' '}
                      {it.tipo === 'simulado'
                        ? 'prova completa (modo oficial recomendado)'
                        : it.tipo === 'revisao' && it.erradas > 0
                        ? 'caderno de erros: ' + it.erradas + ' questão(ões) errada(s) para revisar'
                        : 'sugerido: ' + it.questoes + ' questões'}
                    </span>
                  </div>
                  {it.tipo === 'simulado' ? (
                    <button className="text-xs btn-ink" onClick={irSimulado}>Fazer simulado</button>
                  ) : (
                    <button className="text-xs" onClick={() => irBanco(it.concurso, it.disciplina)}>
                      Resolver questões
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
