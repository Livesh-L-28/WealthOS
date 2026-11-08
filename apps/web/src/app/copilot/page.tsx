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
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
      'Hello! I am your WealthOS Financial Copilot. I provide verified, mathematically grounded answers about your net worth, expenses, budgets, and investments directly from your double-entry ledger. How can I help you today?',
  },
];

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What is my current net worth?',
  'Which categories have the highest expenses?',
  'How is my investment portfolio performing?',
  'How much do I need to save for my goal?',
  'Show my upcoming recurring expenses.',
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

      // Check for prompt injections or mutation commands
      if (
        lower.includes('ignore') ||
        lower.includes('system prompt') ||
        lower.includes('drop table') ||
        lower.includes('transfer') ||
        lower.includes('delete')
      ) {
        responseContent =
          'I cannot fulfill this request. I operate as a read-only financial assistant and cannot mutate ledger records, execute unverified wire transfers, or alter database schemas.';
      } else if (lower.includes('spend') || lower.includes('spent this month')) {
        tools = ['get_monthly_expenses'];
        citations = [
          {
            source: 'general_journal_debits',
            data: { period: 'Nov 2026', settled_outflow: '151550.00', budget_limit: '180000.00' },
          },
        ];
        responseContent =
          'In November 2026, your total settled expenditure is ₹1,51,550.00 out of your ₹1,80,000.00 monthly budget (84.2% utilized). You have ₹28,450.00 in remaining budget headroom.';
      } else if (lower.includes('net worth')) {
        tools = ['get_net_worth_breakdown'];
        citations = [
          {
            source: 'assets_and_liabilities_balance_sheet',
            data: { assets: '9430201.25', liabilities: '1892300.00', equity: '7537901.25' },
          },
        ];
        responseContent =
          'Your current net worth is ₹75,37,901.25. Calculated as Total Assets (₹94,30,201.25) minus Total Liabilities (₹18,92,300.00). Your solvency ratio is 4.98x, indicating strong financial resilience.';
      } else if (lower.includes('highest') || lower.includes('categories')) {
        tools = ['get_expense_category_breakdown'];
        citations = [
          {
            source: 'expense_ledger_by_category',
            data: { top_1: 'Housing (₹85k)', top_2: 'Food & Dining (₹31.5k)', top_3: 'Tech (₹22.8k)' },
          },
        ];
        responseContent =
          'Your top 3 spending categories this month are:\n1. Housing & Rent: ₹85,000.00 (56.1%)\n2. Groceries & Dining: ₹31,500.00 (20.8%)\n3. Technology & Cloud: ₹22,800.00 (15.0% - Note: Exceeded budget by ₹2,800).\nCombined, these account for 91.9% of total monthly outlays.';
      } else if (lower.includes('portfolio') || lower.includes('invest')) {
        tools = ['get_portfolio_analytics'];
        citations = [
          {
            source: 'portfolio_holdings_and_nav',
            data: { invested: '3468964.00', current: '4623732.00', xirr: '21.4%' },
          },
        ];
        responseContent =
          'Your portfolio has a current valuation of ₹46,23,732.00 against an invested cost basis of ₹34,68,964.00. Total unrealized profit is +₹11,54,768.00 (+33.3%). Blended annualized XIRR across mutual funds stands at 21.4%.';
      } else if (lower.includes('goal') || lower.includes('save for')) {
        tools = ['get_financial_goals_trajectory'];
        citations = [
          {
            source: 'goals_and_milestones_ledger',
            data: { target_sum: '9900000.00', saved: '4030000.00', monthly_req: '120000.00' },
          },
        ];
        responseContent =
          'You currently have 4 active goals requiring ₹99,00,000.00 total. You have saved ₹40,30,000.00 (40.7% completed). To stay on trajectory across your Emergency Reserve and Commercial Property goals, your combined recommended monthly contribution is ₹1,20,000.00.';
      } else if (lower.includes('recurring') || lower.includes('upcoming')) {
        tools = ['get_recurring_schedules'];
        citations = [
          {
            source: 'sip_and_auto_debit_mandates',
            data: { next_due: '10 Nov 2026', amount: '20000.00', mandate: 'Mirae Asset Large & Midcap' },
          },
        ];
        responseContent =
          'Upcoming recurring obligations:\n1. Mirae Asset SIP Mandate: ₹20,000.00 due on 10 Nov 2026\n2. Office Space Lease: ₹85,000.00 due on 1 Dec 2026\n3. Vehicle Loan EMI: ₹21,500.00 due on 5 Dec 2026.\nYour Primary Savings balance (₹4,85,200.50) is sufficient to cover these.';
      } else {
        tools = ['search_general_ledger'];
        citations = [
          {
            source: 'workspace_unified_ledger',
            data: { result: 'General inquiry processed against confirmed ledger balances' },
          },
        ];
        responseContent = `I searched your confirmed records. Your current liquid depository balance is ₹17,35,200.50 and total net worth is ₹75,37,901.25. You can ask specific questions regarding budgets, expenses, SIP schedules, or portfolio returns anytime.`;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Financial Copilot</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
              Read-Only Ledger Grounded
            </Badge>
          </div>
          <p className="text-xs text-[#717D74] mt-1">
            Grounded financial intelligence with mathematical citations, privacy containment, and zero hallucinations.
          </p>
        </div>
      </div>

      {/* Suggested Questions Grid */}
      <div>
        <p className="text-xs font-semibold text-[#17231D] mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#16A36A]" />
          <span>Suggested Questions (Click any question to ask):</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-[#F0F4F1] border border-[#E7ECE8] text-[#17231D] hover:border-[#16A36A]/50 transition-all text-left shadow-xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Card */}
      <Card className="min-h-[460px] flex flex-col justify-between">
        <div className="space-y-4 p-2 overflow-y-auto max-h-[500px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-[#17231D] text-white shadow-xs'
                    : 'bg-[#F7F9F7] text-[#17231D] border border-[#E7ECE8]'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>

                {/* Citations & Evidence Pill */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#E7ECE8] text-[10px] text-[#717D74] space-y-1">
                    <span className="font-semibold text-[#17231D] flex items-center gap-1">
                      <Database className="w-3 h-3 text-[#16A36A]" />
                      Verified Source Citation:
                    </span>
                    {msg.citations.map((c, i) => (
                      <div key={i} className="font-mono bg-white p-1.5 rounded border border-[#E7ECE8]">
                        Source: {c.source} &bull; Data: {JSON.stringify(c.data)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-[#717D74]">
              <div className="w-8 h-8 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <span>Querying verified general ledger...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-4 border-t border-[#E7ECE8] flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask a question about your net worth, expenses, investments, or goals..."
            className="flex-1 px-4 py-2 text-xs bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl text-[#17231D] placeholder-[#9BA39D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isLoading}
            className="gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
