import { useRoute } from "wouter";
import { useGetWalletTransactions } from "@workspace/api-client-react";
import { useSolanaWebSocket } from "@/hooks/use-solana-ws";
import { Copy, ExternalLink, Activity, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

function truncateMiddle(str: string, chars = 8) {
  if (!str) return "";
  if (str.length <= chars * 2) return str;
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

export default function WalletView() {
  const [, params] = useRoute("/wallet/:address");
  const address = params?.address;
  const { toast } = useToast();

  const { data, isLoading, error } = useGetWalletTransactions(
    address || "", 
    { limit: 50 },
    { query: { enabled: !!address, refetchOnWindowFocus: false } }
  );

  const { status: wsStatus } = useSolanaWebSocket(address);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard.`,
      duration: 2000,
    });
  };

  if (!address) return null;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-24 w-full bg-card/50 animate-pulse rounded-2xl border border-white/5" />
        <div className="h-[400px] w-full bg-card/30 animate-pulse rounded-2xl border border-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center max-w-md">
          <Activity className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Failed to load wallet</h2>
          <p className="text-muted-foreground">The wallet address might be invalid or there was an error connecting to the Solana RPC.</p>
        </div>
      </div>
    );
  }

  const transactions = data?.transactions || [];
  const wallet = data?.wallet;

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-h-full">
      {/* Header Card */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-700">
           <Activity className="w-48 h-48 text-primary" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white/5 hover:bg-white/10 text-xs font-medium uppercase tracking-wider py-1 border-white/10">
                Tracking Active
              </Badge>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {wsStatus === "connected" ? (
                  <><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span></span> <span className="text-primary">Live (WS)</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 text-muted-foreground" /> <span className="text-muted-foreground">Connecting...</span></>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-sm text-muted-foreground">Wallet Address</h2>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground break-all tracking-tight">
                  {address.slice(0, 8)}<span className="text-muted-foreground">...</span>{address.slice(-8)}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(address, "Address")} className="hover:bg-white/10">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" asChild className="hover:bg-white/10">
                  <a href={`https://solscan.io/account/${address}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 min-w-[120px]">
              <div className="text-sm text-muted-foreground mb-1">Total Txs</div>
              <div className="text-2xl font-bold font-mono">{transactions.length}</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 min-w-[120px]">
              <div className="text-sm text-muted-foreground mb-1">Started</div>
              <div className="text-sm font-medium mt-2">
                 {wallet ? formatDistanceToNow(new Date(wallet.createdAt), { addSuffix: true }) : 'Just now'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-black/10 flex justify-between items-center">
          <h3 className="font-display font-semibold text-lg">Transaction Feed</h3>
          <div className="text-xs text-muted-foreground">Showing latest {transactions.length}</div>
        </div>
        
        <div className="overflow-x-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-black/20 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-white/5">Signature</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Time</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Slot</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-right">Fee (SOL)</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                      Waiting for transactions...
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <motion.tr 
                      key={tx.signature}
                      initial={{ opacity: 0, backgroundColor: 'rgba(0,255,255,0.1)' }}
                      animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                      transition={{ duration: 1 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary group-hover:text-accent transition-colors">
                            {truncateMiddle(tx.signature, 8)}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => handleCopy(tx.signature, "Signature")} className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {tx.blockTime 
                          ? formatDistanceToNow(tx.blockTime * 1000, { addSuffix: true }) 
                          : formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-muted-foreground">
                        {tx.slot ? tx.slot.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
                        {tx.fee ? (tx.fee / 1e9).toFixed(5) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {tx.status.toLowerCase() === 'success' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium">
                            Failed
                          </Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
