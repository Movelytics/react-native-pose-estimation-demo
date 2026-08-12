/**
 * Camera screen — dual path:
 * - WebView runtime (default): WebViewPoseView owns camera + skeleton
 * - Apple Vision (iOS native, opt-in): PoseCameraView + RN PoseOverlay
 *
 * Two modes:
 * - keypoints (free, no API key): stream keypoints + console.log example
 * - exercise (API key): startExercise + counter / jump overlays
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import {
  logFrameStats,
  PoseCameraView,
  usePoseTracker,
  WebViewPoseView,
  type EngineDebugEvent,
  type Keypoint,
  type Pose,
  type StartExerciseOptions,
} from '@pose-tracker/react-native-pose-estimation';

import PoseOverlay from './PoseOverlay';
import { getExerciseInfo, isJumpExercise } from './exercises';

const FACING = 'front' as const;
const MIN_KEYPOINT_SCORE = 0.3;
const LATENCY_WINDOW = 30;

type DebugHud = {
  ready: boolean;
  postureHint: string;
  missingKeypoints: string[];
  stepIndex: number;
  stepCount: number;
  stepProgression: number;
  progression: number;
  rawCount: number;
  publicCount: number;
  knees: { left: number | null; right: number | null };
  lastSkipReason: string | null;
  engineVersion: string;
  minGrade: string | null;
  computeError?: string;
  posesProcessed: number;
};

interface Props {
  onBack: () => void;
  /** When set, starts this exercise once full-engine is ready. */
  exerciseId?: string | null;
  exerciseOptions?: StartExerciseOptions;
}

