// Ilustração de "como vai ficar" o ícone do FisioGO na tela inicial do
// celular, usada na tela de cadastro logo abaixo do texto de instalação.
// Os outros "atalhos" ao redor são blocos sólidos sem marca nem símbolo —
// de propósito: evita parecer logo de um app real e mantém o olho no
// ícone do FisioGO, que é o único de verdade (vem de /icon-192.png).

function StatusBarGlyphs() {
  return (
    <span className="flex items-center gap-1 text-white/90">
      <span className="flex h-2 items-end gap-[1.5px]">
        <span className="block w-[2.5px] rounded-[1px] bg-current" style={{ height: "35%" }} />
        <span className="block w-[2.5px] rounded-[1px] bg-current" style={{ height: "55%" }} />
        <span className="block w-[2.5px] rounded-[1px] bg-current" style={{ height: "75%" }} />
        <span className="block w-[2.5px] rounded-[1px] bg-current" style={{ height: "100%" }} />
      </span>
      <svg viewBox="0 0 16 12" className="h-[9px] w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path
          d="M1 4.5a10 10 0 0 1 14 0M3.3 7a6.4 6.4 0 0 1 9.4 0M5.8 9.4a2.8 2.8 0 0 1 4.4 0"
          strokeLinecap="round"
        />
      </svg>
      <span className="relative h-2 w-[17px] rounded-[2px] border border-current p-px after:absolute after:-right-[3px] after:top-[2px] after:h-1 after:w-[2px] after:rounded-r-[1px] after:bg-current">
        <span className="block h-full w-4/5 rounded-[1px] bg-current" />
      </span>
    </span>
  );
}

function GenericTile({ className }: { className: string }) {
  return (
    <div
      className={
        "rounded-[22%] bg-brand-600 shadow-[0_3px_8px_-3px_rgba(5,12,30,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] " +
        className
      }
    />
  );
}

export function PwaHomeScreenMockup({ platform }: { platform: "iphone" | "android" }) {
  const isIphone = platform === "iphone";

  return (
    <div
      className="relative mx-auto aspect-[9/19.3] w-[200px] shrink-0 rounded-[34px] bg-gradient-to-br from-[#1b2740] to-[#0a0f1c] p-[9px]"
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 32px -14px rgba(10,15,30,0.45)" }}
    >
      {isIphone ? (
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-[84px] -translate-x-1/2 rounded-xl bg-[#0a0f1c]" />
      ) : (
        <div className="absolute left-1/2 top-3.5 z-10 h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-[#0a0f1c]" />
      )}

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[25px] bg-gradient-to-br from-brand-900 via-brand-700 to-[#163a8f]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 85% -10%, rgba(91,135,246,0.35), transparent 60%)",
          }}
        />

        <div className="relative z-[1] flex items-center justify-between px-3.5 pb-0.5 pt-2 text-[11px] font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
          <span>9:41</span>
          <StatusBarGlyphs />
        </div>

        <div className="relative z-[1] grid flex-1 content-start grid-cols-4 gap-x-2.5 gap-y-2.5 px-3 pt-3">
          <GenericTile className="aspect-square" />
          <div className="relative flex flex-col items-center gap-[3px]">
            <div className="motion-safe:animate-pulse absolute -inset-[7px] rounded-[30%] bg-[radial-gradient(circle,rgba(11,143,138,0.55),transparent_70%)]" />
            <img
              src="/icon-192.png"
              alt=""
              className="relative aspect-square w-full rounded-[22%] bg-white"
              style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,0.65), 0 6px 14px -4px rgba(0,0,0,0.5)" }}
            />
            <span className="relative text-[7.4px] font-bold text-white">FisioGO</span>
          </div>
          <GenericTile className="aspect-square" />
          <GenericTile className="aspect-square" />
          <GenericTile className="aspect-square" />
          <GenericTile className="aspect-square" />
          <GenericTile className="aspect-square" />
          <GenericTile className="aspect-square" />
        </div>

        <div className="relative z-[1] mx-1 flex items-center gap-1 self-end rounded-full border border-white/20 bg-[rgba(8,16,30,0.85)] py-1 pl-1.5 pr-[7px] text-[7px] font-semibold text-white">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-accent-600" />
          1 toque e já abre
        </div>

        {isIphone ? (
          <div className="relative z-[1] mx-2.5 mb-2 mt-2 flex justify-around rounded-[20px] bg-white/10 p-2">
            <GenericTile className="h-[30px] w-[30px]" />
            <GenericTile className="h-[30px] w-[30px]" />
            <GenericTile className="h-[30px] w-[30px]" />
            <GenericTile className="h-[30px] w-[30px]" />
          </div>
        ) : (
          <div className="relative z-[1] mb-1.5 mt-3 h-[3.5px] w-[100px] self-center rounded-full bg-white/50" />
        )}

        {isIphone && <div className="relative z-[1] mx-auto mb-[7px] h-1 w-[90px] rounded-full bg-white/55" />}
      </div>
    </div>
  );
}
