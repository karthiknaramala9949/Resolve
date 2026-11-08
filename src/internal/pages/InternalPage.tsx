import React, { useState } from 'react';
import { Card, Button, Input } from '@/design-system';
import { Terminal, Shield, Wrench, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InternalPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'features' | 'engines' | 'lab'>('features');
  const [search, setSearch] = useState('');

  // 44 resolution engines from original prototype
  const engines = [
    { id: 1, name: 'Complaint Understanding', group: 'Complaint & resolution', what: 'Understands the problem from consumer description' },
    { id: 2, name: 'Document Intelligence', group: 'Complaint & resolution', what: 'Analyses evidence references and document metadata' },
    { id: 3, name: 'Legal Intelligence', group: 'Complaint & resolution', what: 'Identifies legal topics for source verification' },
    { id: 4, name: 'Company Policy Intelligence', group: 'Complaint & resolution', what: 'Checks saved company policy references' },
    { id: 5, name: 'Solution Recommendation', group: 'Complaint & resolution', what: 'Recommends a practical next step from recorded facts' },
    { id: 6, name: 'Customer Authorization', group: 'Complaint & resolution', what: 'Keeps customer approval required before external actions' },
    { id: 7, name: 'Complaint Generation', group: 'Complaint & resolution', what: 'Prepares a professional complaint draft' },
    { id: 8, name: 'Complaint Submission', group: 'Complaint & resolution', what: 'Prepares a customer-controlled submission package' },
    { id: 9, name: 'Communication Management', group: 'Complaint & resolution', what: 'Organises messages, drafts and company replies' },
    { id: 10, name: 'Human Case Management', group: 'Complaint & resolution', what: 'Records local assignment and human handoff notes' },
    { id: 11, name: 'Follow-Up Management', group: 'Complaint & resolution', what: 'Tracks case reminders and pending actions' },
    { id: 12, name: 'Escalation Intelligence', group: 'Complaint & resolution', what: 'Suggests possible escalation routes' },
  ];

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/app/overview')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Consumer App</span>
        </button>

        <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          Internal Engineering Registry
        </span>
      </div>

      <div className="p-6 rounded-2xl bg-neutral-900 text-white space-y-2">
        <div className="flex items-center gap-2 text-brand-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          <span>Internal Engineering & Architecture Sandbox</span>
        </div>
        <h2 className="text-2xl font-bold font-serif">
          RESOLVE-ONE 150-Feature Register & 44-Engine Directory
        </h2>
        <p className="text-xs text-neutral-400 max-w-2xl">
          Isolated from the public consumer interface. Contains the engineering capabilities catalog, prototype experiments, access gates, and rule-based testbeds.
        </p>

        {/* Tab switcher */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => setTab('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'features' ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            150-Feature Catalog
          </button>
          <button
            type="button"
            onClick={() => setTab('engines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'engines' ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            44-Engine Directory
          </button>
          <button
            type="button"
            onClick={() => setTab('lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'lab' ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Prototype Lab & Migration
          </button>
        </div>
      </div>

      {tab === 'engines' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">44-Engine Resolution Registry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engines.map((e) => (
              <Card key={e.id} variant="default" className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-mono">Engine #{e.id}</span>
                  <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{e.group}</span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{e.name}</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{e.what}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'features' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">150-Feature Capability Register</h3>
          <Card variant="default" className="p-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              Full specification register categorized across Core Cases (A), Document Intelligence (B), Legal (C), Escalation (D), Consumer Protection (E), and Trust/Privacy (F).
            </p>
            <div className="text-xs font-mono space-y-1 text-neutral-700 dark:text-neutral-300">
              <div>• Cat A (Core): Universal Case Creation, Natural Language Intake, Timeline, Linking</div>
              <div>• Cat B (Documents): SHA-256 Hashing, Proof Pack PDF Generator, Redaction Checks</div>
              <div>• Cat C (Legal): Rights Verification, Consumer Protection Act 2019, Route Decision Tree</div>
              <div>• Cat D (Escalation): NCH 1915, e-Jagriti, RBI Ombudsman, Company Care Escalation</div>
              <div>• Cat E (Purchases): Return Window Math, Warranty Countdown, Import Diff Review</div>
              <div>• Cat F (Trust): Zero Telemetry, Local AES-GCM Encryption, JSON/Zip Export</div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'lab' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Prototype Migration & Lab</h3>
          <Card variant="default" className="p-6 space-y-4">
            <h4 className="text-sm font-semibold">Legacy Data Detection</h4>
            <p className="text-xs text-neutral-500">
              Reads local prototype key <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">resolve-one-prototype-v1</code> and IndexedDB <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">resolve-one-evidence-v1</code>.
            </p>
            <Button variant="secondary" size="sm" onClick={() => alert('Migration engine triggered')}>
              Run Test Migration
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

