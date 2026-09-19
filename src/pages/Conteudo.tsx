import { useEffect, useMemo, useState } from 'react';
import banco from '../data/banco.json';
import type { CapituloConteudo, Questao } from '../types';
import { useProgresso, marcarLido, definirAnotSecao, toggleDestaque, registrarFlashSrs } from '../lib/store';
import { trpc } from '../lib/trpc';
import { temaDe } from '../lib/tags';
import { renderRich } from '../lib/termos';
import QuestaoView from '../components/QuestaoView';

const Q = banco as Questao[];

interface IndexConteudo {
  atualizadoEm: string | null;
  disciplinas: { slug: string; nome: string; capitulos: number; paragrafos: number }[];
  concursos: string[];
}

interface QuizState { titulo: string; questoes: Questao[]; }
interface FlashState { titulo: string; cards: { id: string; frente: string; verso: string }[]; }

export default function Conteudo({ iaDisponivel }: { iaDisponivel: boolean }) {
  const [idx, setIdx] = useState<IndexConteudo | null>(null);
  const [cap, setCap] = useState<CapituloConteudo | null>(null);
  const [foco, setFoco] = useState<string>('todos');
  const [explicando, setExplicando] = useState<number | null>(null);
  const [txtIA, setTxtIA] = useState('');
  const [leitura, setLeitura] = useState(false);
  const [falando, setFalando] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizResp, setQuizResp] = useState<Record<string, string>>({});
  const [quizCorr, setQuizCorr] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [flashIdx, setFlashIdx] = useState(0);
  const [virada, setVirada] = useState(false);
  const [progLeitura, setProgLeitura] = useState(0);
  const prog = useProgresso();

  useEffect(() => {
    fetch('conteudo/index.json').then((r) => r.json()).then(setIdx);
  }, []);
  useEffect(() => {
    setCap(null);
    setQuiz(null);
    setFlash(null);
  }, [foco]);

  useEffect(() => {
    const h = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgLeitura(total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 0);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const hoje = new Date().toISOString().slice(0, 10);

  function secId(i: number): string {
    return (cap?.id ?? '') + '-' + i;
  }

  function ouvir(i: number, paragrafos: string[]) {
    if (falando === i) {
      window.speechSynthesis.cancel();
      setFalando(null);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(paragrafos.join(' '));
    u.lang = 'pt-BR';
    u.rate = 1.05;
    u.onend = () => setFalando(null);
    window.speechSynthesis.speak(u);
    setFalando(i);
  }

  function destacarSelecao(i: number) {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length >= 3 && cap) toggleDestaque(secId(i), sel);
  }

  function iniciarQuiz(tituloSecao: string) {
    if (!cap) return;
    const tag = tituloSecao.includes('·') ? tituloSecao.split('·').pop()!.trim() : tituloSecao;
    const pool = Q.filter((q) => q.disciplina === cap.titulo && temaDe(q) === tag && !q.anulada);
    if (pool.length === 0) return;
    setFlash(null);
    setQuizResp({});
    setQuizCorr(new Set());
    setQuiz({ titulo: 'Quiz — ' + tag, questoes: pool.slice(0, 5) });
    window.scrollTo({ top: 0 });
  }

  function iniciarFlash() {
    if (!cap) return;
    const cards: FlashState['cards'] = [];
    cap.secoes.forEach((s, si) => {
      for (const p of s.paragrafos) {
        const partes = p.split(/(?<=\.)\s+/);
        if (partes.length >= 2 && p.length > 60) {
          cards.push({ id: 'FLASH-' + cap.id + '-' + si + '-' + cards.length, frente: partes[0], verso: partes.slice(1).join(' ') });
        }
        if (cards.length >= 24) return;
      }
    });
    if (!cards.length) return;
    setQuiz(null);
    setFlash({ titulo: 'Flashcards — ' + cap.titulo, cards });
    setFlashIdx(0);
    setVirada(false);
    window.scrollTo({ top: 0 });
  }

  function responderFlash(acertou: boolean) {
    if (!flash) return;
    registrarFlashSrs(flash.cards[flashIdx].id, acertou);
    if (flashIdx < flash.cards.length - 1) {
      setFlashIdx(flashIdx + 1);
      setVirada(false);
    } else {
      setFlash(null);
    }
  }

  function exportarPdf() {
    if (!cap) return;
    const html = '<html><head><title>' + cap.titulo + '</title><style>body{font-family:Georgia,serif;max-width:700px;margin:24px auto;color:#000}h1{font-size:20px}h2{font-size:15px;margin-top:24px}p{font-size:13px;line-height:1.6;text-align:justify}</style></head><body>' +
      '<h1>' + cap.titulo + '</h1><p><i>Presente em: ' + cap.concursos.join(' · ') + '</i></p>' +
      cap.secoes.map((s) => '<h2>' + s.titulo + '</h2>' + s.paragrafos.map((p) => '<p>' + p + '</p>').join('')).join('') +
      '</body></html>';
    const j = window.open('', '_blank');
    if (j) {
      j.document.write(html);
      j.document.close();
      j.print();
    }
  }

  if (!idx) return <p>Carregando…</p>;
  if (!idx.disciplinas.length) {
    return (
      <div className="fade-in">
        <p className="eyebrow mb-1">Conteúdo</p>
        <h2 className="font-prova text-3xl font-semibold mb-4">Apostilas</h2>
        <p className="text-neutral-600">Nenhum conteúdo importado ainda.</p>
      </div>
    );
  }

  if (quiz) {
    return (
      <div className="fade-in">
        <p className="eyebrow mb-1">{quiz.titulo}</p>
        <h2 className="font-prova text-3xl font-semibold mb-4">Questões reais deste tema</h2>
        <button className="mb-4 text-sm" onClick={() => setQuiz(null)}>Voltar ao conteúdo</button>
        {quiz.questoes.map((q) => (
          <div key={q.id}>
            <QuestaoView questao={q} modo="estudo"
              marcada={quizResp[q.id] ?? null}
              corrigida={quizCorr.has(q.id)}
              onMarcar={(alt) => { if (!quizCorr.has(q.id)) setQuizResp({ ...quizResp, [q.id]: alt }); }}
              ia={iaDisponivel ? { disponivel: true, mostrarDica: !quizCorr.has(q.id), mostrarExplicar: quizCorr.has(q.id) } : undefined}
            />
            {quizResp[q.id] && !quizCorr.has(q.id) && (
              <button
                className="btn-ink text-sm -mt-3 mb-6"
                onClick={() => setQuizCorr(new Set(quizCorr).add(q.id))}
              >
                Corrigir
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (flash) {
    const card = flash.cards[flashIdx];
    const dueHoje = flash.cards.filter((c) => {
      const f = prog.flash[c.id];
      return !f || f.due <= hoje;
    }).length;
    return (
      <div className="fade-in max-w-xl">
        <p className="eyebrow mb-1">{flash.titulo}</p>
        <h2 className="font-prova text-3xl font-semibold mb-2">Flashcards do conteúdo</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Cartão {flashIdx + 1} de {flash.cards.length} · {dueHoje} para revisar hoje (SRS)
        </p>
        <div className="flash-card" onClick={() => setVirada(!virada)}>
          {virada ? <span className="flash-verso">{card.verso}</span> : <span>{card.frente}</span>}
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <button className="btn-ink" onClick={() => responderFlash(true)}>Lembrei</button>
          <button className="btn-red" onClick={() => responderFlash(false)}>Esqueci</button>
          <button onClick={() => { setFlash(null); window.speechSynthesis?.cancel(); }}>Sair</button>
        </div>
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
      <div className="flex gap-2 mb-6 items-center flex-wrap">
        <label className="eyebrow">Filtrar por concurso:</label>
        <select value={foco} onChange={(e) => setFoco(e.target.value)}>
          <option value="todos">Todos</option>
          {idx.concursos.map((c) => (<option key={c}>{c}</option>))}
        </select>
        {cap && (
          <>
            <button className="text-sm" onClick={() => setLeitura(!leitura)}>
              {leitura ? 'Sair do modo leitura' : 'Modo leitura'}
            </button>
            <button className="text-sm" onClick={iniciarFlash}>Flashcards</button>
            <button className="text-sm" onClick={exportarPdf}>Exportar PDF</button>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {idx.disciplinas.map((d) => (
          <button
            key={d.slug}
            className="text-left p-3"
            onClick={() => fetch('conteudo/' + d.slug + '.json').then((r) => r.json()).then((c: CapituloConteudo) => { setCap(c); setExplicando(null); setLeitura(false); })}
          >
            <span className="font-prova font-semibold">{d.nome}</span>
            <span className="block text-xs text-neutral-500 mt-1">{d.capitulos} capítulos · {d.paragrafos} parágrafos</span>
          </button>
        ))}
      </div>
      {cap && (
        <section className={leitura ? 'modo-leitura' : ''}>
          <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4 flex-wrap gap-2">
            <h3 className="font-prova text-2xl font-semibold">{cap.titulo}</h3>
            <div className="flex gap-3 items-center flex-wrap">
              <span className="eyebrow">Presente em: {cap.concursos.join(' · ')}</span>
              <button className="text-xs" disabled={Boolean(prog.lidos[cap.id])} onClick={() => marcarLido(cap.id)}>
                {prog.lidos[cap.id] ? 'Lido' : 'Marcar como lido'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="eyebrow self-center">Sumário:</span>
            {cap.secoes.map((s, i) => (
              <button key={i} className="text-xs" onClick={() => document.getElementById('secao-' + i)?.scrollIntoView({ behavior: 'smooth' })}>
                {s.titulo.length > 42 ? s.titulo.slice(0, 42) + '…' : s.titulo}
              </button>
            ))}
          </div>
          {cap.secoes.map((s, i) => (
            <details key={i} id={'secao-' + i} className="mb-4 border-b border-[var(--line)] pb-3" open={i < 2}>
              <summary className="cursor-pointer font-prova font-semibold text-[1.05rem]">
                {s.titulo}
              </summary>
              <div className="flex gap-2 flex-wrap mt-2 mb-1 no-print">
                <button className="text-xs" onClick={() => ouvir(i, s.paragrafos)}>
                  {falando === i ? 'Parar leitura' : 'Ouvir seção'}
                </button>
                <button className="text-xs" onClick={() => destacarSelecao(i)}>Destacar seleção</button>
                <button className="text-xs" onClick={() => iniciarQuiz(s.titulo)}>Quiz desta seção</button>
                {iaDisponivel && (
                  <button
                    className="text-xs"
                    onClick={() => {
                      setExplicando(i);
                      setTxtIA('');
                      trpc.explicarSecao
                        .mutate({ titulo: s.titulo, trecho: s.paragrafos.join('\n').slice(0, 8000) })
                        .then((r) => setTxtIA(r.explicacao))
                        .catch(() => setTxtIA('IA indisponível.'));
                    }}
                  >
                    Explicar com IA
                  </button>
                )}
              </div>
              {(prog.destaques[secId(i)] ?? []).length > 0 && (
                <p className="text-xs text-neutral-500 mb-2">
                  Destaques:{' '}
                  {(prog.destaques[secId(i)] ?? []).map((d) => (
                    <button key={d} className="hl-link border-0 bg-transparent text-xs mr-2" title="Clique para remover"
                      onClick={() => toggleDestaque(secId(i), d)}>
                      {d.length > 40 ? d.slice(0, 40) + '…' : d}
                    </button>
                  ))}
                </p>
              )}
              {s.paragrafos.map((p, j) => (
                <p key={j} className="font-prova text-[1.02rem] leading-relaxed mt-2"
                  dangerouslySetInnerHTML={{ __html: renderRich(p, cap.titulo, prog.destaques[secId(i)] ?? []) }} />
              ))}
              <label className="block text-xs text-neutral-500 mt-3">
                Anotações desta seção
                <textarea
                  className="w-full mt-1 p-2 font-prova text-sm"
                  rows={2}
                  placeholder="Escreva sua síntese, dúvidas ou macetes…"
                  defaultValue={prog.anotSecoes[secId(i)] ?? ''}
                  onBlur={(e) => definirAnotSecao(secId(i), e.target.value)}
                />
              </label>
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
