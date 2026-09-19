import { useEffect, useMemo, useRef, useState } from 'react';
import banco from '../data/banco.json';
import type { Questao, RespostaSimulado } from '../types';
import QuestaoView from '../components/QuestaoView';
import { registrarSimulado, getProgresso, registrarDiagnostico, useProgresso } from '../lib/store';
import { pontuar } from '../lib/pontuacao';
import { useAIStatus } from '../lib/trpc';

const Q = banco as Questao[];
type ModoSimulado = 'oficial' | 'personalizado' | 'dinamico';

export default function Simulado() {
  const ia = useAIStatus();
  const [fase, setFase] = useState<'config' | 'prova' | 'folha' | 'revisao'>('config');
  const [modo, setModo] = useState<ModoSimulado>('oficial');
  const [provaReal, setProvaReal] = useState(false);
  const [concurso, setConcurso] = useState('INSS 2022');
  const [prova, setProva] = useState('');
  const [disciplina, setDisciplina] = useState('');
  // dinâmico: null = todas as matérias selecionadas
  const [selecionadas, setSelecionadas] = useState<Set<string> | null>(null);
  const [nQuest, setNQuest] = useState(20);
  const [tempoMin, setTempoMin] = useState(60);
  const [qs, setQs] = useState<Questao[]>([]);
  const [resp, setResp] = useState<Record<string, string | null>>({});
  const [atual, setAtual] = useState(0);
  const [restante, setRestante] = useState(0);
  const [inicio, setInicio] = useState(0);
  const finalizado = useRef(false);
  const progSim = useProgresso();

  useEffect(() => {
    if (sessionStorage.getItem('rf-diagnostico') === '1') {
      sessionStorage.removeItem('rf-diagnostico');
      setModo('dinamico');
      setConcurso('');
      setNQuest(15);
      setProvaReal(true);
      setTempoMin(45);
    }
  }, []);

  const provas = useMemo(
    () => [...new Set(Q.filter((q) => q.concurso === concurso).map((q) => q.prova))],
    [concurso]
  );
  const disciplinas = useMemo(() => [...new Set(Q.map((q) => q.disciplina))].sort(), []);

  function finalizar() {
    const detalhes: RespostaSimulado[] = qs.map((q) => ({
      numero: q.numero,
      marcada: resp[q.id] ?? null,
      id: q.id,
      gabarito: q.gabarito,
      anulada: q.anulada,
    }));
    const validas = qs.filter((q) => !q.anulada);
    const certas = validas.filter((q) => resp[q.id] === q.gabarito).length;
    const erradas = validas.filter((q) => resp[q.id] && resp[q.id] !== q.gabarito).length;
    const brancas = validas.length - certas - erradas;
    const banca = qs[0]?.banca ?? 'FGV';
    const rotulo =
      modo === 'oficial'
        ? prova || 'todas'
        : modo === 'personalizado'
          ? 'Personalizado (' + (disciplina || 'todas') + ')'
          : 'Dinâmico (' + validas.length + ' questões' + (concurso ? ' · ' + concurso : ' · todos os concursos') + ')';
    registrarSimulado({
      id: 's' + Date.now(),
      modo,
      concurso: concurso || 'Todos os concursos',
      prova: rotulo,
      nota: pontuar(banca, certas, erradas),
      notaMax: validas.length,
      certas,
      erradas,
      brancas,
      tempoSeg: Math.round((Date.now() - inicio) / 1000),
      quando: Date.now(),
      detalhes,
    });
    if (modo === 'dinamico' && qs.length >= 10 && !getProgresso().diagnostico?.feito) {
      const porDisc = new Map<string, { total: number; certas: number }>();
      for (const q of qs) {
        if (q.anulada) continue;
        const e = porDisc.get(q.disciplina) ?? { total: 0, certas: 0 };
        e.total++;
        if (resp[q.id] === q.gabarito) e.certas++;
        porDisc.set(q.disciplina, e);
      }
      const fracas = [...porDisc.entries()]
        .filter(([, v]) => v.total >= 2)
        .sort((a, b) => a[1].certas / a[1].total - b[1].certas / b[1].total)
        .slice(0, 3)
        .map(([d]) => d);
      if (fracas.length) registrarDiagnostico(fracas);
    }
    setFase(provaReal ? 'folha' : 'revisao');
  }

  useEffect(() => {
    if (fase !== 'prova') return;
    const t = setInterval(() => {
      setRestante((r) => {
        if (r <= 1 && !finalizado.current) {
          finalizado.current = true;
          setTimeout(finalizar, 0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  function iniciar() {
    let lista: Questao[] = [];
    if (modo === 'oficial') {
      lista = Q.filter((q) => q.concurso === concurso && (!prova || q.prova === prova)).sort((a, b) => a.numero - b.numero);
    } else if (modo === 'personalizado') {
      const pool = Q.filter((q) => q.concurso === concurso && (!disciplina || q.disciplina === disciplina) && !q.anulada);
      lista = pool.slice(0, nQuest);
    } else {
      // dinâmico: sorteio de questões de todas as matérias selecionadas
      const pool = Q.filter(
        (q) =>
          (!concurso || q.concurso === concurso) &&
          (selecionadas === null || selecionadas.has(q.disciplina)) &&
          !q.anulada
      );
      lista = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.min(nQuest, pool.length)));
    }
    setQs(lista);
    setResp({});
    setAtual(0);
    setRestante(tempoMin * 60);
    setInicio(Date.now());
    finalizado.current = false;
    setFase('prova');
  }

  function alternarDisciplina(d: string) {
    const base = selecionadas === null ? new Set(disciplinas) : new Set(selecionadas);
    if (base.has(d)) base.delete(d);
    else base.add(d);
    setSelecionadas(base);
  }

  if (fase === 'config') {
    return (
      <div className="fade-in max-w-2xl">
        <p className="eyebrow mb-1">Simulado</p>
        <h2 className="font-prova text-3xl font-semibold mb-6">Configurar prova</h2>
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <label className="text-sm">
              <input type="radio" checked={modo === 'oficial'} onChange={() => setModo('oficial')} /> Prova oficial completa
            </label>
            <label className="text-sm">
              <input type="radio" checked={modo === 'personalizado'} onChange={() => setModo('personalizado')} /> Personalizado (1 matéria)
            </label>
            <label className="text-sm">
              <input type="radio" checked={modo === 'dinamico'} onChange={() => setModo('dinamico')} /> Dinâmico (todas as matérias)
            </label>
          </div>

          <label className="block text-sm">
            Concurso
            <select
              className="block w-full mt-1"
              value={concurso}
              onChange={(e) => { setConcurso(e.target.value); setProva(''); }}
            >
              {modo === 'dinamico' && <option value="">Todos os concursos</option>}
              {[...new Set(Q.map((q) => q.concurso))].map((c) => (<option key={c}>{c}</option>))}
            </select>
          </label>

          {modo === 'oficial' && (
            <label className="block text-sm">
              Prova
              <select className="block w-full mt-1" value={prova} onChange={(e) => setProva(e.target.value)}>
                <option value="">Todas do concurso</option>
                {provas.map((p) => (<option key={p}>{p}</option>))}
              </select>
            </label>
          )}

          {modo === 'personalizado' && (
            <label className="block text-sm">
              Disciplina
              <select className="block w-full mt-1" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
                <option value="">Todas</option>
                {disciplinas.map((d) => (<option key={d}>{d}</option>))}
              </select>
            </label>
          )}

          {modo === 'dinamico' && (
            <div className="border border-[var(--line)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Matérias incluídas ({selecionadas === null ? disciplinas.length : selecionadas.size})</span>
                <div className="flex gap-2">
                  <button className="text-xs" onClick={() => setSelecionadas(null)}>Todas</button>
                  <button className="text-xs" onClick={() => setSelecionadas(new Set())}>Nenhuma</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {disciplinas.map((d) => {
                  const marcada = selecionadas === null || selecionadas.has(d);
                  return (
                    <label
                      key={d}
                      className={`text-xs border px-2 py-1 cursor-pointer ${marcada ? 'alt-marca' : 'bg-white'}`}
                    >
                      <input type="checkbox" className="hidden" checked={marcada} onChange={() => alternarDisciplina(d)} />
                      {d}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {(modo === 'personalizado' || modo === 'dinamico') && (
            <label className="block text-sm">
              Quantidade de questões
              <input
                type="number"
                min={1}
                max={modo === 'dinamico' ? 200 : 120}
                value={nQuest}
                onChange={(e) => setNQuest(Number(e.target.value))}
                className="block w-full mt-1"
              />
            </label>
          )}

          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={provaReal} onChange={(e) => setProvaReal(e.target.checked)} />
            Modo prova real — sem voltar às questões, com folha de respostas no final
          </label>

          <label className="block text-sm">
            Tempo (minutos)
            <input type="number" min={5} value={tempoMin} onChange={(e) => setTempoMin(Number(e.target.value))} className="block w-full mt-1" />
          </label>

          <button className="btn-ink" onClick={iniciar}>Iniciar simulado</button>
          <button
            onClick={() => {
              const pool = Q.filter(
                (q) =>
                  (!concurso || q.concurso === concurso) &&
                  (modo !== 'personalizado' || !disciplina || q.disciplina === disciplina) &&
                  (selecionadas === null || selecionadas.has(q.disciplina)) &&
                  !q.anulada
              );
              const listaImp = modo === 'oficial'
                ? pool.sort((a, b) => a.numero - b.numero)
                : [...pool].sort(() => Math.random() - 0.5).slice(0, nQuest);
              const html = '<html><head><title>Prova para impressão</title><style>body{font-family:Georgia,serif;max-width:700px;margin:24px auto;color:#000}h1{font-size:18px}p{font-size:13px;line-height:1.5}.alt{margin:4px 0 4px 16px;font-size:13px}.folha{margin-top:32px;border-top:1px solid #000;padding-top:8px;font-size:13px}</style></head><body>' +
                '<h1>Simulado para impressão — ' + (concurso || 'Todos os concursos') + ' — ' + listaImp.length + ' questões</h1>' +
                listaImp.map((q, i) =>
                  '<p><b>' + (i + 1) + '.</b> (' + q.disciplina + ') ' + q.enunciado + '</p>' +
                  Object.entries(q.alternativas ?? { C: 'Certo', E: 'Errado' })
                    .map(([l, t]) => '<p class="alt">(' + l + ') ' + t + '</p>').join('')
                ).join('') +
                '<div class="folha"><b>Folha de respostas:</b><br>' +
                listaImp.map((q, i) => (i + 1) + ' ___').join(' · ') + '</div>' +
                '</body></html>';
              const j = window.open('', '_blank');
              if (j) {
                j.document.write(html);
                j.document.close();
                j.print();
              }
            }}
          >
            Imprimir prova em PDF
          </button>
          <p className="text-xs text-neutral-500">
            Sem IA durante a prova — apenas na revisão. Anuladas não entram no sorteio e não pontuam.
            {modo === 'dinamico' && ' O sorteio mistura questões e matérias a cada simulado.'}
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (fase !== 'prova') return;
    const h = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT') return;
      const qq = qs[atual];
      if (!qq) return;
      const k = e.key.toUpperCase();
      if (qq.tipo === 'multipla_escolha' && 'ABCDE'.includes(k) && !qq.anulada) setResp({ ...resp, [qq.id]: k });
      else if (e.key === 'ArrowRight' && atual < qs.length - 1) setAtual(atual + 1);
      else if (e.key === 'ArrowLeft' && !provaReal && atual > 0) setAtual(atual - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, atual, qs, resp, provaReal]);

  if (fase === 'prova') {
    const q = qs[atual];
    const mm = String(Math.floor(restante / 60)).padStart(2, '0');
    const ss = String(restante % 60).padStart(2, '0');
    return (
      <div className="fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3 mb-4 sticky top-0 bg-[var(--paper)]">
          <span className={`font-mono text-lg ${restante <= 300 ? 'font-bold' : ''}`} style={{ color: restante <= 300 ? 'var(--red)' : 'inherit' }}>
            {mm}:{ss}{restante <= 300 && ' — últimos 5 minutos'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const r = { ...resp };
                delete r[q.id];
                setResp(r);
              }}
            >
              Deixar em branco
            </button>
            <button className="btn-red" onClick={() => { if (confirm('Finalizar simulado agora?')) finalizar(); }}>
              Finalizar
            </button>
          </div>
        </div>
        {!provaReal && (
        <div className="flex flex-wrap gap-1 mb-6">
          {qs.map((x, i) => (
            <button
              key={x.id}
              className={`w-9 h-8 text-xs ${resp[x.id] ? 'alt-marca' : 'bg-white'} ${i === atual ? 'outline outline-2 outline-black' : ''}`}
              onClick={() => setAtual(i)}
            >
              {x.numero}
            </button>
          ))}
        </div>
        )}
        <QuestaoView questao={q} modo="simulado" marcada={resp[q.id] ?? null} corrigida={false} onMarcar={(alt) => setResp({ ...resp, [q.id]: alt })} />
        <div className="flex gap-3">
          {!provaReal && (
            <button disabled={atual === 0} onClick={() => setAtual(atual - 1)}>Anterior</button>
          )}
          <button disabled={atual >= qs.length - 1} onClick={() => setAtual(atual + 1)}>Próxima</button>
          <span className="self-center text-xs text-neutral-500">{atual + 1}/{qs.length}</span>
        </div>
      </div>
    );
  }

  if (fase === 'folha') {
    return (
      <div className="fade-in">
        <p className="eyebrow mb-1">Folha de respostas</p>
        <h2 className="font-prova text-3xl font-semibold mb-2">Simulado finalizado</h2>
        <p className="text-sm text-neutral-600 mb-6">
          Confira suas marcações antes de ver a correção. Em branco = questão sem resposta.
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 mb-6 max-w-lg">
          {qs.map((q, i) => (
            <div key={q.id} className={`border border-[var(--line)] p-2 text-center ${resp[q.id] ? 'alt-marca' : ''}`}>
              <span className="block text-xs text-neutral-500">{i + 1}</span>
              <span className="font-prova font-semibold">{resp[q.id] ?? '—'}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="btn-ink" onClick={() => setFase('revisao')}>Ver correção comentada</button>
          <button onClick={() => setFase('config')}>Descartar e voltar</button>
        </div>
      </div>
    );
  }

  const validas = qs.filter((q) => !q.anulada);
  const certas = validas.filter((q) => resp[q.id] === q.gabarito).length;
  const erradas = validas.filter((q) => resp[q.id] && resp[q.id] !== q.gabarito).length;
  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Revisão do simulado</p>
      <h2 className="font-prova text-3xl font-semibold mb-2">
        Nota: {pontuar(qs[0]?.banca ?? 'FGV', certas, erradas)} / {validas.length}
      </h2>
      <p className="text-sm text-neutral-600 mb-6">
        {certas} certas · {erradas} erradas · {validas.length - certas - erradas} em branco ·{' '}
        {qs.filter((q) => q.anulada).length} anuladas (sem pontuação)
      </p>
      {qs.map((q) => (
        <div key={q.id}>
          <QuestaoView
            questao={q}
            modo="revisao"
            marcada={resp[q.id] ?? null}
            corrigida
            ia={ia?.disponivel ? { disponivel: true, mostrarDica: false, mostrarExplicar: true } : undefined}
          />
          {progSim.anotacoes[q.id] && (
            <div className="bloco-ia p-3 -mt-4 mb-6">
              <p className="eyebrow mb-1">Minha anotação</p>
              <p className="text-sm whitespace-pre-wrap">{progSim.anotacoes[q.id]}</p>
            </div>
          )}
        </div>
      ))}
      <button className="btn-ink" onClick={() => setFase('config')}>Novo simulado</button>
    </div>
  );
}
