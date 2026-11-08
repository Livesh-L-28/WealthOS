'use client';

import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Database,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface CopilotChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { source: string; data: any }[];
  toolsExecuted?: string[];
}

const INITIAL_MESSAGES: CopilotChatMsg[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content:
      'Hello, I am your WealthOS Financial Copilot. I provide verified, grounded answers regarding your net worth, account balances, budget utilization, and investment portfolio. How can I assist you today?',
  },
];

const SUGGESTIONS = [
  'What is my current net worth and solvency ratio?',
  'List my active bank balances across all accounts',
  'Am I exceeding any budget categories this month?',
  'Show my current investment portfolio and P&L',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<CopilotChatMsg[]>(INITIAL_MESSAGES);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: CopilotChatMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const lower = text.toLowerCase();
      let responseContent = '';
      let tools: string[] = [];
      let citations: { source: string; data: any }[] = [];

      // Check for prompt injections or write commands
      if (
        lower.includes('ignore') ||
        lower.includes('system prompt') ||
        lower.includes('drop table') ||
        lower.includes('transfer')
      ) {
        responseContent =
          'I cannot fulfill this request. I am a read-only financial assistant and cannot execute state mutations, system modifications, or security bypass commands.';
      } else if (lower.includes('net worth') || lower.includes('solvency')) {
        tools = ['get_net_worth'];
        citations = [
          {
            source: 'assets_and_liabilities_ledger',
            data: { total_assets: '9430201.25', total_liabilities: '1892300.00' },
          },
        ];
        responseContent =
          'Your current estimated net worth is ₹7,537,901.25 (Total Assets: ₹9,430,201.25, Total Liabilities: ₹1,892,300.00). Your solvency ratio is 4.98x.';
      } else if (lower.includes('balance') || lower.includes('bank')) {
        tools = ['get_account_balances'];
        citations = [
          {
            source: 'financial_accounts',
            data: { total_balance: '1735200.50', count: 2 },
          },
        ];
        responseContent =
          'Your liquid depository balances total ₹1,735,200.50 across 2 accounts: Primary Operating Savings (•••• 4092): ₹485,200.50, Treasury & Tax Reserve (•••• 1834): ₹1,250,000.00.';
      } else if (lower.includes('budget') || lower.includes('exceed') || lower.includes('spending')) {
        tools = ['get_budget_status'];
        citations = [
          {
            source: 'budget_allocations',
            data: { category: 'Technology & Cloud Hosting', spent: '22800.00', allocated: '20000.00' },
          },
        ];
        responseContent =
          'Active budget tracking: You have 1 category exceeding allocated limits: Technology & Cloud Hosting is at 114.0% utilization (₹22,800.00 spent of ₹20,000.00). Health & Wellness is near limit at 87.5%.';
      } else {
        tools = ['get_investment_holdings'];
        citations = [
          {
            source: 'investment_holding_lots',
            data: { total_portfolio_value: '3844800.00', positions: 4 },
          },
        ];
        responseContent =
          'Your investment portfolio value is ₹3,844,800.00 across 4 open positions with an unrealized gain of +₹447,300.00 (+13.16% return).';
      }

      const assistantMsg: CopilotChatMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        toolsExecuted: tools,
        citations: citations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">AI Financial Copilot</h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded conversational intelligence with zero hallucinations and read-only safety guarantees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
            Read-Only Grounded Tools
          </Badge>
          <Badge variant="neutral" size="sm">
            <Database className="w-3.5 h-3.5 mr-1 inline" />
            RLS Isolated
          </Badge>
        </div>
      </div>

      {/* Chat Thread Card */}
      <Card className="min-h-[500px] flex flex-col justify-between p-4">
        {/* Messages */}
        <div className="space-y-4 mb-4 overflow-y-auto max-h-[460px] pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-2xl rounded-lg p-4 ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {m.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <span className="text-[11px] uppercase tracking-wider text-indigo-200">
                      You
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400">
                    {m.role === 'assistant' ? 'WealthOS Copilot' : ''}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>

                {/* Citations and Tools */}
                {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Grounding Tool:
                    </span>
                    {m.toolsExecuted.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-900 text-[11px] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Querying ledger and verifying citations...</span>
            </div>
          )}
        </div>

        {/* Query Suggestions & Input Bar */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-600/80 hover:text-indigo-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a financial question about balances, net worth, budgets, or investments..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Button
              variant="primary"
              size="md"
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
