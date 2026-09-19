import { useState } from 'react';
import type { Modulo } from '../types';
import { usePerfis, criarPerfil, selecionarPerfil, removerPerfil, renomearPerfil, getTema, aplicarTema } from '../lib/store';

const ITENS: { id: Modulo; rotulo: string }[] = [
  { id: 'inicio', rotulo: 'Início' },
  { id: 'trilha', rotulo: 'Trilha de estudo' },
  { id: 'cronograma', rotulo: 'Cronograma' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'banco', rotulo: 'Banco de questões' },
  { id: 'ia', rotulo: 'Questões IA' },
  { id: 'simulado', rotulo: 'Simulado' },
  { id: 'redacao', rotulo: 'Redação' },
  { id: 'tutor', rotulo: 'Tutor IA' },
  { id: 'desempenho', rotulo: 'Desempenho' },
];

export default function Sidebar({ modulo, ir }: { modulo: Modulo; ir: (m: Modulo) => void }) {
  const { perfis, ativo } = usePerfis();
  const nomeAtivo = perfis.find((p) => p.id === ativo)?.nome ?? '';
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<'claro' | 'escuro'>(getTema());

  const irEfechar = (m: Modulo) => {
    ir(m);
    setAberto(false);
  };

  const navegacao = (fechar: boolean) => (
    <>
      {ITENS.map((i) => (
        <button
          key={i.id}
          onClick={() => (fechar ? irEfechar(i.id) : ir(i.id))}
          className={`text-left border-0 bg-transparent py-1.5 text-sm ${modulo === i.id ? 'font-bold underline underline-offset-4' : 'text-neutral-600'}`}
        >
          {i.rotulo}
        </button>
      ))}
    </>
  );

  const blocoPerfil = (
    <div className="pt-4 border-t border-[var(--line)]">
      <p className="eyebrow mb-2">Perfil de estudo</p>
      <select className="w-full mb-2" value={ativo} onChange={(e) => selecionarPerfil(e.target.value)}>
        {perfis.map((p) => (
          <option key={p.id} value={p.id}>{p.nome}</option>
        ))}
      </select>
      <div className="flex gap-2 flex-wrap">
        <button
          className="text-xs flex-1"
          onClick={() => {
            const n = prompt('Nome do novo perfil:');
            if (n?.trim()) criarPerfil(n.trim());
          }}
        >
          Novo
        </button>
        <button
          className="text-xs"
          onClick={() => {
            const n = prompt('Renomear:', nomeAtivo);
            if (n?.trim()) renomearPerfil(ativo, n.trim());
          }}
        >
          Renomear
        </button>
        <button
          className="text-xs btn-red"
          disabled={perfis.length <= 1}
          onClick={() => {
            if (confirm('Excluir este perfil e todo o seu progresso?')) removerPerfil(ativo);
          }}
        >
          Excluir
        </button>
        <button
          className="text-xs w-full mt-2"
          onClick={() => {
            const t = tema === 'claro' ? 'escuro' : 'claro';
            aplicarTema(t);
            setTema(t);
          }}
        >
          Tema: {tema === 'claro' ? 'claro' : 'escuro'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* barra superior em telas pequenas */}
      <header className="md:hidden sticky top-0 z-20 bg-[var(--paper)] border-b border-[var(--line)] px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-prova text-lg font-semibold truncate">Reta Final</h1>
          <p className="eyebrow">Questões reais · 4 concursos</p>
        </div>
        <button
          className="text-sm shrink-0"
          onClick={() => setAberto(!aberto)}
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        >
          {aberto ? 'Fechar' : 'Menu'}
        </button>
      </header>

      {/* menu lateral deslizante (mobile) */}
      {aberto && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setAberto(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-64 bg-[var(--paper)] border-l border-[var(--line)] p-4 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="font-prova text-xl font-semibold mb-1">Reta Final</h1>
            {navegacao(true)}
            <div className="mt-auto">{blocoPerfil}</div>
          </div>
        </div>
      )}

      {/* sidebar fixa (desktop) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 border-r border-[var(--line)] bg-[var(--paper)] p-5 flex-col gap-1 overflow-y-auto">
        <h1 className="font-prova text-xl font-semibold mb-1">Reta Final</h1>
        <p className="eyebrow mb-4">Questões reais · 4 concursos</p>
        {navegacao(false)}
        <div className="mt-auto">{blocoPerfil}</div>
      </aside>
    </>
  );
}