export default function CameraScreen({
  onBack,
  exerciseId = null,
  exerciseOptions,
}: Props): React.JSX.Element {
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [fps, setFps] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [medianLatencyMs, setMedianLatencyMs] = useState<number | null>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [initMessage, setInitMessage] = useState('starting…');
  const [exerciseLine, setExerciseLine] = useState<string>('');
  const [counter, setCounter] = useState(0);
  const [grade, setGrade] = useState<string>('—');
  const [jumpHeightCm, setJumpHeightCm] = useState<number | null>(null);
  const [airTimeSeconds, setAirTimeSeconds] = useState<number | null>(null);
  const [loggedKeypointsHint, setLoggedKeypointsHint] = useState(false);
  const [debugHud, setDebugHud] = useState<DebugHud | null>(null);
  const [postureReady, setPostureReady] = useState<boolean | null>(null);
  const [progressionPct, setProgressionPct] = useState<number | null>(null);
  const [recommendationsLine, setRecommendationsLine] = useState('');

  const frameCounterRef = useRef(0);
  const totalFramesRef = useRef(0);
  const latenciesRef = useRef<number[]>([]);
  const keypointsRef = useRef<Keypoint[]>([]);
  const keypointsLogCountRef = useRef(0);
  const debugLogCountRef = useRef(0);

  const isExerciseSession = Boolean(exerciseId);

  const { client, status, mode, acceleration, startExercise, stopExercise } = usePoseTracker({
    onKeypoints: (event) => {
      keypointsRef.current = event.keypoints;
      setKeypoints(event.keypoints);

      // Example for integrators: how to catch keypoints from the SDK.
      // Logs the first 3 frames, then every ~30th — open Metro / logcat.
      keypointsLogCountRef.current += 1;
      const n = keypointsLogCountRef.current;
      if (n <= 3 || n % 30 === 0) {
        const visible = event.keypoints.filter((k) => k.score >= MIN_KEYPOINT_SCORE);
        console.log('[PoseTracker] keypoints event', {
          count: event.keypoints.length,
          visibleAbove03: visible.length,
          score: Number(event.score.toFixed(3)),
          timestampMs: event.timestampMs,
          sample: event.keypoints.slice(0, 3).map((k) => ({
            name: k.name,
            x: Number(k.x.toFixed(3)),
            y: Number(k.y.toFixed(3)),
            score: Number(k.score.toFixed(3)),
          })),
        });
        if (!loggedKeypointsHint) {
          setLoggedKeypointsHint(true);
        }
      }
    },
    onInitialization: (e) => setInitMessage(e.message),
    onWarning: (e) => setInitMessage(`warn: ${e.message}`),
    onError: (e) => setInitMessage(`error: ${e.message}`),
    onPerformanceWarning: (e) =>
      setInitMessage(`slow device: ${e.meanFps.toFixed(1)} fps`),
    onPosture: (e) => {
      setPostureReady(e.ready);
      setExerciseLine(`posture: ${e.ready ? 'ready' : e.hint}`);
      console.log('[PoseTracker] posture', {
        ready: e.ready,
        hint: e.hint,
        direction: e.direction,
        missingKeypoints: e.missingKeypoints,
      });
    },
    onProgression: (e) => {
      setProgressionPct(e.value);
      console.log('[PoseTracker] progression', e.value);
    },
    onRecommendations: (e) => {
      const line = e.recommendations.join(' · ');
      setRecommendationsLine(line);
      console.log('[PoseTracker] recommendations', e.recommendations);
    },
    onEngineDebug: (e: EngineDebugEvent) => {
      setDebugHud({
        ready: e.ready,
        postureHint: e.postureHint,
        missingKeypoints: e.missingKeypoints,
        stepIndex: e.stepIndex,
        stepCount: e.stepCount,
        stepProgression: e.stepProgression,
        progression: e.progression,
        rawCount: e.rawCount,
        publicCount: e.publicCount,
        knees: e.knees,
        lastSkipReason: e.lastSkipReason,
        engineVersion: e.engineVersion,
        minGrade: e.minGrade,
        computeError: e.computeError,
        posesProcessed: e.posesProcessed,
      });
      debugLogCountRef.current += 1;
      const n = debugLogCountRef.current;
      if (n <= 5 || n % 8 === 0) {
        console.log('[PoseTracker] engine_debug', {
          engineVersion: e.engineVersion,
          ready: e.ready,
          postureHint: e.postureHint,
          missingKeypoints: e.missingKeypoints,
          step: `${e.stepIndex}/${e.stepCount}`,
          stepProgression: e.stepProgression,
          progression: e.progression,
          rawCount: e.rawCount,
          publicCount: e.publicCount,
          knees: e.knees,
          lastSkipReason: e.lastSkipReason,
          minGrade: e.minGrade,
          computeError: e.computeError,
        });
      }
    },
    onCounter: (e) => {
      setCounter(e.count);
      setExerciseLine(`reps: ${e.count}`);
    },
    onFormScore: (e) => {
      setGrade(e.grade);
      setExerciseLine(`score ${e.score} (${e.grade}) avg ${e.average}`);
    },
    onJumpCalibration: () => setExerciseLine('calibrated — ready to jump'),
    onJumpStarted: () => setExerciseLine('jump detected…'),
    onJumpHeight: (e) => {
      setJumpHeightCm(e.jumpHeightCm);
      if (e.airTimeSeconds != null) setAirTimeSeconds(e.airTimeSeconds);
      setExerciseLine(`jump ${e.jumpHeightCm}cm${e.final ? ' (final)' : '…'}`);
    },
    onJumpDiscarded: (e) => setExerciseLine(`discarded: ${e.userMessage}`),
    onJumpResult: (e) => {
      setJumpHeightCm(e.jumpHeightCm);
      if (e.airTimeSeconds != null) setAirTimeSeconds(e.airTimeSeconds);
      setExerciseLine(
        `jump #${e.jumpNumber}: ${e.jumpHeightCm}cm` +
          (e.airTimeSeconds != null ? ` (${e.airTimeSeconds}s air)` : ''),
      );
    },
    onJumpSummary: (e) =>
      setExerciseLine(
        `total ${e.totalJumps} jumps · avg ${e.avgJumpHeight}cm · max ${e.maxJumpHeight}cm`,
      ),
  });

  useEffect(() => {
    if (!exerciseId || status !== 'ready' || mode !== 'full-engine') {
      return;
    }
    try {
      startExercise(exerciseId, exerciseOptions);
      setExerciseLine(`exercise ${exerciseId} started`);
      console.log('[PoseTracker] startExercise', exerciseId, exerciseOptions ?? {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setExerciseLine(`start failed: ${message}`);
      console.warn('[PoseTracker] startExercise failed', message);
      return;
    }
    return () => stopExercise();
  }, [exerciseId, exerciseOptions, status, mode, startExercise, stopExercise]);

  const backendName = client.getBackend().name;
  const useVisionCamera = backendName === 'apple-vision';
  const exerciseInfo = exerciseId ? getExerciseInfo(exerciseId) : null;
  const jumpMode = exerciseId ? isJumpExercise(exerciseId) : false;
  const isStatic = exerciseInfo?.movement_type === 'static';

  const accelerationRef = useRef(acceleration);
  accelerationRef.current = acceleration;
  const backendNameRef = useRef(backendName);
  backendNameRef.current = backendName;

  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const interval = setInterval(() => {
      const fpsNow = frameCounterRef.current;
      setFps(fpsNow);
      setTotalFrames(totalFramesRef.current);
      frameCounterRef.current = 0;
      const window = latenciesRef.current;
      let median: number | null = null;
      if (window.length > 0) {
        const sorted = [...window].sort((a, b) => a - b);
        median = sorted[Math.floor(sorted.length / 2)] ?? null;
        setMedianLatencyMs(median);
      }
      const kps = keypointsRef.current;
      const visible = kps.filter((k) => k.score >= MIN_KEYPOINT_SCORE);
      const meanScore =
        kps.length > 0 ? kps.reduce((sum, k) => sum + k.score, 0) / kps.length : 0;
      logFrameStats({
        fps: fpsNow,
        medianLatencyMs: median,
        backend: backendNameRef.current,
        acceleration: accelerationRef.current,
        frames: totalFramesRef.current,
        keypointsAbove03: visible.length,
        meanScore,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onPose = useCallback((_pose: Pose, stats: { inferenceTimeMs: number }) => {
    frameCounterRef.current += 1;
    totalFramesRef.current += 1;
    latenciesRef.current.push(stats.inferenceTimeMs);
    if (latenciesRef.current.length > LATENCY_WINDOW) {
      latenciesRef.current.shift();
    }
  }, []);

  const onPreviewLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    setViewSize({ width, height });
  };

  const visibleKeypoints = keypoints.filter((k) => k.score >= MIN_KEYPOINT_SCORE);
  const meanScore =
    keypoints.length > 0
      ? keypoints.reduce((sum, k) => sum + k.score, 0) / keypoints.length
      : 0;
  const kpDenom = useVisionCamera ? 19 : 17;

  return (
    <View style={styles.container}>
      <View style={styles.preview} onLayout={onPreviewLayout}>
        {useVisionCamera ? (
          <PoseCameraView
            style={StyleSheet.absoluteFill}
            position={FACING}
            onPose={onPose}
          >
            {viewSize.width > 0 ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <PoseOverlay
                  keypoints={keypoints}
                  width={viewSize.width}
                  height={viewSize.height}
                  mirrorX={FACING === 'front'}
                  minScore={MIN_KEYPOINT_SCORE}
                />
              </View>
            ) : null}
          </PoseCameraView>
        ) : (
          <WebViewPoseView
            style={StyleSheet.absoluteFill}
            position={FACING}
            onPose={onPose}
          />
        )}
      </View>

      <View style={styles.topBar}>
        <Text style={styles.badge}>
          {isExerciseSession
            ? `${exerciseInfo?.name ?? exerciseId} · ${mode}`
            : `keypoints-only · ${backendName}`}
        </Text>
        <Text style={styles.eventLine} numberOfLines={2}>
          {initMessage}
          {acceleration !== 'unknown' ? ` · ${acceleration}` : ''}
        </Text>
        {exerciseLine ? (
          <Text style={styles.exerciseLine} numberOfLines={2}>
            {exerciseLine}
          </Text>
        ) : null}
        {!isExerciseSession && loggedKeypointsHint ? (
          <Text style={styles.hintLine} numberOfLines={2}>
            keypoints → Metro / logcat via console.log (see onKeypoints)
          </Text>
        ) : null}
      </View>

      {isExerciseSession ? (
        <View style={styles.overlayRow} pointerEvents="none">
          {jumpMode ? (
            <>
              <MetricCard
                label="Air time"
                value={airTimeSeconds != null ? `${airTimeSeconds.toFixed(2)}s` : '—'}
              />
              <MetricCard
                label="Jump height"
                value={jumpHeightCm != null ? `${jumpHeightCm.toFixed(1)} cm` : '—'}
              />
            </>
          ) : (
            <>
              <MetricCard label="Last rep" value={grade} accent={gradeColor(grade)} />
              <MetricCard
                label={isStatic ? 'sec' : 'rep(s)'}
                value={String(counter)}
              />
            </>
          )}
        </View>
      ) : null}

      {isExerciseSession ? (
        <View style={styles.debugPanel} pointerEvents="none">
          <Text style={styles.debugTitle}>FSM debug</Text>
          <Text style={styles.debugLine}>
            ready:{' '}
            {String(
              debugHud?.ready ?? postureReady ?? '—',
            )}{' '}
            · eng {debugHud?.engineVersion ?? '—'}
          </Text>
          <Text style={styles.debugLine} numberOfLines={2}>
            hint: {debugHud?.postureHint || exerciseLine || '—'}
          </Text>
          <Text style={styles.debugLine} numberOfLines={1}>
            missing:{' '}
            {(debugHud?.missingKeypoints?.length
              ? debugHud.missingKeypoints.join(',')
              : '—')}
          </Text>
          <Text style={styles.debugLine}>
            step {debugHud != null ? `${debugHud.stepIndex}/${debugHud.stepCount}` : '—'} ·
            prog {debugHud?.progression ?? progressionPct ?? '—'}% ·
            stepProg {debugHud?.stepProgression ?? '—'}%
          </Text>
          <Text style={styles.debugLine}>
            raw {debugHud?.rawCount ?? '—'} / public {debugHud?.publicCount ?? counter} ·
            minGrade {debugHud?.minGrade ?? 'off'}
          </Text>
          <Text style={styles.debugLine}>
            knees L{debugHud?.knees.left ?? '—'} R{debugHud?.knees.right ?? '—'} ·
            skip {debugHud?.lastSkipReason ?? '—'}
          </Text>
          {debugHud?.computeError ? (
            <Text style={styles.debugWarn} numberOfLines={1}>
              err: {debugHud.computeError}
            </Text>
          ) : null}
          {recommendationsLine ? (
            <Text style={styles.debugLine} numberOfLines={1}>
              rec: {recommendationsLine}
            </Text>
          ) : null}
          {debugHud == null && isExerciseSession ? (
            <Text style={styles.debugWarn} numberOfLines={2}>
              no engine_debug yet — need engine ≥1.2.4 deployed + debugEngine
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.statsBar}>
        <Stat label="FPS" value={String(fps)} />
        <Stat
          label="latence"
          value={medianLatencyMs != null ? `${Math.round(medianLatencyMs)} ms` : '—'}
        />
        <Stat label={`kp ≥0.3`} value={`${visibleKeypoints.length}/${kpDenom}`} />
        <Stat label="score" value={meanScore.toFixed(2)} />
        <Stat label="frames" value={String(totalFrames)} />
      </View>

      <Pressable style={styles.back} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
    </View>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): React.JSX.Element {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return '#7CE38B';
    case 'B':
      return '#FFC300';
    case 'C':
      return '#F59E0B';
    case 'D':
    case 'E':
      return '#FE8370';
    default:
      return '#E8ECFF';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
  preview: { flex: 1, overflow: 'hidden' },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 72,
  },
  badge: {
    color: '#0B1020',
    backgroundColor: '#FFC300',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    textAlign: 'center',
  },
  eventLine: {
    marginTop: 8,
    color: '#FFC300',
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  exerciseLine: {
    marginTop: 4,
    color: '#7CFFB2',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  hintLine: {
    marginTop: 6,
    color: '#9AA4C7',
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  overlayRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  debugPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 168,
    backgroundColor: 'rgba(11, 16, 32, 0.82)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3358',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  debugTitle: {
    color: '#FFC300',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  debugLine: {
    color: '#E8ECFF',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  debugWarn: {
    color: '#FE8370',
    fontSize: 10,
    marginTop: 2,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(19, 26, 51, 0.88)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2A3358',
    alignItems: 'center',
  },
  metricLabel: { color: '#9AA4C7', fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#131A33',
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: '#9AA4C7', fontSize: 11 },
  back: {
    position: 'absolute',
    top: 54,
    left: 16,
    backgroundColor: '#131A33',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backText: { color: '#FFC300', fontWeight: '700', fontSize: 13 },
});
