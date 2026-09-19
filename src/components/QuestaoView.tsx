import { useState } from 'react';
import type { Questao } from '../types';
import { trpc } from '../lib/trpc';
import { temaDe } from '../lib/tags';
import contextos from '../data/contextos.json';

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
  const tema = temaDe(q);
  const podeMarcar = !corrigida && modo !== 'revisao' && !q.anulada;
  const [verTexto, setVerTexto] = useState(false);
  const textoBase = q.contexto ? (contextos as Record<string, string>)[q.contexto] : undefined;

  const acertou = corrigida && !q.anulada && marcada !== null && marcada === q.gabarito;
  const errou = corrigida && !q.anulada && marcada !== null && marcada !== q.gabarito;

  const chamarIA = (fn: () => Promise<{ dica?: string; explicacao?: string }>) => {
    setCarregando(true);
    setIaTxt(null);
    fn()
      .then((r) => setIaTxt(r.dica ?? r.explicacao ?? ''))
      .catch(() => setIaTxt('IA indisponível no momento.'))
      .finally(() => setCarregando(false));
  };

  return (
    <article className="fade-in pb-8 mb-2">
      {/* cartão do enunciado */}
      <div className="q-card">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="q-chip">{q.disciplina}</span>
          {tema && <span className="q-chip-2 tema">{tema}</span>}
          <span className="q-chip-2">{q.banca} · {q.ano}</span>
          {q.anulada && <span className="selo-anulada">ANULADA</span>}
          <span className="ml-auto q-num">{q.numero}</span>
        </div>
        {textoBase ? (
          <div className="q-contexto" style={{ margin: '0 0 1rem' }}>
            <button
              className="text-xs border-0 bg-transparent p-0 underline underline-offset-2"
              onClick={() => setVerTexto(!verTexto)}
            >
              {verTexto ? 'Ocultar texto-base' : 'Mostrar texto-base (' + q.contexto + ')'}
            </button>
            {verTexto && (
              <p className="mt-2 not-italic text-[0.95rem] leading-relaxed" style={{ fontStyle: 'normal' }}>
                {textoBase}
              </p>
            )}
          </div>
        ) : (
          q.contexto && <p className="q-contexto">Texto-base: {q.contexto}</p>
        )}
        {q.tipo === 'certo_errado' && (
          <p className="eyebrow q-comando">Julgue o item a seguir — marque Certo ou Errado</p>
        )}
        <p className="q-enunciado">{q.enunciado}</p>
      </div>

      {/* alternativas */}
      <div className="mt-4 space-y-2">
        {letras.map((l) => {
          const certa = corrigida && q.gabarito === l;
          const errada = corrigida && marcada === l && marcada !== q.gabarito;
          const sel = marcada === l && !corrigida;
          return (
            <button
              key={l}
              disabled={!podeMarcar}
              onClick={() => onMarcar?.(l)}
              className={`alt-btn ${certa ? 'alt-certa' : ''} ${errada ? 'alt-errada' : ''} ${sel ? 'alt-marca' : ''}`}
            >
              <span className="alt-letra">({l})</span>
              <span className="alt-texto font-prova">{alts[l]}</span>
              {certa && <span className="ml-auto text-xs font-bold shrink-0" style={{ color: 'var(--green)' }}>gabarito</span>}
              {errada && <span className="ml-auto text-xs font-bold shrink-0" style={{ color: 'var(--red)' }}>sua resposta</span>}
            </button>
          );
        })}
      </div>

      {/* banner de resultado */}
      {corrigida && acertou && (
        <p className="q-banner ok">Você acertou — resposta oficial: {q.gabarito}.</p>
      )}
      {corrigida && errou && (
        <p className="q-banner erro">Você errou — marcou {marcada}; gabarito oficial: {q.gabarito}.</p>
      )}
      {corrigida && q.anulada && (
        <p className="q-banner info">Item anulado pela banca — não pontua.</p>
      )}
      {corrigida && marcada === null && !q.anulada && (
        <p className="q-banner info">Sem resposta — gabarito oficial: {q.gabarito}.</p>
      )}

      {ia?.disponivel && modo !== 'simulado' && (
        <div className="flex gap-4 mt-4 flex-wrap">
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
