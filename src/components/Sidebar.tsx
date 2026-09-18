import type { Modulo } from '../types';
import { usePerfis, criarPerfil, selecionarPerfil, removerPerfil, renomearPerfil } from '../lib/store';

const ITENS: { id: Modulo; rotulo: string }[] = [
  { id: 'inicio', rotulo: 'Início' },
  { id: 'trilha', rotulo: 'Trilha de estudo' },
  { id: 'cronograma', rotulo: 'Cronograma' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'banco', rotulo: 'Banco de questões' },
  { id: 'ia', rotulo: 'Questões IA' },
  { id: 'simulado', rotulo: 'Simulado' },
  { id: 'tutor', rotulo: 'Tutor IA' },
  { id: 'desempenho', rotulo: 'Desempenho' },
];

export default function Sidebar({ modulo, ir }: { modulo: Modulo; ir: (m: Modulo) => void }) {
  const { perfis, ativo } = usePerfis();
  const nomeAtivo = perfis.find((p) => p.id === ativo)?.nome ?? '';
  return (
    <aside className="fixed inset-y-0 left-0 w-60 border-r border-[var(--line)] bg-[var(--paper)] p-5 flex flex-col gap-1 overflow-y-auto">
      <h1 className="font-prova text-xl font-semibold mb-1">Reta Final</h1>
      <p className="eyebrow mb-4">Questões reais · 4 concursos</p>
      {ITENS.map((i) => (
        <button
          key={i.id}
          onClick={() => ir(i.id)}
          className={`text-left border-0 bg-transparent py-1.5 text-sm ${modulo === i.id ? 'font-bold underline underline-offset-4' : 'text-neutral-600'}`}
        >
          {i.rotulo}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t border-[var(--line)]">
        <p className="eyebrow mb-2">Perfil de estudo</p>
        <select className="w-full mb-2" value={ativo} onChange={(e) => selecionarPerfil(e.target.value)}>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <div className="flex gap-2">
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
        </div>
      </div>
    </aside>
  );
}
