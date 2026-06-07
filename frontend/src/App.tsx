import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import TeamAnalysis from "./pages/TeamAnalysis";
import Prediction from "./pages/Prediction";
import LiveMonitor from "./pages/LiveMonitor";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/teams" element={<TeamAnalysis />} />
          <Route path="/teams/:id" element={<TeamAnalysis />} />
          <Route path="/predictions" element={<Prediction />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
