import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Customers from "./pages/Customers";
import CustomerEdit from "./pages/CustomerEdit";
import CustomerNew from "./pages/CustomerNew";
import Rentals from "./pages/Rentals";
import Financial from "./pages/Financial";
import Conversations from "./pages/Conversations";
import FlowBuilder from "./pages/FlowBuilder";
import WhatsAppConfig from "./pages/WhatsAppConfig";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerEdit />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/flow-builder" element={<FlowBuilder />} />
          <Route path="/whatsapp" element={<WhatsAppConfig />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
