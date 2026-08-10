/**
 * Exercise picker — same UX as the public PoseTracker Demo App:
 * full V3 grid always visible; start when full-engine is ready.
 * Manifest aliases (face_squat → squat) are resolved inside the SDK.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePoseTracker } from '@pose-tracker/react-native-pose-estimation';

import {
  EXERCISES,
  getExerciseInfo,
  requiresUserHeight,
  type ExerciseInfo,
} from './exercises';

export interface TrackingLaunch {
  exerciseId: string;
  userHeightCm?: number;
}

interface Props {
  onBack: () => void;
  onStart: (launch: TrackingLaunch) => void;
}

export default function ExercisePickerScreen({
  onBack,
  onStart,
}: Props): React.JSX.Element {
  const { mode, status, exercises: available } = usePoseTracker();
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('175');

  const ready = mode === 'full-engine' && status === 'ready';

  const handleSelect = (ex: ExerciseInfo): void => {
    if (!ready) return;
    if (requiresUserHeight(ex.key)) {
      setPendingJump(ex.key);
      return;
    }
    onStart({ exerciseId: ex.key });
  };

  const startJump = (): void => {
    if (!pendingJump) return;
    const cm = Number(heightCm);
    if (!Number.isFinite(cm) || cm <= 0) return;
    onStart({ exerciseId: pendingJump, userHeightCm: cm });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Features demo</Text>
        <Text style={styles.subtitle}>
          {ready
            ? `Pick an exercise — ${EXERCISES.length} listed (${available.length} from API + jumps in engine).`
            : `Waiting for full-engine (${status} / ${mode})…`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {EXERCISES.map((ex) => (
          <Pressable
            key={ex.key}
            style={[styles.card, !ready && styles.cardDisabled]}
            onPress={() => handleSelect(ex)}
            disabled={!ready}
          >
            <Text style={styles.cardEmoji}>🏃</Text>
            <Text style={styles.cardName} numberOfLines={2}>
              {ex.name}
            </Text>
            <Text style={styles.cardMeta}>
              {ex.type === 'custom' ? 'custom' : ex.movement_type ?? '—'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {pendingJump ? (
        <View style={styles.heightSheet}>
          <Text style={styles.heightTitle}>Your height</Text>
          <Text style={styles.heightHint}>
            Required for {getExerciseInfo(pendingJump)?.name ?? pendingJump} (cm/pixel calibration)
          </Text>
          <TextInput
            style={styles.heightInput}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="175"
            placeholderTextColor="#5A6488"
          />
          <View style={styles.heightActions}>
            <Pressable style={styles.heightCancel} onPress={() => setPendingJump(null)}>
              <Text style={styles.heightCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.heightStart} onPress={startJump}>
              <Text style={styles.heightStartText}>Start jump</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1020' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  backText: { color: '#FFC300', fontWeight: '700', fontSize: 14 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#9AA4C7', fontSize: 13, lineHeight: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#131A33',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2748',
    minHeight: 110,
    gap: 4,
  },
  cardDisabled: { opacity: 0.35 },
  cardEmoji: { fontSize: 22 },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: '#6B7599', fontSize: 11, textTransform: 'uppercase' },
  heightSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    backgroundColor: '#1A2244',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 8,
  },
  heightTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  heightHint: { color: '#9AA4C7', fontSize: 12, lineHeight: 16 },
  heightInput: {
    backgroundColor: '#0B1020',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3358',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
  },
  heightActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  heightCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3358',
    alignItems: 'center',
  },
  heightCancelText: { color: '#9AA4C7', fontWeight: '600' },
  heightStart: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  heightStartText: { color: '#fff', fontWeight: '800' },
});
