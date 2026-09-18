import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/router';
import { useEffect, useState } from 'react';

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: import.meta.env.VITE_TRPC_URL ?? '/trpc' })],
});

export function useAIStatus(): { disponivel: boolean; mock: boolean } | null {
  const [s, setS] = useState<{ disponivel: boolean; mock: boolean } | null>(null);
  useEffect(() => {
    trpc.status.query().then(setS).catch(() => setS({ disponivel: false, mock: false }));
  }, []);
  return s;
}
