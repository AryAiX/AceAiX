export default function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div style={{
        position: 'absolute',
        width: '70vw', height: '70vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,128,237,0.22) 0%, transparent 70%)',
        filter: 'blur(72px)',
        top: '-20%', left: '-10%',
        animation: 'aurora1 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: '55vw', height: '55vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184,241,53,0.10) 0%, transparent 70%)',
        filter: 'blur(64px)',
        bottom: '-15%', right: '-5%',
        animation: 'aurora2 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: '40vw', height: '40vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,128,237,0.08) 0%, transparent 70%)',
        filter: 'blur(56px)',
        top: '40%', right: '20%',
        animation: 'aurora3 26s ease-in-out infinite',
      }} />
    </div>
  );
}
