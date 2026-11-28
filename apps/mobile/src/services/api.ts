import {
  AnalyzeRequest,
  AnalyzeResponse,
  BriefingRequest,
  BriefingResponse,
  HistoryResponse,
  ReclaimLogRequest,
  ScanRequest,
  ScanResponse,
} from "../types/api";

function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw || raw.includes("<")) {
    return "https://solcheck-mu.vercel.app";
  }
  return raw.replace(/\/+$/, "");
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status} on ${path}`);
  }
  return data;
}

export const solcheckApi = {
  scanWallet(payload: ScanRequest): Promise<ScanResponse> {
    return requestJson<ScanResponse>("/api/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  analyzeWallet(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
    return requestJson<AnalyzeResponse>("/api/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getVoiceBriefing(payload: BriefingRequest): Promise<BriefingResponse> {
    return requestJson<BriefingResponse>("/api/briefing", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logReclaimEvent(
    payload: ReclaimLogRequest
  ): Promise<{ ok: boolean; eventId: string; explorerUrl: string }> {
    return requestJson("/api/reclaim-log", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getHistory(walletAddress: string): Promise<HistoryResponse> {
    return requestJson<HistoryResponse>(
      `/api/history?wallet=${encodeURIComponent(walletAddress)}`
    );
  },
};
