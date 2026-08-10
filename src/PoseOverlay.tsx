/**
 * Draws the 17 COCO keypoints and skeleton over the camera preview.
 * Keypoint coordinates from the SDK are normalized to [0, 1]; the preview
 * and the inference tensor are stretched identically to the view, so scaling
 * by the view size keeps the overlay aligned.
 */
import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import type { Keypoint, KeypointName } from '@posetracker-tracker/react-native-pose-estimation';

const SKELETON_EDGES: ReadonlyArray<readonly [KeypointName, KeypointName]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  // Apple Vision extras (ignored when absent / score 0).
  ['nose', 'neck'],
  ['neck', 'left_shoulder'],
  ['neck', 'right_shoulder'],
  ['neck', 'root'],
  ['left_hip', 'root'],
  ['right_hip', 'root'],
];

export interface PoseOverlayProps {
  keypoints: Keypoint[];
  width: number;
  height: number;
  /** Mirror x, must match the preview's `flipHorizontal`. */
  mirrorX: boolean;
  minScore: number;
}

export default function PoseOverlay({
  keypoints,
  width,
  height,
  mirrorX,
  minScore,
}: PoseOverlayProps): React.JSX.Element {
  const byName = new Map(keypoints.map((k) => [k.name, k]));
  const toX = (k: Keypoint): number => (mirrorX ? 1 - k.x : k.x) * width;
  const toY = (k: Keypoint): number => k.y * height;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {SKELETON_EDGES.map(([a, b]) => {
        const ka = byName.get(a);
        const kb = byName.get(b);
        if (!ka || !kb || ka.score < minScore || kb.score < minScore) {
          return null;
        }
        return (
          <Line
            key={`${a}-${b}`}
            x1={toX(ka)}
            y1={toY(ka)}
            x2={toX(kb)}
            y2={toY(kb)}
            stroke="#7CE38B"
            strokeWidth={2}
          />
        );
      })}
      {keypoints
        .filter((k) => k.score >= minScore)
        .map((k) => (
          <Circle
            key={k.name}
            cx={toX(k)}
            cy={toY(k)}
            r={4}
            fill="#FFC300"
            stroke="#0B1020"
            strokeWidth={1}
          />
        ))}
    </Svg>
  );
}
