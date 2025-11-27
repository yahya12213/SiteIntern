import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.tsx'

// Créer une instance du QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch when window regains focus
      retry: 1,
      staleTime: 1 * 60 * 1000, // 1 minute (reduced from 5 for better freshness)
      cacheTime: 30 * 60 * 1000, // 30 minutes cache retention
      refetchOnMount: 'always', // Always refetch when component mounts
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
