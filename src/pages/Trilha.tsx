import { CONCURSOS } from '../data/concursos';

export default function Trilha() {
  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Trilha de estudo</p>
      <h2 className="font-prova text-3xl font-semibold mb-6">Disciplinas e pontos de atenção da banca</h2>
      {CONCURSOS.map((c) => (
        <section key={c.nome} className="mb-8">
          <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">
            {c.nome} <span className="eyebrow ml-2">{c.banca}</span>
          </h3>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
            <tbody>
              {c.disciplinas.map((d) => (
                <tr key={d.nome} className="border-b border-[var(--line)]">
                  <td className="py-2 font-prova font-semibold w-1/3">{d.nome}</td>
                  <td className="py-2 w-1/4 text-neutral-600">{d.peso}</td>
                  <td className="py-2 text-neutral-700">{d.atencao}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <p className="text-xs mt-2 text-neutral-500">Formato: {c.formato} · Pontuação: {c.regra}</p>
        </section>
      ))}
    </div>
  );
}
