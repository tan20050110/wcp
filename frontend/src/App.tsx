import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import TeamAnalysis from "./pages/TeamAnalysis";
import Prediction from "./pages/Prediction";
import LiveMonitor from "./pages/LiveMonitor";
import Insights from "./pages/Insights";
import AILab from "./pages/AILab";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/teams" element={<TeamAnalysis />} />
          <Route path="/teams/:id" element={<TeamAnalysis />} />
          <Route path="/predictions" element={<Prediction />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/ai-lab" element={<AILab />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
