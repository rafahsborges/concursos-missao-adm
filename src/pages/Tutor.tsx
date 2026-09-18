import { useEffect, useRef, useState } from 'react';
import { CONCURSOS } from '../data/concursos';
import { trpc, useAIStatus } from '../lib/trpc';

export default function Tutor() {
  const ia = useAIStatus();
  const [msgs, setMsgs] = useState<{ papel: 'user' | 'assistant'; texto: string }[]>([]);
  const [entrada, setEntrada] = useState('');
  const [aguarde, setAguarde] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const contexto = CONCURSOS.map(
    (c) => c.nome + ' (' + c.banca + ' ' + c.ano + ', ' + c.cargo + ', ' + c.formato + ', pontuação: ' + c.regra + ')'
  ).join('; ');

  const enviar = () => {
    if (!entrada.trim() || aguarde) return;
    const m = entrada.trim();
    setEntrada('');
    setAguarde(true);
    setMsgs((x) => [...x, { papel: 'user', texto: m }]);
    trpc.tutor
      .mutate({ mensagem: m, contexto })
      .then((r) => setMsgs((x) => [...x, { papel: 'assistant', texto: r.resposta }]))
      .catch(() => setMsgs((x) => [...x, { papel: 'assistant', texto: 'IA indisponível no momento.' }]))
      .finally(() => setAguarde(false));
  };

  return (
    <div className="fade-in flex flex-col" style={{ minHeight: '70vh' }}>
      <p className="eyebrow mb-1">Tutor IA · contextualizado nas 4 provas e regras de pontuação</p>
      <h2 className="font-prova text-3xl font-semibold mb-4">Tire dúvidas</h2>
      {!ia?.disponivel && <p className="text-sm text-neutral-600 mb-3">IA indisponível — o chat está desativado.</p>}
      <div className="flex-1 space-y-4 mb-4">
        {msgs.length === 0 && (
          <p className="text-neutral-500 text-sm">
            Pergunte sobre disciplinas, bancas, cronograma ou qualquer questão do seu estudo. A conversa não fica salva.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.papel === 'user' ? 'ml-auto' : ''}`}>
            {m.papel === 'assistant' && <p className="eyebrow mb-1">Tutor — gerado por IA</p>}
            <p className={`text-sm whitespace-pre-wrap p-3 ${m.papel === 'user' ? 'bloco-ia' : 'border border-[var(--line)]'}`}>{m.texto}</p>
          </div>
        ))}
        <div ref={fim} />
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1"
          value={entrada}
          disabled={!ia?.disponivel || aguarde}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
          placeholder="Digite sua dúvida…"
        />
        <button className="btn-ink" disabled={!ia?.disponivel || aguarde} onClick={enviar}>
          {aguarde ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
