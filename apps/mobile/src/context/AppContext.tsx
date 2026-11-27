import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DICTIONARIES, Dictionary } from "../i18n";
import { solcheckApi } from "../services/api";
import {
  connectMobileWallet,
  disconnectMobileWallet,
  getMobileCluster,
  getRestoredWalletAddress,
} from "../solana/wallet";
import {
  AnalyzeResponse,
  AppLang,
  HistoryResponse,
  ScanResponse,
} from "../types/api";

const STORAGE_LANG_KEY = "@solcheck/preferred_lang";

interface AppContextValue {
  lang: AppLang;
  t: Dictionary;
  setLang: (next: AppLang) => Promise<void>;
  walletAddress: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  scanData: ScanResponse | null;
  isScanning: boolean;
  refreshScan: (addressOverride?: string) => Promise<ScanResponse | null>;
  analysis: AnalyzeResponse | null;
  isAnalyzing: boolean;
  refreshAnalysis: (opts?: {
    scanOverride?: ScanResponse;
    langOverride?: AppLang;
    forceRefreshFirecrawl?: boolean;
    userQuestion?: string;
  }) => Promise<void>;
  history: HistoryResponse | null;
  isLoadingHistory: boolean;
  refreshHistory: (addressOverride?: string) => Promise<void>;
  isPlayingAudio: boolean;
  isLoadingAudio: boolean;
  toggleVoiceBriefing: () => Promise<void>;
  stopVoiceBriefing: () => Promise<void>;
  lastError: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>("en");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  const stopVoiceBriefing = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore already unloaded sound
      }
      soundRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const refreshAnalysis = useCallback(
    async (opts?: {
      scanOverride?: ScanResponse;
      langOverride?: AppLang;
      forceRefreshFirecrawl?: boolean;
      userQuestion?: string;
    }) => {
      const targetScan = opts?.scanOverride ?? scanData;
      const targetLang = opts?.langOverride ?? lang;
      if (!targetScan) return;

      setIsAnalyzing(true);
      try {
        const res = await solcheckApi.analyzeWallet({
          walletAddress: targetScan.walletAddress,
          lang: targetLang,
          scanData: targetScan,
          forceRefreshFirecrawl: opts?.forceRefreshFirecrawl,
          userQuestion: opts?.userQuestion,
        });
        setAnalysis(res);
      } catch (err) {
        setLastError(
          err instanceof Error ? err.message : "AI analysis request failed."
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [scanData, lang]
  );

  const refreshHistory = useCallback(
    async (addressOverride?: string) => {
      const addr = addressOverride ?? walletAddress;
      if (!addr) return;
      setIsLoadingHistory(true);
      try {
        const res = await solcheckApi.getHistory(addr);
        setHistory(res);
      } catch (err) {
        console.warn("[History] Failed to fetch:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [walletAddress]
  );

  const refreshScan = useCallback(
    async (addressOverride?: string): Promise<ScanResponse | null> => {
      const addr = addressOverride ?? walletAddress;
      if (!addr) return null;

      setIsScanning(true);
      setLastError(null);
      try {
        const cluster =
          getMobileCluster() === "mainnet-beta" ? "mainnet-beta" : "devnet";
        const scanned = await solcheckApi.scanWallet({
          walletAddress: addr,
          cluster,
        });
        setScanData(scanned);

        // Kick off AI diagnosis and history refresh in parallel
        void refreshAnalysis({ scanOverride: scanned, langOverride: lang });
        void refreshHistory(addr);

        return scanned;
      } catch (err) {
        setLastError(
          err instanceof Error ? err.message : "Failed to scan Solana wallet."
        );
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [walletAddress, lang, refreshAnalysis, refreshHistory]
  );

  // Restore saved language and wallet address on app startup
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedLang = await AsyncStorage.getItem(STORAGE_LANG_KEY);
      const initialLang: AppLang = savedLang === "pt" ? "pt" : "en";
      if (mounted) setLangState(initialLang);

      const savedWallet = await getRestoredWalletAddress();
      if (mounted && savedWallet) {
        setWalletAddress(savedWallet);
        setIsScanning(true);
        try {
          const cluster =
            getMobileCluster() === "mainnet-beta" ? "mainnet-beta" : "devnet";
          const scanned = await solcheckApi.scanWallet({
            walletAddress: savedWallet,
            cluster,
          });
          if (!mounted) return;
          setScanData(scanned);
          void solcheckApi
            .analyzeWallet({
              walletAddress: savedWallet,
              lang: initialLang,
              scanData: scanned,
            })
            .then((res) => {
              if (mounted) setAnalysis(res);
            })
            .catch(() => {});
          void solcheckApi
            .getHistory(savedWallet)
            .then((res) => {
              if (mounted) setHistory(res);
            })
            .catch(() => {});
        } catch (err) {
          if (mounted) {
            setLastError(
              err instanceof Error ? err.message : "Initial scan failed."
            );
          }
        } finally {
          if (mounted) setIsScanning(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLang = useCallback(
    async (next: AppLang) => {
      if (next === lang) return;
      await stopVoiceBriefing();
      setLangState(next);
      await AsyncStorage.setItem(STORAGE_LANG_KEY, next);
      if (scanData) {
        await refreshAnalysis({ scanOverride: scanData, langOverride: next });
      }
    },
    [lang, scanData, refreshAnalysis, stopVoiceBriefing]
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setLastError(null);
    try {
      const { address } = await connectMobileWallet();
      setWalletAddress(address);
      await refreshScan(address);
    } catch (err) {
      setLastError(
        err instanceof Error ? err.message : "Wallet connection cancelled."
      );
    } finally {
      setConnecting(false);
    }
  }, [refreshScan]);

  const disconnect = useCallback(async () => {
    await stopVoiceBriefing();
    await disconnectMobileWallet();
    setWalletAddress(null);
    setScanData(null);
    setAnalysis(null);
    setHistory(null);
    setLastError(null);
  }, [stopVoiceBriefing]);

  const toggleVoiceBriefing = useCallback(async () => {
    if (isPlayingAudio) {
      await stopVoiceBriefing();
      return;
    }

    const script = analysis?.voiceScript;
    if (!script) return;

    setIsLoadingAudio(true);
    setLastError(null);
    try {
      const briefing = await solcheckApi.getVoiceBriefing({
        text: script,
        lang,
      });

      const fileUri = `${FileSystem.cacheDirectory}solcheck-briefing-${lang}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, briefing.audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      await stopVoiceBriefing();

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlayingAudio(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingAudio(false);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (err) {
      setLastError(
        err instanceof Error ? err.message : "Failed to play ElevenLabs audio."
      );
    } finally {
      setIsLoadingAudio(false);
    }
  }, [analysis?.voiceScript, isPlayingAudio, lang, stopVoiceBriefing]);

  return (
    <AppContext.Provider
      value={{
        lang,
        t: DICTIONARIES[lang],
        setLang,
        walletAddress,
        connecting,
        connect,
        disconnect,
        scanData,
        isScanning,
        refreshScan,
        analysis,
        isAnalyzing,
        refreshAnalysis,
        history,
        isLoadingHistory,
        refreshHistory,
        isPlayingAudio,
        isLoadingAudio,
        toggleVoiceBriefing,
        stopVoiceBriefing,
        lastError,
        clearError: () => setLastError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useSolCheck(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useSolCheck must be used inside <AppProvider>");
  }
  return ctx;
}
