export default function PageLoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-4 py-24">
      <div className="w-10 h-10 border-2 border-azure border-t-transparent rounded-full animate-spin" />
      <p className="text-slate text-sm">{label}</p>
    </div>
  );
}
