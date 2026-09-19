import { useState } from 'react';
import type { Questao } from '../types';
import { trpc } from '../lib/trpc';
import { temaDe } from '../lib/tags';

export interface IAProps {
  disponivel: boolean;
  mostrarDica: boolean;      // banco/revisão
  mostrarExplicar: boolean;  // após correção/revisão
}
interface Props {
  questao: Questao;
  modo: 'estudo' | 'simulado' | 'revisao';
  marcada: string | null;           // resposta do usuário
  corrigida: boolean;               // exibe verde/vermelho
  onMarcar?: (alt: string) => void; // estudo/simulado
  ia?: IAProps;
}
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

export default function QuestaoView({ questao: q, modo, marcada, corrigida, onMarcar, ia }: Props) {
  const [iaTxt, setIaTxt] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const alts = q.tipo === 'certo_errado' ? { C: 'Certo', E: 'Errado' } : (q.alternativas ?? {});
  const letras = q.tipo === 'certo_errado' ? ['C', 'E'] : LETRAS.slice(0, Object.keys(alts).length);

  const chamarIA = (fn: () => Promise<{ dica?: string; explicacao?: string }>) => {
    setCarregando(true);
    setIaTxt(null);
    fn()
      .then((r) => setIaTxt(r.dica ?? r.explicacao ?? ''))
      .catch(() => setIaTxt('IA indisponível no momento.'))
      .finally(() => setCarregando(false));
  };

  return (
    <article className="fade-in border-b border-[var(--line)] pb-6 mb-6">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="eyebrow">
          {q.disciplina}{temaDe(q) ? ' · ' + temaDe(q) : ''} · {q.banca} {q.ano} · Questão {q.numero}
        </span>
        {q.anulada && <span className="selo-anulada">ANULADA</span>}
      </div>
      {q.contexto && <p className="font-prova text-sm italic text-neutral-600 mb-2">Texto-base: {q.contexto}</p>}
      <p className="font-prova text-[1.05rem] leading-relaxed mb-4">{q.enunciado}</p>
      <div className="space-y-1">
        {letras.map((l) => {
          const certa = corrigida && q.gabarito === l;
          const errada = corrigida && marcada === l && marcada !== q.gabarito;
          const sel = marcada === l && !corrigida;
          const podeMarcar = !corrigida && modo !== 'revisao' && !q.anulada;
          return (
            <button
              key={l}
              disabled={!podeMarcar}
              onClick={() => onMarcar?.(l)}
              className={`w-full text-left px-3 py-2 flex gap-3 ${certa ? 'alt-certa' : ''} ${errada ? 'alt-errada' : ''} ${sel ? 'alt-marca' : ''}`}
            >
              <span className="font-prova font-semibold">({l})</span>
              <span className="font-prova">{alts[l]}</span>
              {certa && <span className="ml-auto text-xs font-bold" style={{ color: 'var(--green)' }}>gabarito</span>}
              {errada && <span className="ml-auto text-xs font-bold" style={{ color: 'var(--red)' }}>sua resposta</span>}
            </button>
          );
        })}
      </div>
      {corrigida && q.anulada && <p className="eyebrow mt-3">Item anulado pela banca — não pontua.</p>}
      {ia?.disponivel && modo !== 'simulado' && (
        <div className="flex gap-3 mt-3">
          {ia.mostrarDica && (
            <button
              className="hl-link border-0 bg-transparent text-sm"
              disabled={carregando}
              onClick={() =>
                chamarIA(() =>
                  trpc.dicaQuestao.mutate({ id: q.id, enunciado: q.enunciado, disciplina: q.disciplina }))
              }
            >
              Pedir dica à IA
            </button>
          )}
          {ia.mostrarExplicar && (
            <button
              className="hl-link border-0 bg-transparent text-sm"
              disabled={carregando}
              onClick={() =>
                chamarIA(() =>
                  trpc.explicarQuestao.mutate({
                    id: q.id,
                    enunciado: q.enunciado,
                    gabarito: q.gabarito,
                    anulada: q.anulada,
                    disciplina: q.disciplina,
                  }))
              }
            >
              Explicar gabarito com IA
            </button>
          )}
        </div>
      )}
      {(carregando || iaTxt) && (
        <div className="bloco-ia mt-3 p-4">
          <p className="eyebrow mb-2">Explicação — gerada por IA</p>
          <p className="text-sm whitespace-pre-wrap">{carregando ? 'Gerando…' : iaTxt}</p>
        </div>
      )}
    </article>
  );
}
