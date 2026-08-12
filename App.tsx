/**
 * PoseTracker SDK test app.
 *
 * Flow:
 *   Home (status + optional API key)
 *     ├─ Free pose estimation → camera (keypoints, no key)
 *     ├─ Features demo (API key) → exercise picker → camera + exercise
 *     └─ Advanced diagnostics
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isExpoGo,
  isVisionBackendAvailable,
  PoseTrackerProvider,
  type PoseTrackerFeatures,
  type PreferredBackend,
  type StartExerciseOptions,
} from '@pose-tracker/react-native-pose-estimation';

import HomeScreen from './src/HomeScreen';
import DiagnosticsScreen from './src/DiagnosticsScreen';
import ExercisePickerScreen, { type TrackingLaunch } from './src/ExercisePickerScreen';
import CameraScreen from './src/CameraScreen';

export type BackendChoice = PreferredBackend;

type Screen = 'home' | 'keypoints' | 'exercises' | 'tracking' | 'diagnostics';

const API_KEY_STORAGE = 'posetracker.testapp.apiKey';

/** Features unlocked when an API key is set (developer-plan demo). */
const FEATURES_WITH_KEY: PoseTrackerFeatures = {
  angles: true,
  recommendations: true,
  progression: true,
  keypoints: true, // keypoints DURING an exercise
};

const FEATURES_KEYLESS: PoseTrackerFeatures = {
  angles: false,
  recommendations: false,
  progression: false,
  keypoints: false,
};

export default function App(): React.JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  const [apiToken, setApiToken] = useState<string | undefined>(undefined);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [runNumber, setRunNumber] = useState(1);
  const [backend, setBackend] = useState<BackendChoice>('auto');
  const [tracking, setTracking] = useState<{
    exerciseId: string;
    options?: StartExerciseOptions;
  } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(API_KEY_STORAGE)
      .then((stored) => {
        if (stored && stored.trim()) {
          const key = stored.trim();
          setApiToken(key);
          setApiKeyDraft(key); // keep the key visible in the home field
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const nativeCapabilities = useMemo(
    () => ({
      expoGo: isExpoGo(),
      vision: !isExpoGo() && Platform.OS === 'ios' && isVisionBackendAvailable(),
      platform: Platform.OS as 'ios' | 'android' | string,
    }),
    [runNumber],
  );

  const remount = useCallback(() => {
    setScreen('home');
    setTracking(null);
    setRunNumber((n) => n + 1);
  }, []);

  const applyApiKey = useCallback(() => {
    const next = apiKeyDraft.trim();
    if (!next) return;
    setApiToken(next);
    setApiKeyDraft(next); // stay visible after apply
    void AsyncStorage.setItem(API_KEY_STORAGE, next);
    remount();
  }, [apiKeyDraft, remount]);

  const clearApiKey = useCallback(() => {
    setApiToken(undefined);
    setApiKeyDraft('');
    void AsyncStorage.removeItem(API_KEY_STORAGE);
    remount();
  }, [remount]);

  const selectBackend = useCallback((next: BackendChoice) => {
    setBackend(next);
    setScreen('diagnostics');
    setTracking(null);
    setRunNumber((n) => n + 1);
  }, []);

  const startTracking = useCallback((launch: TrackingLaunch) => {
    const options: StartExerciseOptions = {};
    if (launch.userHeightCm != null) {
      options.userHeightCm = launch.userHeightCm;
    }
    setTracking({ exerciseId: launch.exerciseId, options });
    setScreen('tracking');
  }, []);

  const hasApiKey = Boolean(apiToken);
  const providerOptions = useMemo(
    () => ({
      locale: 'en' as const,
      preferredBackend: backend,
      features: hasApiKey ? FEATURES_WITH_KEY : FEATURES_KEYLESS,
      // FSM / squat QA: request throttled engine_debug when a key unlocks the engine.
      ...(hasApiKey ? { debugEngine: true as const } : {}),
    }),
    [backend, hasApiKey],
  );

  if (!hydrated) {
    return <View style={styles.container} />;
  }

  return (
    <PoseTrackerProvider key={runNumber} apiToken={apiToken} options={providerOptions}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <RNStatusBar barStyle="light-content" />

        {screen === 'home' ? (
          <HomeScreen
            appliedApiKey={apiToken}
            apiKeyDraft={apiKeyDraft}
            onChangeApiKeyDraft={setApiKeyDraft}
            onApplyApiKey={applyApiKey}
            onClearApiKey={clearApiKey}
            onOpenKeypoints={() => setScreen('keypoints')}
            onOpenFeatures={() => setScreen('exercises')}
            onOpenAdvanced={() => setScreen('diagnostics')}
          />
        ) : null}

        {screen === 'keypoints' ? (
          <CameraScreen onBack={() => setScreen('home')} />
        ) : null}

        {screen === 'exercises' ? (
          <ExercisePickerScreen
            onBack={() => setScreen('home')}
            onStart={startTracking}
          />
        ) : null}

        {screen === 'tracking' && tracking ? (
          <CameraScreen
            onBack={() => {
              setTracking(null);
              setScreen('exercises');
            }}
            exerciseId={tracking.exerciseId}
            exerciseOptions={tracking.options}
          />
        ) : null}

        {screen === 'diagnostics' ? (
          <DiagnosticsScreen
            runNumber={runNumber}
            selectedBackend={backend}
            nativeCapabilities={nativeCapabilities}
            onSelectBackend={selectBackend}
            onReinit={remount}
            onBack={() => setScreen('home')}
            onOpenCamera={() => setScreen('keypoints')}
          />
        ) : null}
      </View>
    </PoseTrackerProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
});
