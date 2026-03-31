import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListWallets,
  useAddWallet,
  getListWalletsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wallet as WalletIcon,
  Search,
  Plus,
  Activity,
  BookOpen,
  Hexagon,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: wallets, isLoading: isLoadingWallets } = useListWallets();
  const { mutate: addWallet, isPending: isAdding } = useAddWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newWallet, setNewWallet] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleTrackWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.trim()) return;

    addWallet(
      { data: { address: newWallet.trim() } },
      {
        onSuccess: (data) => {
          setNewWallet("");
          queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
          toast({
            title: "Wallet Tracked",
            description: "Successfully added wallet to monitoring.",
          });
          setLocation(`/wallet/${data.address}`);
        },
        onError: (error: any) => {
          const status = error?.status;
          const walletAddress = error?.data?.address;
          if (status === 409 && walletAddress) {
            setNewWallet("");
            queryClient.invalidateQueries({
              queryKey: getListWalletsQueryKey(),
            });
            setLocation(`/wallet/${walletAddress}`);
            return;
          }
          toast({
            variant: "destructive",
            title: "Failed to track wallet",
            description: error?.data?.error || "Invalid Solana address.",
          });
        },
      },
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col h-full border-r border-white/5 bg-card/40 backdrop-blur-xl relative z-20"
          >
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Hexagon className="w-6 h-6 text-primary-foreground fill-current opacity-80" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-foreground">
                  SolTracker
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  Live Blockchain Monitor
                </p>
              </div>
            </div>

            <div className="p-4">
              <form onSubmit={handleTrackWallet} className="flex gap-2">
                <Input
                  value={newWallet}
                  onChange={(e) => setNewWallet(e.target.value)}
                  placeholder="Enter SOL address..."
                  className="bg-black/20 border-white/10 focus-visible:ring-primary/50 font-mono text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isAdding}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 py-2 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Navigation
                </h3>
                <nav className="space-y-1">
                  <Link
                    href="/"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location === "/" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                  >
                    <Activity className="w-4 h-4" />
                    <span className="font-medium text-sm">Dashboard</span>
                  </Link>
                  <Link
                    href="/guide"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location === "/guide" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium text-sm">User Guide</span>
                  </Link>
                </nav>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex justify-between items-center">
                  <span>Tracked Wallets</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-white/5"
                  >
                    {wallets?.length || 0}
                  </Badge>
                </h3>

                {isLoadingWallets ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : wallets?.length === 0 ? (
                  <div className="text-center p-4 text-sm text-muted-foreground bg-white/5 rounded-lg border border-white/5 border-dashed">
                    No wallets tracked yet.
                  </div>
                ) : (
                  <nav className="space-y-1">
                    {wallets?.map((wallet) => (
                      <Link
                        key={wallet.id}
                        href={`/wallet/${wallet.address}`}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                          location === `/wallet/${wallet.address}`
                            ? "bg-primary/10 border border-primary/20 text-primary shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]"
                            : "border border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <WalletIcon
                            className={`w-4 h-4 shrink-0 ${location === `/wallet/${wallet.address}` ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                          />
                          <span className="font-mono text-sm truncate">
                            {wallet.address.slice(0, 6)}...
                            {wallet.address.slice(-6)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-card/20 backdrop-blur-md flex items-center px-4 justify-between shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.8)]"></span>
              Mainnet-Beta
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
