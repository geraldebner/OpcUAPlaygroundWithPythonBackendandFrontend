import { useState, useEffect, useCallback } from 'react';
import { useCache, TestOverviewData } from './useCache';

/**
 * Centralized status store for Allgemeine Parameter and Global Data per block.
 * Keeps a single source of truth shared across views.
 */
export function useStatusStore(apiBase: string, initialBlock: number, autoRefreshDefault = true, refreshIntervalMs = 2000) {
  const [selectedBlock, setSelectedBlock] = useState<number>(initialBlock);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(autoRefreshDefault);
  const { data, error, refresh } = useCache(apiBase, selectedBlock, autoRefresh, refreshIntervalMs);

  // Always fetch once on block change even when autoRefresh is off
  useEffect(() => {
    refresh();
  }, [selectedBlock, refresh]);

  const setBlock = useCallback((block: number) => {
    setSelectedBlock(block);
  }, []);

  return {
    selectedBlock,
    setBlock,
    autoRefresh,
    setAutoRefresh,
    data: data as TestOverviewData | null,
    error,
    refresh,
    messMode: data?.allgemeineParameter?.messMode ?? null,
    operationMode: data?.allgemeineParameter?.operationMode ?? null,
    batteryStatus: data?.globalData?.batteryStatus ?? null,
  };
}
