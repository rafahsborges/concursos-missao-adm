import banco from '../data/banco.json';
import type { Questao, Modulo } from '../types';
import { CONCURSOS } from '../data/concursos';
import { useProgresso } from '../lib/store';

const Q = banco as Questao[];

export default function Inicio({ ir }: { ir: (m: Modulo) => void }) {
  const prog = useProgresso();
  const resolvidas = Object.keys(prog.respostas).length;
  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Dashboard</p>
      <h2 className="font-prova text-3xl font-semibold mb-6">Sua trilha de concursos</h2>
      <div className="grid gap-6">
        {CONCURSOS.map((c) => {
          const qs = Q.filter((q) => q.concurso === c.nome);
          const feitas = qs.filter((q) => prog.respostas[q.id]).length;
          const pct = qs.length ? Math.round((feitas / qs.length) * 100) : 0;
          return (
            <section key={c.nome} className="border-b border-[var(--line)] pb-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h3 className="font-prova text-xl font-semibold">{c.nome} — {c.cargo}</h3>
                <span className="eyebrow">{c.banca} · {qs.length} questões</span>
              </div>
              <p className="text-sm text-neutral-600 mt-1">{c.formato} · {c.regra}</p>
              <div className="barra mt-3 max-w-md">
                <div style={{ width: pct + '%', background: pct >= 70 ? 'var(--green)' : pct >= 50 ? '#eab308' : 'var(--red)' }} />
              </div>
              <p className="text-xs mt-1 text-neutral-600">{feitas}/{qs.length} resolvidas ({pct}%) · {c.provas.join(' · ')}</p>
            </section>
          );
        })}
      </div>
      <div className="flex gap-6 mt-8 flex-wrap items-center">
        <button className="btn-ink" onClick={() => ir('banco')}>Continuar no banco de questões</button>
        <button onClick={() => ir('simulado')}>Fazer um simulado</button>
        <span className="text-sm text-neutral-600">
          {Q.length} questões reais no banco · {resolvidas} resolvidas · {prog.simulados.length} simulados
        </span>
      </div>
    </div>
  );
}
