import { useMemo } from 'react';
import banco from '../data/banco.json';
import type { Questao } from '../types';
import { useProgresso, resetPerfil, usePerfis, exportarProgresso, importarProgresso } from '../lib/store';

const Q = banco as Questao[];
const cor = (p: number): string => (p >= 70 ? 'var(--green)' : p >= 50 ? '#eab308' : 'var(--red)');

export default function Desempenho() {
  const prog = useProgresso();
  const { perfis, ativo } = usePerfis();

  const porDisciplina = useMemo(() => {
    const m = new Map<string, { total: number; certas: number }>();
    for (const q of Q) {
      const r = prog.respostas[q.id];
      if (!r) continue;
      const e = m.get(q.disciplina) ?? { total: 0, certas: 0 };
      e.total++;
      if (r === q.gabarito) e.certas++;
      m.set(q.disciplina, e);
    }
    return [...m.entries()]
      .map(([d, v]) => ({ d, ...v, pct: Math.round((v.certas / v.total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [prog.respostas]);

  const porConcurso = useMemo(
    () =>
      [...new Set(Q.map((q) => q.concurso))].map((c) => {
        const qs = Q.filter((q) => q.concurso === c);
        const resp = qs.filter((q) => prog.respostas[q.id]);
        const certas = resp.filter((q) => prog.respostas[q.id] === q.gabarito).length;
        return { c, total: qs.length, feitas: resp.length, pct: resp.length ? Math.round((certas / resp.length) * 100) : 0 };
      }),
    [prog.respostas]
  );

  const porBanca = useMemo(() => {
    const m = new Map<string, { total: number; certas: number }>();
    for (const q of Q) {
      const r = prog.respostas[q.id];
      if (!r) continue;
      const e = m.get(q.banca) ?? { total: 0, certas: 0 };
      e.total++;
      if (r === q.gabarito) e.certas++;
      m.set(q.banca, e);
    }
    return [...m.entries()]
      .map(([b, v]) => ({ b, ...v, pct: Math.round((v.certas / v.total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [prog.respostas]);

  const tempos = Object.values(prog.tempoQuestoes ?? {});
  const mediaSeg = tempos.length ? tempos.reduce((soma, t) => soma + t.seg, 0) / tempos.length : 0;

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Desempenho · somente banco oficial (questões IA não entram aqui)</p>
      <h2 className="font-prova text-3xl font-semibold mb-6">Estatísticas</h2>
      <section className="mb-8">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Resumo</h3>
        <p className="text-sm text-neutral-600 mb-1">
          Tempo médio por questão: {mediaSeg > 0 ? mediaSeg.toFixed(1) + 's' : '—'} ({tempos.length} questões cronometradas)
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              const blob = new Blob([exportarProgresso()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'progresso-reta-final.json';
              a.click();
            }}
          >
            Exportar progresso
          </button>
          <label className="text-sm border border-[var(--line)] px-3 py-1.5 cursor-pointer bg-white">
            Importar progresso…
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const rd = new FileReader();
                rd.onload = () => {
                  const erro = importarProgresso(String(rd.result));
                  alert(erro ?? 'Progresso importado com sucesso.');
                };
                rd.readAsText(f);
              }}
            />
          </label>
        </div>
      </section>
      <section className="mb-8">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Por disciplina</h3>
        {porDisciplina.length === 0 && <p className="text-sm text-neutral-500">Resolva questões no banco para ver estatísticas.</p>}
        {porDisciplina.map((r) => (
          <div key={r.d} className="mb-3">
            <div className="flex justify-between text-sm">
              <span className="font-prova font-semibold">{r.d}</span>
              <span>{r.certas}/{r.total} ({r.pct}%)</span>
            </div>
            <div className="barra mt-1"><div style={{ width: r.pct + '%', background: cor(r.pct) }} /></div>
          </div>
        ))}
      </section>
      <section className="mb-8">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Por concurso</h3>
        {porConcurso.map((r) => (
          <div key={r.c} className="mb-3">
            <div className="flex justify-between text-sm">
              <span className="font-prova font-semibold">{r.c}</span>
              <span>{r.feitas}/{r.total} resolvidas · {r.pct}% de acerto</span>
            </div>
            <div className="barra mt-1"><div style={{ width: r.pct + '%', background: cor(r.pct) }} /></div>
          </div>
        ))}
      </section>
      <section className="mb-8">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">
          Histórico de simulados ({prog.simulados.length}/100)
        </h3>
        {prog.simulados.length === 0 && <p className="text-sm text-neutral-500">Nenhum simulado registrado.</p>}
        {prog.simulados.map((s) => (
          <div key={s.id} className="flex justify-between text-sm border-b border-[var(--line)] py-2">
            <span className="font-prova">{s.concurso} — {s.prova}</span>
            <span>
              {new Date(s.quando).toLocaleDateString('pt-BR')} · nota {s.nota}/{s.notaMax} · {s.certas}C {s.erradas}E {s.brancas}B ·{' '}
              {Math.round(s.tempoSeg / 60)} min
            </span>
          </div>
        ))}
      </section>
      <button
        className="btn-red"
        onClick={() => {
          if (confirm('Zerar todo o progresso do perfil "' + (perfis.find((p) => p.id === ativo)?.nome ?? '') + '"?')) resetPerfil(ativo);
        }}
      >
        Resetar perfil ativo
      </button>
    </div>
  );
}
