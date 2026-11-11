/**
 * WealthOS Granular Component-Level Error Boundary.
 *
 * Prevents isolated widget or chart rendering issues from bringing down the entire screen.
 * Displays a lightweight, context-aware recovery card with a 1-tap retry button.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { logger } from '../logger';

interface WidgetErrorBoundaryProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Component render issue',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`[WidgetErrorBoundary:${this.props.name}] Caught render error:`, error.message, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.topRow}>
            <Text style={styles.icon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Unable to render {this.props.name}</Text>
              <Text style={styles.subtitle}>
                Your local financial ledger remains intact.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

