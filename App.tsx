import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Receiving from './pages/Receiving';
import Planning from './pages/Planning';
import History from './pages/History';
import AiAssistant from './pages/AiAssistant';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
        <Navigation />
        {/* Added pt-16 on mobile to account for the fixed Top Header Logo */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/receiving" element={<Receiving />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/history" element={<History />} />
            <Route path="/assistant" element={<AiAssistant />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;