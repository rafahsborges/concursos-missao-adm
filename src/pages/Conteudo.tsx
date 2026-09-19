import { useEffect, useRef, useState } from 'react';
import type { CapituloConteudo } from '../types';
import { useProgresso, marcarLido } from '../lib/store';
import { trpc } from '../lib/trpc';

interface IndexConteudo {
  atualizadoEm: string | null;
  disciplinas: { slug: string; nome: string; capitulos: number; paragrafos: number }[];
  concursos: string[];
}

export default function Conteudo({ iaDisponivel }: { iaDisponivel: boolean }) {
  const [idx, setIdx] = useState<IndexConteudo | null>(null);
  const [cap, setCap] = useState<CapituloConteudo | null>(null);
  const [foco, setFoco] = useState<string>('todos');
  const [explicando, setExplicando] = useState<number | null>(null);
  const [txtIA, setTxtIA] = useState('');
  const prog = useProgresso();

  useEffect(() => {
    fetch('conteudo/index.json').then((r) => r.json()).then(setIdx);
  }, []);
  useEffect(() => {
    setCap(null);
  }, [foco]);

  // barra de progresso de leitura
  const [progLeitura, setProgLeitura] = useState(0);
  useEffect(() => {
    const h = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgLeitura(total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 0);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  if (!idx) return <p>Carregando…</p>;
  if (!idx.disciplinas.length) {
    return (
      <div className="fade-in">
        <div className="sticky top-0 z-10 bg-[var(--paper)] pt-1 pb-2 -mx-1 px-1">
        <div className="barra"><div style={{ width: progLeitura + '%', background: 'var(--ink)' }} /></div>
      </div>
      <p className="eyebrow mb-1">Conteúdo</p>
        <h2 className="font-prova text-3xl font-semibold mb-4">Apostilas</h2>
        <p className="text-neutral-600">
          Os conteúdos das apostilas ainda não foram importados. A estrutura está pronta:
          index.json + um arquivo por disciplina em public/conteudo/, com capítulos unificados
          entre edições, selo Presente em, complementos por concurso e Marcar como lido.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="sticky top-0 z-10 bg-[var(--paper)] pt-1 pb-2 -mx-1 px-1">
        <div className="barra"><div style={{ width: progLeitura + '%', background: 'var(--ink)' }} /></div>
      </div>
      <p className="eyebrow mb-1">Conteúdo</p>
      <h2 className="font-prova text-3xl font-semibold mb-4">Apostilas por disciplina</h2>
      <div className="flex gap-2 mb-6 items-center">
        <label className="eyebrow">Filtrar por concurso:</label>
        <select value={foco} onChange={(e) => setFoco(e.target.value)}>
          <option value="todos">Todos</option>
          {idx.concursos.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {idx.disciplinas.map((d) => (
          <button
            key={d.slug}
            className="text-left p-3"
            onClick={() => fetch('conteudo/' + d.slug + '.json').then((r) => r.json()).then(setCap)}
          >
            <span className="font-prova font-semibold">{d.nome}</span>
            <span className="block text-xs text-neutral-500 mt-1">{d.capitulos} capítulos · {d.paragrafos} parágrafos</span>
          </button>
        ))}
      </div>
      {cap && (
        <section>
          <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4">
            <h3 className="font-prova text-2xl font-semibold">{cap.titulo}</h3>
            <div className="flex gap-3 items-center">
              <span className="eyebrow">Presente em: {cap.concursos.join(' · ')}</span>
              <button className="text-xs" disabled={Boolean(prog.lidos[cap.id])} onClick={() => marcarLido(cap.id)}>
                {prog.lidos[cap.id] ? 'Lido' : 'Marcar como lido'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="eyebrow self-center">Sumário:</span>
            {cap.secoes.map((s, i) => (
              <button
                key={i}
                className="text-xs"
                onClick={() => document.getElementById('secao-' + i)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {s.titulo.length > 42 ? s.titulo.slice(0, 42) + '…' : s.titulo}
              </button>
            ))}
          </div>
          {cap.secoes.map((s, i) => (
            <details key={i} id={'secao-' + i} className="mb-4 border-b border-[var(--line)] pb-3" open={i < 2}>
              <summary className="cursor-pointer font-prova font-semibold text-[1.05rem]">
                {s.titulo}
              </summary>
              {s.paragrafos.map((p, j) => (
                <p key={j} className="font-prova text-[1.02rem] leading-relaxed mt-2">{p}</p>
              ))}
              {iaDisponivel && (
                <button
                  className="hl-link border-0 bg-transparent text-sm mt-1"
                  onClick={() => {
                    setExplicando(i);
                    setTxtIA('');
                    trpc.explicarSecao
                      .mutate({ titulo: s.titulo, trecho: s.paragrafos.join('\n').slice(0, 8000) })
                      .then((r) => setTxtIA(r.explicacao))
                      .catch(() => setTxtIA('IA indisponível.'));
                  }}
                >
                  Explicar esta seção com IA
                </button>
              )}
              {explicando === i && (
                <div className="bloco-ia p-4 mt-2">
                  <p className="eyebrow mb-2">Explicação — gerada por IA</p>
                  <p className="text-sm whitespace-pre-wrap">{txtIA || 'Gerando…'}</p>
                </div>
              )}
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
