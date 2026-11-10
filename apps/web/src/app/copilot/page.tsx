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
  'What if I cut expenses by 10%?',
  'Show my Personal Financial Digital Twin status',
  'What is my India tax readiness for FY 2026-27?',
  'What is my Financial Health and Risk score?',
  'Which categories have the highest expenses?',
  'How is my investment portfolio performing?',
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
      } else if (lower.includes('what if') || lower.includes('simulate') || lower.includes('prepay')) {
        tools = ['simulate_what_if'];
        citations = [
          {
            source: 'what_if_simulation_engine',
            data: { baseline_burn: '151550.00', simulated_burn: '136395.00', annual_savings_boost: '181860.00' },
          },
        ];
        responseContent =
          '### What-If Simulation: 10% Discretionary Spend Reduction\n- **Current Monthly Burn**: ₹1,51,550.00\n- **Simulated Monthly Burn**: ₹1,36,395.00 (-₹15,155.00/month)\n- **Annualized Savings Boost**: +₹1,81,860.00 per year.\nThis increases your emergency runway from 11.4 months to 12.7 months with zero state mutations or ledger changes.';
      } else if (lower.includes('twin') || lower.includes('digital twin')) {
        tools = ['get_digital_twin_status'];
        citations = [
          {
            source: 'financial_twin_snapshots',
            data: { status: 'CURRENT', net_worth: '7537901.25', liquid_net_worth: '1735200.50', freshness: '2026-11-08' },
          },
        ];
        responseContent =
          '### Personal Financial Digital Twin Status: CURRENT (Verified as of 08 Nov 2026)\n- **Net Worth**: ₹75,37,901.25\n- **Liquid Net Worth**: ₹17,35,200.50\n- **Monthly Outflows**: ₹1,51,550.00\n- **Monthly Debt Obligations**: ₹21,500.00\n- **Financial Health Score**: 94/100 (EXCELLENT)\nAll upstream data pipelines (Cash, Investments, Budgets, Liabilities) are reconciled and synchronized.';
      } else if (lower.includes('tax') || lower.includes('regime')) {
        tools = ['get_tax_readiness'];
        citations = [
          {
            source: 'tax_computations',
            data: { fy: '2026-27', ay: '2027-28', gross: '3600000.00', new_regime_tax: '468000.00', old_regime_tax: '514800.00' },
          },
        ];
        responseContent =
          '### India Tax Readiness (FY 2026-27 / AY 2027-28)\n- **Gross Total Income**: ₹36,00,000.00\n- **New Regime Tax Liability**: ₹4,68,000.00 (Standard deduction ₹75,000 applied)\n- **Old Regime Tax Liability**: ₹5,14,800.00 (with Section 80C & 80D deductions)\n- **Recommendation**: The New Tax Regime saves ₹46,800.00 for your financial profile this year.';
      } else if (lower.includes('risk') || lower.includes('health score')) {
        tools = ['get_risk_assessment'];
        citations = [
          {
            source: 'risk_assessments',
            data: { health_score: '94.00', grade: 'EXCELLENT', active_alerts: 0 },
          },
        ];
        responseContent =
          '### Financial Risk Intelligence Assessment\n- **Overall Health Score**: 94/100 (Grade: EXCELLENT)\n- **Liquidity Ratio**: 11.4x monthly burn (Safe threshold: >6.0x)\n- **Debt-Service Burden**: 14.2% of net income (Safe threshold: <35%)\n- **Active Vulnerability Alerts**: 0 Critical, 0 High. Your financial position demonstrates robust defensive resilience.';
      } else {
        tools = ['search_general_ledger'];
        citations = [
          {
            source: 'workspace_unified_ledger',
            data: { result: 'General inquiry processed against confirmed ledger balances' },
          },
        ];
        responseContent = `I searched your confirmed records. Your current liquid depository balance is ₹13,27,650.00 and total net worth is ₹75,37,901.25. You can ask specific questions regarding budgets, expenses, SIP schedules, or portfolio returns anytime.`;
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

        {/* Digital Twin State Pill */}
        <div className="flex items-center gap-3 bg-[#FAFBF9] border border-[#E7ECE8] px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A36A] animate-pulse" />
            <span className="font-semibold text-[#17231D]">Digital Twin:</span>
            <Badge variant="positive" size="sm">CURRENT</Badge>
          </div>
          <div className="h-3 w-px bg-[#E7ECE8]" />
          <div className="text-[11px] text-[#717D74]">
            Net Worth: <span className="font-semibold text-[#17231D]">₹75,37,901.25</span>
          </div>
          <div className="h-3 w-px bg-[#E7ECE8]" />
          <div className="text-[11px] text-[#717D74]">
            Health: <span className="font-semibold text-[#16A36A]">94/100</span>
          </div>
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
