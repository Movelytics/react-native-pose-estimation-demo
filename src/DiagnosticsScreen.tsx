/**
 * Diagnostic screen — cold-start timings, acceleration report, backend A/B.
 *
 * Default runtime (both platforms, incl. Expo Go): offline WebView MoveNet.
 * iOS native build: + Apple Vision (opt-in).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  logAccelerationReport,
  usePoseTracker,
  WebViewPoseView,
  type PoseTrackerStatus,
} from '@posetracker-tracker/react-native-pose-estimation';

import type { BackendChoice } from '../App';

interface StatusTransition {
  status: PoseTrackerStatus;
  atMs: number;
  deltaMs: number;
}

export interface NativeCapabilities {
  expoGo: boolean;
  vision: boolean;
  platform: string;
}

interface Props {
  runNumber: number;
  selectedBackend: BackendChoice;
  nativeCapabilities: NativeCapabilities;
  onSelectBackend: (backend: BackendChoice) => void;
  onReinit: () => void;
  onBack: () => void;
  onOpenCamera: () => void;
}

const BACKEND_OPTIONS: Array<{
  id: BackendChoice;
  label: string;
}> = [
  { id: 'auto', label: 'auto (webview)' },
  { id: 'webview', label: 'webview' },
  { id: 'vision', label: 'vision (iOS)' },
];

export default function DiagnosticsScreen({
  runNumber,
  selectedBackend,
  nativeCapabilities,
  onSelectBackend,
  onReinit,
  onBack,
  onOpenCamera,
}: Props): React.JSX.Element {
  const { client, status, mode, acceleration, accelerationDiagnostics, error, exercises, preload } =
    usePoseTracker();

  const startRef = useRef(Date.now());
  const [transitions, setTransitions] = useState<StatusTransition[]>([]);

  useEffect(() => {
    startRef.current = Date.now();
    setTransitions([]);
  }, [runNumber]);

  useEffect(() => {
    preload()
      .then(() => {
        logAccelerationReport(client.getAccelerationDiagnostics(), {
          phase: 'diagnostics-screen-ready',
          backend: client.getBackend().name,
          selectedBackend,
        });
      })
      .catch(() => {
        logAccelerationReport(client.getAccelerationDiagnostics(), {
          phase: 'diagnostics-screen-preload-failed',
          selectedBackend,
        });
      });
  }, [preload, client, selectedBackend]);

  useEffect(() => {
    const atMs = Date.now() - startRef.current;
    setTransitions((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].status === status) {
        return prev;
      }
      const deltaMs = prev.length > 0 ? atMs - prev[prev.length - 1].atMs : atMs;
      return [...prev, { status, atMs, deltaMs }];
    });
  }, [status]);

  const ready = status === 'ready';
  const diag = accelerationDiagnostics;

  const backendName = client.getBackend().name;
  const needsWebViewWarmer = backendName === 'webview-movenet';

  const isBackendEnabled = (id: BackendChoice): boolean => {
    if (id === 'auto' || id === 'webview') {
      return true;
    }
    return nativeCapabilities.vision;
  };

  const disabledReason = (id: BackendChoice): string | null => {
    if (isBackendEnabled(id)) {
      return null;
    }
    if (nativeCapabilities.platform !== 'ios') {
      return 'iOS only';
    }
    if (nativeCapabilities.expoGo) {
      return 'Expo Go — install native peers + `npx expo run:ios`';
    }
    return 'Vision plugin not linked (rebuild iOS with SDK ios/ pod)';
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Chromium warmer: WebViewPoseBackend.warmup() waits for page "ready". */}
      {needsWebViewWarmer ? (
        <View style={styles.webviewWarmer} pointerEvents="none">
          <WebViewPoseView coldStart="basic" />
        </View>
      ) : null}
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={{ alignSelf: 'flex-start', marginBottom: 4 }}>
        <Text style={{ color: '#FFC300', fontWeight: '700', fontSize: 14 }}>← Home</Text>
      </Pressable>
      <Text style={styles.title}>Advanced diagnostics</Text>
      <Text style={styles.subtitle}>
        Cold start · backend A/B · acceleration ·{' '}
        {nativeCapabilities.expoGo ? 'Expo Go' : 'dev build natif'} · run #{runNumber}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend A/B</Text>
        <View style={styles.toggleRow}>
          {BACKEND_OPTIONS.map((opt) => {
            const enabled = isBackendEnabled(opt.id);
            const active = selectedBackend === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[
                  styles.toggle,
                  active && styles.toggleActive,
                  !enabled && styles.toggleDisabled,
                ]}
                disabled={!enabled}
                onPress={() => onSelectBackend(opt.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    active && styles.toggleTextActive,
                    !enabled && styles.toggleTextDisabled,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Row label="sélection UI" value={selectedBackend} />
        <Row label="backend actif" value={client.getBackend().name} />
        <Row
          label="environnement"
          value={
            nativeCapabilities.expoGo
              ? 'Expo Go'
              : `native (${nativeCapabilities.platform})`
          }
        />
        {!isBackendEnabled('vision') ? (
          <Text style={styles.note}>vision: {disabledReason('vision')}</Text>
        ) : (
          <Text style={styles.note}>
            Comparer cold start et FPS caméra entre le runtime WebView (MoveNet
            offline) et Apple Vision (iOS). Voir NATIVE_BUILD.md.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cold start (transitions de status)</Text>
        {transitions.map((t, i) => (
          <View key={`${t.status}-${i}`} style={styles.timelineRow}>
            <Text style={[styles.timelineStatus, t.status === 'ready' && styles.ok]}>
              {t.status}
            </Text>
            <Text style={styles.timelineTime}>
              t+{t.atMs} ms{i > 0 ? `  (Δ ${t.deltaMs} ms)` : ''}
            </Text>
          </View>
        ))}
        {!ready && status !== 'error' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFC300" size="small" />
            <Text style={styles.loadingText}>en cours…</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mode & accélération</Text>
        <Row label="mode" value={mode} ok={mode === 'keypoints-only'} />
        <Row
          label="acceleration"
          value={acceleration}
          ok={acceleration === 'gpu'}
          warn={acceleration === 'cpu-fallback'}
        />
        {diag && (
          <>
            <Row label="runtime" value={diag.runtime ?? 'webview'} />
            <Row label="delegate" value={diag.delegate ?? '—'} />
            <Row label="backend TF.js" value={diag.tfjsBackend ?? '—'} />
            <Row
              label="inférence médiane"
              value={
                diag.medianInferenceMs != null
                  ? `${Math.round(diag.medianInferenceMs)} ms`
                  : '—'
              }
            />
            <Row
              label="warm-up runs"
              value={
                diag.inferenceTimesMs.length > 0
                  ? diag.inferenceTimesMs.map((ms) => `${Math.round(ms)}`).join(' / ') +
                    ' ms'
                  : '—'
              }
            />
            <Row label="GL renderer" value={diag.capabilities?.renderer ?? '—'} />
            <Row label="pertes de contexte GL" value={String(diag.contextLossCount)} />
            {diag.reasons.map((reason, i) => (
              <Text key={i} style={styles.reason}>
                • {reason}
              </Text>
            ))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Frontière commerciale</Text>
        <Row
          label="exercices disponibles"
          value={String(exercises.length)}
          ok={exercises.length === 0}
        />
        <Text style={styles.note}>
          Sans clé API : aucun compteur de reps, angle ni score métier — mode
          keypoints-only. MoveNet = 17 COCO ; Apple Vision = jusqu&apos;à 19
          (COCO + neck + root).
        </Text>
      </View>

      {error && (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.cardTitle}>Erreur ({error.code})</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <Pressable
        style={[styles.button, !ready && styles.buttonDisabled]}
        disabled={!ready}
        onPress={onOpenCamera}
      >
        <Text style={styles.buttonText}>
          {ready ? 'Ouvrir la caméra (keypoints)' : `Caméra disponible une fois ready (${status})`}
        </Text>
      </Pressable>

      <Pressable style={styles.buttonSecondary} onPress={onReinit}>
        <Text style={styles.buttonSecondaryText}>Recharger / re-init (cold start)</Text>
      </Pressable>
      <Text style={styles.note}>
        Re-init remonte le provider : nouveau client, nouveau chargement du modèle.
      </Text>
    </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  ok,
  warn,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, ok && styles.ok, warn && styles.warn]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webviewWarmer: {
    position: 'absolute',
    width: 4,
    height: 4,
    opacity: 0.02,
    overflow: 'hidden',
    zIndex: 0,
  },
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 64, gap: 14, paddingBottom: 40 },
  title: { color: 'white', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9AA4C7', fontSize: 13 },
  card: {
    backgroundColor: '#131A33',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: '#FFC300', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  toggle: {
    borderWidth: 1,
    borderColor: '#3A4466',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleActive: { backgroundColor: '#FFC300', borderColor: '#FFC300' },
  toggleDisabled: { opacity: 0.35 },
  toggleText: { color: '#9AA4C7', fontWeight: '700', fontSize: 12 },
  toggleTextActive: { color: '#0B1020' },
  toggleTextDisabled: { color: '#6B7499' },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStatus: { color: 'white', fontSize: 14, fontVariant: ['tabular-nums'] },
  timelineTime: { color: '#9AA4C7', fontSize: 13, fontVariant: ['tabular-nums'] },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  loadingText: { color: '#9AA4C7', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#9AA4C7', fontSize: 13 },
  rowValue: { color: 'white', fontSize: 13, fontWeight: '600', maxWidth: '58%', textAlign: 'right' },
  ok: { color: '#7CE38B' },
  warn: { color: '#FFB020' },
  reason: { color: '#9AA4C7', fontSize: 12 },
  note: { color: '#6B7499', fontSize: 12, lineHeight: 17 },
  errorCard: { borderWidth: 1, borderColor: '#FE8370' },
  errorText: { color: '#FE8370', fontSize: 13 },
  button: { backgroundColor: '#FFC300', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#0B1020', fontWeight: '700', fontSize: 15 },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#FFC300',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: '#FFC300', fontWeight: '700', fontSize: 14 },
});
