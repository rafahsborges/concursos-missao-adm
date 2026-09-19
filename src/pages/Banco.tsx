import { useEffect, useMemo, useRef, useState } from 'react';
import banco from '../data/banco.json';
import type { Questao } from '../types';
import QuestaoView from '../components/QuestaoView';
import { useProgresso, responder, registrarDiaEstudo, registrarTempoQuestao, definirAnotacao, toggleBandeira, registrarSrs } from '../lib/store';
import { temaDe, temasDaDisciplina } from '../lib/tags';
import { useAIStatus } from '../lib/trpc';

const Q = banco as Questao[];

interface Filtro { concurso: string; prova: string; disciplina: string; tema: string; bandeira: string; status: string; busca: string; anuladas: boolean; }

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function Banco({ preset }: { preset?: { concurso: string; disciplina: string } | null }) {
  useEffect(() => {
    if (preset) {
      setF({ concurso: preset.concurso, prova: '', disciplina: preset.disciplina, tema: '', bandeira: '', status: 'todas', busca: '', anuladas: false });
      setAtual(0);
    }
  }, [preset]);
  const [f, setF] = useState<Filtro>({ concurso: '', prova: '', disciplina: '', tema: '', bandeira: '', status: 'todas', busca: '', anuladas: false });
  const [atual, setAtual] = useState(0);
  const [corrigida, setCorrigida] = useState<Set<string>>(new Set());
  const [pomo, setPomo] = useState<number | null>(null); // segundos restantes
  const [foco, setFoco] = useState(false);
  const [tamFonte, setTamFonte] = useState(1.12);

  useEffect(() => {
    if (pomo === null) return;
    if (pomo <= 0) {
      alert('Pomodoro concluído. Faça uma pausa de 5 minutos.');
      setPomo(null);
      return;
    }
    const t = setTimeout(() => setPomo(pomo - 1), 1000);
    return () => clearTimeout(t);
  }, [pomo]);
  const prog = useProgresso();
  const ia = useAIStatus();

  const lista = useMemo(
    () =>
      Q.filter((q) => {
        if (f.concurso && q.concurso !== f.concurso) return false;
        if (f.prova && q.prova !== f.prova) return false;
        if (f.disciplina && q.disciplina !== f.disciplina) return false;
        if (f.tema && temaDe(q) !== f.tema) return false;
        if (f.bandeira && !(prog.bandeiras[q.id] ?? []).includes(f.bandeira)) return false;
        if (f.status === 'srs') {
          const due = prog.srs[q.id]?.due;
          if (!due || due > new Date().toISOString().slice(0, 10)) return false;
        }
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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [atual]);

  // atalhos: A-E marca, setas navegam, Enter corrige
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT') return;
      const qq = lista[atual];
      if (!qq) return;
      const k = e.key.toUpperCase();
      if (qq.tipo === 'multipla_escolha' && 'ABCDE'.includes(k) && !corrigida.has(qq.id) && !qq.anulada) {
        responder(qq.id, k);
        registrarDiaEstudo();
      } else if (e.key === 'ArrowLeft' && atual > 0) setAtual(atual - 1);
      else if (e.key === 'ArrowRight' && atual < lista.length - 1) setAtual(atual + 1);
      else if (e.key === 'Enter' && prog.respostas[qq.id] && !corrigida.has(qq.id)) {
        setCorrigida(new Set(corrigida).add(qq.id));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [atual, lista, corrigida, prog.respostas]);

  // cronômetro por questão: registra o tempo ao trocar de questão
  const tempoRef = useRef<{ id: string; ini: number } | null>(null);
  useEffect(() => {
    tempoRef.current = q ? { id: q.id, ini: Date.now() } : null;
    return () => {
      if (tempoRef.current) {
        const seg = Math.round((Date.now() - tempoRef.current.ini) / 1000);
        if (seg >= 3 && seg < 3600) registrarTempoQuestao(tempoRef.current.id, seg);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, lista]);

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Banco de questões · somente questões reais com gabarito oficial</p>
      <h2 className="font-prova text-3xl font-semibold mb-4">Resolver questões</h2>
      {!foco && (
      <div className="q-filtros-sticky flex flex-wrap gap-2 mb-4 items-center">
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
        {f.disciplina && temasDaDisciplina(f.disciplina).length > 0 && (
          <select value={f.tema} onChange={(e) => { setF({ ...f, tema: e.target.value }); setAtual(0); }}>
            <option value="">Tema: todos</option>
            {temasDaDisciplina(f.disciplina).map((t) => (<option key={t}>{t}</option>))}
          </select>
        )}
        <select value={f.bandeira} onChange={(e) => { setF({ ...f, bandeira: e.target.value }); setAtual(0); }}>
          <option value="">Bandeira: todas</option>
          <option value="favorita">Favoritas</option>
          <option value="duvida">Dúvidas</option>
          <option value="revisar">Revisar depois</option>
        </select>
        <select value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setAtual(0); }}>
          <option value="todas">Status: todas</option>
          <option value="nao">Não respondidas</option>
          <option value="certas">Acertadas</option>
          <option value="erradas">Erradas</option>
          <option value="srs">Revisar hoje (SRS)</option>
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
        <button className="text-sm" onClick={() => setPomo(pomo === null ? 1500 : null)}>
          {pomo === null ? 'Pomodoro 25min' : Math.floor(pomo / 60) + ':' + String(pomo % 60).padStart(2, '0') + ' (parar)'}
        </button>
      </div>
      )}
      {!foco && (
      <div className="flex flex-wrap gap-1 mb-1 max-h-28 overflow-y-auto">
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
      )}
      {!foco && (
      <p className="flex flex-wrap gap-4 mb-5">
        <span className="q-legenda"><span className="q-quadrado bg-white" /> não respondida</span>
        <span className="q-legenda"><span className="q-quadrado alt-marca" /> respondida</span>
        <span className="q-legenda"><span className="q-quadrado alt-certa" /> acertada</span>
        <span className="q-legenda"><span className="q-quadrado alt-errada" /> errada</span>
      </p>
      )}
      {q ? (
        <>
          <p className="text-sm mb-2 flex flex-wrap items-center gap-2">
            <span className="font-prova font-semibold">Questão {atual + 1} de {lista.length}</span>
            <button className="text-xs" onClick={() => setFoco(!foco)}>{foco ? 'Sair do foco' : 'Modo foco'}</button>
            <button className="text-xs" onClick={() => setTamFonte((t) => Math.max(0.9, +(t - 0.08).toFixed(2)))}>A−</button>
            <button className="text-xs" onClick={() => setTamFonte((t) => Math.min(1.6, +(t + 0.08).toFixed(2)))}>A+</button>
            <span className="text-neutral-500">
              {' — '}
              {corrigida.has(q.id)
                ? prog.respostas[q.id] === q.gabarito
                  ? 'corrigida: acertou'
                  : 'corrigida: errou'
                : prog.respostas[q.id]
                  ? 'respondida, aguardando correção'
                  : 'não respondida'}
            </span>
          </p>
          <div style={{ ['--qfont' as string]: tamFonte + 'rem' }}>
          <QuestaoView
            questao={q}
            modo="estudo"
            marcada={prog.respostas[q.id] ?? null}
            corrigida={corrigida.has(q.id)}
            onMarcar={(alt) => {
                if (!corrigida.has(q.id)) {
                  responder(q.id, alt);
                  registrarDiaEstudo();
                }
              }}
            ia={ia?.disponivel ? { disponivel: true, mostrarDica: !corrigida.has(q.id), mostrarExplicar: corrigida.has(q.id) } : undefined}
          />
          </div>
          <div className="flex gap-2 flex-wrap mt-1 mb-2">
            {(['favorita', 'duvida', 'revisar'] as const).map((b) => (
              <button
                key={b}
                className={`text-xs ${(prog.bandeiras[q.id] ?? []).includes(b) ? 'btn-ink' : ''}`}
                onClick={() => toggleBandeira(q.id, b)}
              >
                {b === 'favorita' ? 'Favorita' : b === 'duvida' ? 'Dúvida' : 'Revisar depois'}
              </button>
            ))}
            {prog.srs[q.id] && (
              <span className="text-xs text-neutral-500 self-center">SRS: revisar em {prog.srs[q.id].due}</span>
            )}
          </div>
          <label className="block text-xs text-neutral-500 mb-4">
            Minhas anotações
            <textarea
              className="w-full mt-1 p-2 font-prova text-sm"
              rows={2}
              placeholder="Ex.: errei por causa da vírgula antes de 'mas'…"
              defaultValue={prog.anotacoes[q.id] ?? ''}
              onBlur={(e) => definirAnotacao(q.id, e.target.value)}
            />
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              disabled={!prog.respostas[q.id] || corrigida.has(q.id)}
              className="btn-ink"
              onClick={() => {
                setCorrigida(new Set(corrigida).add(q.id));
                const r = prog.respostas[q.id];
                if (r) registrarSrs(q.id, r === q.gabarito);
                registrarDiaEstudo();
              }}
            >
              Corrigir com gabarito oficial
            </button>
            <button disabled={atual === 0} onClick={() => setAtual(atual - 1)}>Anterior</button>
            <button disabled={atual >= lista.length - 1} onClick={() => setAtual(atual + 1)}>Próxima</button>
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            Atalhos: A–E responder · ← → navegar · Enter corrigir
          </p>
        </>
      ) : (
        <p>Nenhuma questão com esses filtros.</p>
      )}
    </div>
  );
}
