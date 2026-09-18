export function pontuar(banca: string, certas: number, erradas: number): number {
  if (banca === 'Cebraspe') return certas - erradas; // +1/−1/0 oficial
  return certas;                                      // Cesgranrio/FGV: sem penalidade
}
