/**
 * Home — simplified SDK status + API key setup + entry into free keypoints
 * or (with a key) the PoseTracker features demo.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePoseTracker, WebViewPoseView } from '@posetracker-tracker/react-native-pose-estimation';

interface Props {
  /** Currently applied (provider) API key, or undefined. */
  appliedApiKey?: string;
  apiKeyDraft: string;
  onChangeApiKeyDraft: (value: string) => void;
  onApplyApiKey: () => void;
  onClearApiKey: () => void;
  onOpenKeypoints: () => void;
  onOpenFeatures: () => void;
  onOpenAdvanced: () => void;
}

type KeyTestResult =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; plan: string; exercises: number; mode: string }
  | { kind: 'fail'; message: string };

export default function HomeScreen({
  appliedApiKey,
  apiKeyDraft,
  onChangeApiKeyDraft,
  onApplyApiKey,
  onClearApiKey,
  onOpenKeypoints,
  onOpenFeatures,
  onOpenAdvanced,
}: Props): React.JSX.Element {
  const { client, status, mode, acceleration, error, preload, configure, exercises } =
    usePoseTracker();
  const [keyTest, setKeyTest] = useState<KeyTestResult>({ kind: 'idle' });

  useEffect(() => {
    void preload().catch(() => {});
  }, [preload]);

  useEffect(() => {
    setKeyTest({ kind: 'idle' });
  }, [apiKeyDraft]);

  // After Apply + preload reaches full-engine, show a green check automatically.
  useEffect(() => {
    if (appliedApiKey && mode === 'full-engine' && status === 'ready' && keyTest.kind === 'idle') {
      setKeyTest({
        kind: 'ok',
        plan: client.getPlanType() ?? 'unknown',
        exercises: exercises.length,
        mode,
      });
    }
  }, [appliedApiKey, mode, status, exercises.length, client, keyTest.kind]);

  const ready = status === 'ready';
  const backendName = client.getBackend().name;
  const needsWebViewWarmer = backendName === 'webview-movenet';
  const draft = apiKeyDraft.trim();
  const hasAppliedKey = Boolean(appliedApiKey);
  const draftDiffersFromApplied = draft.length > 0 && draft !== (appliedApiKey ?? '');

  const handleApply = (): void => {
    if (!draft) return;
    setKeyTest({ kind: 'idle' });
    onApplyApiKey();
  };

  const handleTestKey = async (): Promise<void> => {
    if (!draft) {
      setKeyTest({ kind: 'fail', message: 'Paste an API key first.' });
      return;
    }

    setKeyTest({ kind: 'testing' });
    try {
      // Hot handshake with the typed key (works even before Apply).
      const ok = await configure(draft);
      const plan = client.getPlanType() ?? 'unknown';
      const err = client.getError();
      if (ok && client.getMode() === 'full-engine') {
        setKeyTest({
          kind: 'ok',
          plan,
          exercises: client.getAvailableExercises().length,
          mode: client.getMode(),
        });
        // Persist + remount so feature flags (angles, exercises demo) follow the key.
        if (draftDiffersFromApplied || !hasAppliedKey) {
          onApplyApiKey();
        }
      } else {
        setKeyTest({
          kind: 'fail',
          message:
            err?.message ??
            'Key rejected or engine unavailable (invalid token, quota, or offline).',
        });
      }
    } catch (err) {
      setKeyTest({
        kind: 'fail',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>PoseTracker SDK</Text>
        <Text style={styles.subtitle}>
          Test the React Native SDK — free keypoints offline, or unlock
          exercises with your API key.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Row label="status" value={status} />
          <Row label="mode" value={mode} />
          <Row label="backend" value={backendName} />
          <Row label="acceleration" value={acceleration} />
          <Row
            label="API key"
            value={
              hasAppliedKey
                ? mode === 'full-engine'
                  ? 'valid · full-engine'
                  : 'applied'
                : 'none'
            }
          />
          {!ready ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFC300" size="small" />
              <Text style={styles.loadingText}>warming up…</Text>
            </View>
          ) : null}
          {error && keyTest.kind !== 'fail' ? (
            <Text style={styles.errorText}>{error.message}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>API key</Text>
          <Text style={styles.hint}>
            Shown in clear text (dev test app). Paste your key, then tap Test
            key to verify the handshake (plan + engine). Apply also reloads the
            SDK with that token. Without a key you still get free offline
            keypoints.
          </Text>
          <TextInput
            style={styles.input}
            value={apiKeyDraft}
            onChangeText={onChangeApiKeyDraft}
            placeholder="ptk_live_…"
            placeholderTextColor="#5A6488"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            multiline
          />
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary, !draft && styles.btnDisabled]}
              onPress={handleApply}
              disabled={!draft}
            >
              <Text style={styles.btnPrimaryText}>
                {draftDiffersFromApplied || !hasAppliedKey ? 'Apply key' : 'Reload with key'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                styles.btnTest,
                (!draft || keyTest.kind === 'testing') && styles.btnDisabled,
              ]}
              onPress={() => {
                void handleTestKey();
              }}
              disabled={!draft || keyTest.kind === 'testing'}
            >
              <Text style={styles.btnTestText}>
                {keyTest.kind === 'testing' ? 'Testing…' : 'Test key'}
              </Text>
            </Pressable>
            {hasAppliedKey ? (
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClearApiKey}>
                <Text style={styles.btnGhostText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {keyTest.kind === 'testing' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#3B82F6" size="small" />
              <Text style={styles.loadingText}>checking plan & engine…</Text>
            </View>
          ) : null}
          {keyTest.kind === 'ok' ? (
            <Text style={styles.keyOk}>
              ✓ Key OK — plan={keyTest.plan} · mode={keyTest.mode} ·{' '}
              {keyTest.exercises} exercises
            </Text>
          ) : null}
          {keyTest.kind === 'fail' ? (
            <Text style={styles.errorText}>✗ {keyTest.message}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Try it</Text>

        <Pressable
          style={[styles.modeCard, !ready && styles.modeCardDisabled]}
          onPress={onOpenKeypoints}
          disabled={!ready}
        >
          <Text style={styles.modeIcon}>📷</Text>
          <Text style={styles.modeTitle}>Free pose estimation</Text>
          <Text style={styles.modeDesc}>
            No API key needed — open the camera, stream keypoints, see how to
            catch them (console.log example).
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeCard,
            styles.modeCardAccent,
            (!ready || !hasAppliedKey || mode !== 'full-engine') && styles.modeCardDisabled,
          ]}
          onPress={onOpenFeatures}
          disabled={!ready || !hasAppliedKey || mode !== 'full-engine'}
        >
          <Text style={styles.modeIcon}>🏋️</Text>
          <Text style={styles.modeTitle}>PoseTracker features demo</Text>
          <Text style={styles.modeDesc}>
            {mode === 'full-engine'
              ? 'Pick an exercise (squat, push-up, jumps…) and track reps / jumps live.'
              : hasAppliedKey
                ? 'Key applied — wait for full-engine (or tap Test key) before opening the demo.'
                : 'Apply a valid API key above to unlock exercises & the movement engine.'}
          </Text>
        </Pressable>

        <Pressable onPress={onOpenAdvanced} style={styles.advancedLink}>
          <Text style={styles.advancedText}>Advanced diagnostics →</Text>
        </Pressable>
      </ScrollView>

      {needsWebViewWarmer ? (
        <View style={styles.warmer} pointerEvents="none">
          {/* basic: warm MoveNet only — no getUserMedia / permission prompt */}
          <WebViewPoseView coldStart="basic" />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1020' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 14 },
  brand: { color: '#FFC300', fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: '#9AA4C7', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  card: {
    backgroundColor: '#131A33',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E2748',
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  hint: { color: '#9AA4C7', fontSize: 12, lineHeight: 17 },
  keyOk: { color: '#7CE38B', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: '#6B7599', fontSize: 13 },
  rowValue: {
    color: '#E8ECFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  loadingText: { color: '#FFC300', fontSize: 12 },
  errorText: { color: '#FE8370', fontSize: 12, marginTop: 4, lineHeight: 16 },
  input: {
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: '#2A3358',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 44,
  },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#FFC300', flexGrow: 1, minWidth: 110 },
  btnPrimaryText: { color: '#0B1020', fontWeight: '800', fontSize: 13 },
  btnTest: { backgroundColor: '#3B82F6', flexGrow: 1, minWidth: 90 },
  btnTestText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: '#2A3358', paddingHorizontal: 14 },
  btnGhostText: { color: '#9AA4C7', fontWeight: '600', fontSize: 13 },
  btnDisabled: { opacity: 0.45 },
  sectionLabel: {
    color: '#6B7599',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  modeCard: {
    backgroundColor: '#131A33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2748',
    gap: 4,
  },
  modeCardAccent: { borderColor: '#3B82F6', backgroundColor: '#121A36' },
  modeCardDisabled: { opacity: 0.45 },
  modeIcon: { fontSize: 28, marginBottom: 4 },
  modeTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modeDesc: { color: '#9AA4C7', fontSize: 13, lineHeight: 18 },
  advancedLink: { alignSelf: 'center', paddingVertical: 12 },
  advancedText: { color: '#6B7599', fontSize: 13, fontWeight: '600' },
  warmer: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
