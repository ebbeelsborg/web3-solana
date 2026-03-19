import { useState } from "react";
import { useLocation } from "wouter";
import { useAddWallet, getListWalletsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [address, setAddress] = useState("");
  const [, setLocation] = useLocation();
  const { mutate: addWallet, isPending } = useAddWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    addWallet(
      { data: { address: address.trim() } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
          setLocation(`/wallet/${data.address}`);
        },
        onError: (error: any) => {
          const status = error?.status;
          const walletAddress = error?.data?.address;
          if (status === 409 && walletAddress) {
            queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
            setLocation(`/wallet/${walletAddress}`);
            return;
          }
          toast({
            variant: "destructive",
            title: "Invalid Address",
            description: error?.data?.error || "Could not track this wallet address.",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-12 relative">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center space-y-8 z-10"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" /> Real-time transaction streaming
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-bold leading-tight">
            Track any Solana <br />
            <span className="text-gradient">Wallet Live.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Monitor incoming and outgoing transactions instantly. No page refreshes. Pure WebSockets.
          </p>
        </div>

        <form onSubmit={handleTrack} className="relative group max-w-xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <Search className="w-6 h-6 text-muted-foreground ml-3" />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Paste Solana Wallet Address..."
              className="border-0 bg-transparent focus-visible:ring-0 text-base sm:text-lg font-mono placeholder:font-sans h-12"
            />
            <Button 
              type="submit" 
              disabled={isPending || !address.trim()} 
              className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
            >
              {isPending ? "Tracking..." : "Track Live"}
              {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
          {[
            { icon: Clock, title: "Real-Time Updates", desc: "Transactions pushed instantly via WebSockets" },
            { icon: Shield, title: "No Authentication", desc: "Track public ledgers anonymously" },
            { icon: Zap, title: "Blazing Fast", desc: "Built on direct RPC node polling" }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
              className="glass-panel p-6 rounded-2xl text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
