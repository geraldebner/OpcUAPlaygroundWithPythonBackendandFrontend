import { useState, useEffect, useCallback } from 'react';

export interface TestOverviewData {
  blockIndex: number;
  lastUpdated: string;
  globalData: GlobalData | null;
  allgemeineParameter: AllgemeineParameter | null;
  ventilData: VentilStatusData[];
}

export interface GlobalData {
  batteryStatus: number;
  generalErrors: number;
  temperaturePLC: number;
  version: number;
}

export interface AllgemeineParameter {
  fehlerbit: number | null;
  currentAirPressure: number | null;
  currentAirFlow: number | null;
  currentForce: number | null;
  messMode: number | null;
  operationMode: number | null;
}

export interface VentilStatusData {
  ventilNr: number;
  zaehler: number;
  strom: MeasurementTypeData;
  durchfluss: MeasurementTypeData;
  kraft: MeasurementTypeData;
}

export interface MeasurementTypeData {
  status: number;
  datenReady: number;
  messID: number;
}

/**
 * Hook to fetch test overview data from the backend cache service
 */
export function useCache(apiBase: string, blockIndex: number, autoRefresh: boolean = false, refreshIntervalMs: number = 2000) {
  const [data, setData] = useState<TestOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBase}/api/cache/${blockIndex}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch test overview data: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching test overview data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, blockIndex]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      fetchData(); // Initial fetch
      const interval = setInterval(fetchData, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData, refreshIntervalMs]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to manage the cache service (start/stop/status)
 */
export function useCacheService(apiBase: string) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/cache/status`);
      if (response.ok) {
        const result = await response.json();
        setStatus(result);
      }
    } catch (err) {
      console.error('Error fetching cache service status:', err);
    }
  }, [apiBase]);

  const start = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/cache/start`, { method: 'POST' });
      if (response.ok) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error starting cache service:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiBase, fetchStatus]);

  const stop = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/cache/stop`, { method: 'POST' });
      if (response.ok) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error stopping cache service:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiBase, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, start, stop, refresh: fetchStatus };
}
