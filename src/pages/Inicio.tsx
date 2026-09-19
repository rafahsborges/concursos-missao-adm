import banco from '../data/banco.json';
import type { Questao, Modulo } from '../types';
import { CONCURSOS } from '../data/concursos';
import { useProgresso, calcularStreak, definirMeta, registrarBackup } from '../lib/store';

const Q = banco as Questao[];

export default function Inicio({ ir }: { ir: (m: Modulo) => void }) {
  const prog = useProgresso();
  const resolvidas = Object.keys(prog.respostas).length;
  const streak = calcularStreak(prog);
  const meta = prog.metas?.diaria ?? 20;
  const hoje = new Date().toISOString().slice(0, 10);
  const hojeCount = Object.values(prog.tempoQuestoes ?? {}).filter(
    (t) => new Date(t.ts).toISOString().slice(0, 10) === hoje
  ).length;
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
      {!prog.diagnostico?.feito && resolvidas < 10 && (
        <div className="border border-[var(--line)] p-4 mb-6 max-w-md">
          <p className="font-prova font-semibold mb-1">Diagnóstico inicial</p>
          <p className="text-sm text-neutral-600 mb-2">
            Responda 15 questões sorteadas de todas as matérias para calibrar seu cronograma (as matérias mais
            fracas entram primeiro no plano).
          </p>
          <button
            className="btn-ink text-sm"
            onClick={() => {
              sessionStorage.setItem('rf-diagnostico', '1');
              ir('simulado');
            }}
          >
            Fazer diagnóstico agora
          </button>
        </div>
      )}
      {Date.now() - (prog.ultimoBackup ?? 0) > 7 * 24 * 3600 * 1000 && (
        <div className="border border-[var(--line)] p-4 mb-6 max-w-md text-sm">
          <span className="text-neutral-600">
            Faz mais de 7 dias desde seu último backup do progresso.{' '}
          </span>
          <button
            className="text-xs"
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify({ versao: 1, quando: Date.now(), progresso: prog }, null, 1)],
                { type: 'application/json' }
              );
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'progresso-reta-final.json';
              a.click();
              registrarBackup();
            }}
          >
            Exportar agora
          </button>
        </div>
      )}
      <div className="flex gap-6 mt-8 flex-wrap items-center">
        <button className="btn-ink" onClick={() => ir('banco')}>Continuar no banco de questões</button>
        <button onClick={() => ir('simulado')}>Fazer um simulado</button>
        <div className="border border-[var(--line)] p-4 text-sm">
          <div className="flex items-baseline gap-6 flex-wrap">
            <span className="font-prova font-semibold text-lg">{streak} dia(s) seguidos de estudo</span>
            <span>Meta diária: {meta} questões</span>
            <span>Hoje: {hojeCount}/{meta}</span>
            <div className="barra flex-1 min-w-[120px]">
              <div style={{ width: Math.min(100, Math.round((hojeCount / meta) * 100)) + '%', background: 'var(--green)' }} />
            </div>
            <button
              className="text-xs"
              onClick={() => {
                const n = prompt('Meta diária de questões (atual: ' + meta + '):');
                if (n && !isNaN(Number(n))) definirMeta(Number(n));
              }}
            >
              Definir meta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
