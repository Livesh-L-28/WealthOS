import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { CopilotMessage } from '../types';

interface CopilotScreenProps {
  messages: CopilotMessage[];
  chatInput: string;
  onChatInputChange: (text: string) => void;
  onSendMessage: (customText?: string) => void;
}

export const CopilotScreen: React.FC<CopilotScreenProps> = ({
  messages,
  chatInput,
  onChatInputChange,
  onSendMessage,
}) => {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const canvasBg = isDark ? '#0B0F19' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const assistantBubbleBg = isDark ? '#1E293B' : '#FFFFFF';

  const scrollViewRef = useRef<ScrollView>(null);

  const suggestedQueries = [
    { label: '🛡️ Emergency Runway', prompt: 'What is my current emergency fund runway?' },
    { label: '✈️ Afford ₹1.5L Trip?', prompt: 'Can I afford a ₹1,50,000 vacation?' },
    { label: '📈 Optimal Monthly SIP', prompt: 'How much surplus can I deploy into SIPs?' },
    { label: '⚖️ Verify Ledger Sigma', prompt: 'Verify ledger reconciliation balance' },
    { label: '☕ Top Expense Category', prompt: 'What was my highest expense category this month?' },
    { label: '🎯 Goals On Track?', prompt: 'Analyze my goal progress and savings rate' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: canvasBg }]}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.badgeRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI FINANCIAL DIGITAL TWIN</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>● Ledger Grounded</Text>
          </View>
        </View>

        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          WealthOS Autonomous Copilot
        </Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          Mathematically verified responses grounded directly in your double-entry accounts, FIFO lots, and cash flow history.
        </Text>
      </View>

      {/* Suggested Chips Carousel */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>SUGGESTED INQUIRIES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {suggestedQueries.map((q, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionChip}
              onPress={() => onSendMessage(q.prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrapper,
                isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperCopilot,
              ]}
            >
              <View
                style={[
                  styles.chatBubble,
                  isUser ? styles.bubbleUser : styles.bubbleCopilot,
                ]}
              >
                <View style={styles.bubbleHeader}>
                  <Text
                    style={[
                      styles.senderText,
                      isUser ? styles.senderUser : styles.senderCopilot,
                    ]}
                  >
                    {isUser ? 'YOU' : 'WEALTHOS COPILOT'}
                  </Text>
                  <Text style={styles.timestampText}>{msg.timestamp}</Text>
                </View>

                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextCopilot,
                  ]}
                >
                  {msg.text}
                </Text>

                {msg.metrics && (
                  <View style={styles.metricsContainer}>
                    {msg.metrics.map((m, mIdx) => (
                      <View key={mIdx} style={styles.metricPill}>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                        <Text style={styles.metricVal}>{m.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about cashflow, taxes, or runway..."
            placeholderTextColor={theme.colors.textMuted}
            value={chatInput}
            onChangeText={onChatInputChange}
            onSubmitEditing={() => onSendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !chatInput.trim() && styles.sendBtnDisabled]}
            onPress={() => onSendMessage()}
            disabled={!chatInput.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>Ask</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: theme.colors.canvas,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  suggestionsContainer: {
    marginVertical: 4,
  },
  suggestionsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleWrapperUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperCopilot: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    borderBottomRightRadius: 4,
  },
  bubbleCopilot: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  senderUser: {
    color: theme.colors.primaryDark,
  },
  senderCopilot: {
    color: theme.colors.textSecondary,
  },
  timestampText: {
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  messageText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  messageTextUser: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  messageTextCopilot: {
    color: theme.colors.textPrimary,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  metricPill: {
    backgroundColor: '#FAFCFA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.borderStrong,
  },
  sendBtnText: {
    color: theme.colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
