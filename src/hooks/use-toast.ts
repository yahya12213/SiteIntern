// Minimal toast hook stub
export const useToast = () => {
  return {
    toast: ({ title, description, variant }: any) => {
      console.log(`Toast [${variant || 'default'}]:`, title, description);
      // In production, replace with actual toast implementation (e.g., react-hot-toast, sonner, etc.)
      alert(`${title}\n\n${description || ''}`);
    },
  };
};
