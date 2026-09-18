import { useState } from 'react';
import type { Modulo } from './types';
import Sidebar from './components/Sidebar';
import Inicio from './pages/Inicio';
import Trilha from './pages/Trilha';
import Cronograma from './pages/Cronograma';
import Conteudo from './pages/Conteudo';
import Banco from './pages/Banco';
import QuestoesIA from './pages/QuestoesIA';
import Simulado from './pages/Simulado';
import Tutor from './pages/Tutor';
import Redacao from './pages/Redacao';
import Desempenho from './pages/Desempenho';
import { useAIStatus } from './lib/trpc';

export interface PresetBanco { concurso: string; disciplina: string; }

export default function App() {
  const [modulo, setModulo] = useState<Modulo>('inicio');
  const [presetBanco, setPresetBanco] = useState<PresetBanco | null>(null);
  const ia = useAIStatus();
  return (
    <div className="min-h-screen">
      <Sidebar modulo={modulo} ir={setModulo} />
      <main className="px-4 sm:px-6 md:ml-60 md:px-10 py-6 md:py-8 max-w-4xl">
        {modulo === 'inicio' && <Inicio ir={setModulo} />}
        {modulo === 'trilha' && <Trilha />}
        {modulo === 'cronograma' && (
          <Cronograma
            irBanco={(concurso, disciplina) => {
              setPresetBanco({ concurso, disciplina });
              setModulo('banco');
            }}
          />
        )}
        {modulo === 'conteudo' && <Conteudo iaDisponivel={Boolean(ia?.disponivel)} />}
        {modulo === 'banco' && <Banco preset={presetBanco} />}
        {modulo === 'ia' && <QuestoesIA />}
        {modulo === 'simulado' && <Simulado />}
        {modulo === 'redacao' && <Redacao />}
        {modulo === 'tutor' && <Tutor />}
        {modulo === 'desempenho' && <Desempenho />}
      </main>
    </div>
  );
}
