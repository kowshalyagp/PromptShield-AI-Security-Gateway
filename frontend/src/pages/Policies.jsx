import React, { useState } from 'react';
import PolicyCard from '../components/PolicyCard';
import { Save } from 'lucide-react';

const Policies = () => {
  const [policies, setPolicies] = useState([
    { id: 'injection', title: 'Prompt Injection Defense', description: 'Detects attempts to take control of the LLM context or hijack model instructions.', enabled: true, score: 75 },
    { id: 'jailbreak', title: 'Jailbreak Signatures', description: 'Compares prompt semantic profiles against known system jailbreaks (DAN, Developer Mode, etc.).', enabled: true, score: 80 },
    { id: 'leakage', title: 'System Prompt Leakage', description: 'Prevents the model from printing instructions or training documents defined in the system role.', enabled: true, score: 85 },
    { id: 'manipulation', title: 'Role Manipulation', description: 'Identifies simulated dialogues where user mimics System/Assistant prompts inside inputs.', enabled: false, score: 60 },
    { id: 'harmful', title: 'Harmful Content Classifier', description: 'Filters illegal instruction queries, hate speech, malware writing, or dangerous requests.', enabled: true, score: 70 },
  ]);

  const handleToggle = (id) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const handleScoreChange = (id, newScore) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, score: newScore } : p));
  };

  const handleSave = () => {
    alert('Security policies saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-white">Active Security Guardrails</h3>
          <p className="text-xs text-gray-500">Configure sensitivity thresholds and block behaviors for the PromptShield Security Engine.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-900/10"
        >
          <Save size={16} />
          Save Configurations
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {policies.map(policy => (
          <PolicyCard
            key={policy.id}
            title={policy.title}
            description={policy.description}
            enabled={policy.enabled}
            score={policy.score}
            onToggle={() => handleToggle(policy.id)}
            onScoreChange={(val) => handleScoreChange(policy.id, val)}
          />
        ))}
      </div>
    </div>
  );
};

export default Policies;
