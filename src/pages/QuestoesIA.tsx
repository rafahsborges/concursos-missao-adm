import { useEffect, useState } from 'react';
import type { Questao, QuestaoIA } from '../types';
import QuestaoView from '../components/QuestaoView';
import { useProgresso, responderIA } from '../lib/store';
import { trpc, useAIStatus } from '../lib/trpc';

export default function QuestoesIA() {
  const ia = useAIStatus();
  const prog = useProgresso();
  const [qs, setQs] = useState<QuestaoIA[]>([]);
  const [disciplina, setDisciplina] = useState('Língua Portuguesa');
  const [banca, setBanca] = useState('Cebraspe');
  const [qtd, setQtd] = useState(5);
  const [corrigida, setCorrigida] = useState<Set<string>>(new Set());

  const recarregar = () => trpc.listarQuestoesIA.query().then((r) => setQs(r as QuestaoIA[]));
  useEffect(() => {
    if (ia?.disponivel) recarregar();
  }, [ia?.disponivel]);

  const comoQuestao = (x: QuestaoIA): Questao => ({
    id: x.id,
    concurso: 'Questões IA',
    banca: x.estiloBanca,
    ano: new Date(x.criadaEm).getFullYear(),
    prova: 'Geradas por IA',
    numero: qs.indexOf(x) + 1,
    disciplina: x.disciplina,
    comando: null,
    contexto: null,
    tipo: x.tipo,
    enunciado: x.enunciado,
    alternativas: x.alternativas,
    gabarito: x.gabarito,
    anulada: false,
  });

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Questões geradas por IA</p>
      <h2 className="font-prova text-3xl font-semibold mb-2">Módulo separado do banco oficial</h2>
      <p className="selo-anulada inline-block mb-4">GABARITOS NÃO SÃO OFICIAIS</p>
      {ia?.disponivel ? (
        <>
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            <input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Disciplina" />
            <select value={banca} onChange={(e) => setBanca(e.target.value)}>
              <option>Cebraspe</option>
              <option>Cesgranrio</option>
              <option>FGV</option>
            </select>
            <input type="number" min={1} max={20} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="w-20" />
            <button className="btn-ink" onClick={() => trpc.gerarQuestoes.mutate({ disciplina, estiloBanca: banca, quantidade: qtd }).then(recarregar)}>
              Gerar questões
            </button>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Respostas contadas à parte — nunca entram no banco oficial, nos simulados ou no Desempenho.
          </p>
          {qs.slice().reverse().map((x) => (
            <QuestaoView
              key={x.id}
              questao={comoQuestao(x)}
              modo="estudo"
              marcada={prog.respostasIA[x.id] ?? null}
              corrigida={corrigida.has(x.id)}
              onMarcar={(alt) => { if (!corrigida.has(x.id)) responderIA(x.id, alt); }}
              ia={{ disponivel: true, mostrarDica: !corrigida.has(x.id), mostrarExplicar: corrigida.has(x.id) }}
            />
          ))}
          {qs.length > 0 && (
            <button
              className="btn-red"
              onClick={() => {
                if (confirm('Apagar todas as questões IA?')) trpc.limparQuestoesIA.mutate().then(recarregar);
              }}
            >
              Limpar questões IA
            </button>
          )}
        </>
      ) : (
        <p className="text-neutral-600">IA indisponível — geração desativada. O restante do sistema funciona normalmente.</p>
      )}
    </div>
  );
}
