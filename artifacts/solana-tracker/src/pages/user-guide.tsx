import { BookOpen, Search, Zap, Activity, Info } from "lucide-react";

export default function UserGuide() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 pb-20">
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BookOpen className="w-48 h-48 text-primary" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-medium mb-6">
            <Info className="w-4 h-4" /> Documentation
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold mb-4">
            How to use SolTracker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            SolTracker is a live, real-time dashboard for monitoring any Solana
            wallet address using pure WebSockets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-primary/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-display font-semibold">
            1. Find an Address
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            You need a valid Solana Base58 public key. You can find one by
            looking at{" "}
            <a
              href="https://solscan.io"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Solscan
            </a>
            , searching for recent blocks, or copying your own public key from
            Phantom or Solflare.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-accent/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-xl font-display font-semibold">
            2. Start Tracking
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Paste the address into the search bar in the sidebar or dashboard
            and click "Track Live". The dashboard will instantly fetch the
            latest 50 transactions.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-emerald-500/30 transition-colors md:col-span-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-xl font-display font-semibold">
            3. Watch the Magic
          </h3>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            Once tracking, SolTracker opens a direct WebSocket connection to the
            backend. As soon as a transaction involving that wallet is confirmed
            on the Solana mainnet, it will immediately animate into the top of
            your feed.
            <br />
            <br />
            You can track multiple wallets—just use the sidebar to switch
            between them. Each wallet maintains its own live feed.
          </p>
        </div>
      </div>
    </div>
  );
}
