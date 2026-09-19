import { useMemo, useState } from 'react';
import banco from '../data/banco.json';
import type { Questao } from '../types';
import { useProgresso, resetPerfil, usePerfis, exportarProgresso, importarProgresso, calcularStreak } from '../lib/store';
import { trpc, useAIStatus } from '../lib/trpc';

const Q = banco as Questao[];
const cor = (p: number): string => (p >= 70 ? 'var(--green)' : p >= 50 ? '#eab308' : 'var(--red)');

export default function Desempenho() {
  const prog = useProgresso();
  const ia = useAIStatus();
  const [resumoIA, setResumoIA] = useState('');
  const [aguardeIA, setAguardeIA] = useState(false);
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

  const simsEvo = useMemo(() => [...prog.simulados].reverse().slice(-10), [prog.simulados]);
  const conquistas = useMemo(() => {
    const resolvidas = Object.keys(prog.respostas).length;
    const disciplinasTocadas = new Set(
      Q.filter((q) => prog.respostas[q.id]).map((q) => q.disciplina)
    ).size;
    return [
      { nome: 'Primeira questão', ok: resolvidas >= 1 },
      { nome: '100 questões resolvidas', ok: resolvidas >= 100 },
      { nome: '7 dias seguidos de estudo', ok: calcularStreak(prog) >= 7 },
      { nome: 'Simulado com 70%+', ok: prog.simulados.some((s) => s.notaMax > 0 && s.nota / s.notaMax >= 0.7) },
      { nome: '10 simulados feitos', ok: prog.simulados.length >= 10 },
      { nome: 'Todas as disciplinas tocadas', ok: disciplinasTocadas >= 13 },
      { nome: 'Diagnóstico concluído', ok: Boolean(prog.diagnostico?.feito) },
    ];
  }, [prog]);

  const calor = useMemo(() => {
    const semanas: { data: string; ativo: boolean }[][] = [];
    const hoje = new Date();
    const ini = new Date(hoje);
    ini.setDate(ini.getDate() - 15 * 7);
    while (ini.getDay() !== 0) ini.setDate(ini.getDate() - 1); // começa num domingo
    for (let w = 0; w < 16; w++) {
      const semana: { data: string; ativo: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(ini);
        dt.setDate(ini.getDate() + w * 7 + d);
        const iso = dt.toISOString().slice(0, 10);
        semana.push({ data: iso, ativo: Boolean(prog.diasEstudo[iso]) && dt <= hoje });
      }
      semanas.push(semana);
    }
    return semanas;
  }, [prog.diasEstudo]);

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
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Evolução dos simulados</h3>
        {simsEvo.length === 0 && <p className="text-sm text-neutral-500">Faça simulados para ver a evolução.</p>}
        {simsEvo.length > 0 && (
          <svg viewBox="0 0 320 110" className="w-full max-w-lg">
            <line x1="10" y1="100" x2="310" y2="100" stroke="var(--line)" />
            <line x1="10" y1="10" x2="10" y2="100" stroke="var(--line)" />
            <text x="2" y="14" fontSize="8" fill="#888">100%</text>
            <text x="6" y="102" fontSize="8" fill="#888">0%</text>
            <polyline
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1.5"
              points={simsEvo
                .map((s, i) => {
                  const x = 10 + (i * 300) / Math.max(1, simsEvo.length - 1);
                  const y = 100 - (s.notaMax ? (s.nota / s.notaMax) * 90 : 0);
                  return x + ',' + y;
                })
                .join(' ')}
            />
            {simsEvo.map((s, i) => {
              const x = 10 + (i * 300) / Math.max(1, simsEvo.length - 1);
              const y = 100 - (s.notaMax ? (s.nota / s.notaMax) * 90 : 0);
              return (
                <circle key={s.id} cx={x} cy={y} r="2.5" fill="var(--ink)">
                  <title>{new Date(s.quando).toLocaleDateString('pt-BR') + ': ' + s.nota + '/' + s.notaMax}</title>
                </circle>
              );
            })}
          </svg>
        )}
        <div className="flex gap-6 mt-4 flex-wrap items-start">
          <div>
            <p className="eyebrow mb-2">Últimos 15 semanas</p>
            <div className="flex gap-[3px]">
              {calor.map((sem, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {sem.map((d) => (
                    <div
                      key={d.data}
                      title={d.data}
                      className="w-3 h-3 border border-[var(--line)]"
                      style={{ background: d.ativo ? 'var(--green)' : 'var(--paper-2)' }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="eyebrow mb-2">Conquistas</p>
            <div className="flex flex-wrap gap-2">
              {conquistas.map((c) => (
                <span
                  key={c.nome}
                  className={`text-xs border px-2 py-1 ${c.ok ? 'btn-ink' : 'text-neutral-400 border-[var(--line)]'}`}
                  title={c.ok ? 'Conquistada' : 'Ainda não'}
                >
                  {c.nome}
                </span>
              ))}
            </div>
            {ia?.disponivel && (
              <button
                className="text-sm mt-3"
                disabled={aguardeIA}
                onClick={() => {
                  setAguardeIA(true);
                  setResumoIA('');
                  const resumo = JSON.stringify({
                    disciplinas: porDisciplina,
                    simulados: prog.simulados.slice(0, 5).map((s) => ({ nota: s.nota, max: s.notaMax, modo: s.modo })),
                    streak: calcularStreak(prog),
                    resolvidas: Object.keys(prog.respostas).length,
                  });
                  trpc.resumoSemanal
                    .mutate({ resumo })
                    .then((r) => setResumoIA(r.resumo))
                    .catch(() => setResumoIA('IA indisponível no momento.'))
                    .finally(() => setAguardeIA(false));
                }}
              >
                {aguardeIA ? 'Gerando…' : 'Resumo semanal com IA'}
              </button>
            )}
          </div>
        </div>
        {(aguardeIA || resumoIA) && (
          <div className="bloco-ia mt-4 p-4">
            <p className="eyebrow mb-2">Resumo semanal — gerado por IA</p>
            <p className="text-sm whitespace-pre-wrap">{aguardeIA ? 'Analisando…' : resumoIA}</p>
          </div>
        )}
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
