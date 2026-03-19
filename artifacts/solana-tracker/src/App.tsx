import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import WalletView from "@/pages/wallet-view";
import UserGuide from "@/pages/user-guide";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/wallet/:address" component={WalletView} />
      <Route path="/guide" component={UserGuide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30">
            {/* Global Decorative Background */}
            <img 
              src={`${import.meta.env.BASE_URL}images/crypto-bg.png`} 
              alt="" 
              className="fixed inset-0 w-full h-full object-cover opacity-[0.04] pointer-events-none mix-blend-screen" 
            />
            
            {/* Top glowing ambient light */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
            
            <Layout>
              <Router />
            </Layout>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
