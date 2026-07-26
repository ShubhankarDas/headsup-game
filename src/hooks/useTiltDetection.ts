import { useEffect, useRef } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';

// A nod is a brief ROTATION, not a resting posture, so the gyroscope (angular
// velocity) is both the trigger AND the direction source: "at rest" is ~0 on
// all axes regardless of how the phone happens to sit against a given
// forehead, sidestepping the resting-angle/saturation problems a pure
// accelerometer approach ran into, and its sign at the moment it crosses
// threshold is exactly what detected the rotation — no lag.
//
// The accelerometer only GATES on magnitude (was this a real, intentional
// tilt, not noise/a bump) — it does not decide direction. It's a smoothed
// "position" quantity that takes real time to develop; sampling its sign at
// the instant the gyro spike fires can catch it still lagging behind the
// actual motion, which is what caused a same-direction-every-time bug when
// it was used for direction. It's read on its own dominant axis (not the
// gyroscope's) — rotating about an axis doesn't change the accelerometer
// reading on that same axis, only on the other two.
//
// After a trigger fires, we ignore everything for a refractory window: the
// head/phone swinging back to resting position after a nod is itself a
// rotation, and would otherwise be misread as the opposite gesture.
const TILT_SIGN = 1; // flip to -1 if direction feels inverted on a given device

const UPDATE_INTERVAL_MS = 50;
const ACCEL_SMOOTHING = 0.3;
const GYRO_SMOOTHING = 0.4;
const ACCEL_CALIBRATION_SAMPLES = 10; // ~500ms at 50ms interval
const GYRO_TRIGGER_THRESHOLD = 2.2; // rad/s peak angular velocity to count as a nod
const ACCEL_CORROBORATION_MIN_DELTA = 0.08; // ignore noise-level accel deltas
const REFRACTORY_MS = 500; // matches the correct/pass overlay duration

type Axis = 'x' | 'y' | 'z';
const AXES: Axis[] = ['x', 'y', 'z'];

interface UseTiltDetectionOptions {
  enabled: boolean;
  onTiltDown: () => void;
  onTiltUp: () => void;
  // Read on every sensor sample. When true, no trigger is accepted — this is
  // the single source of truth for "is the correct/pass overlay showing",
  // rather than relying on this hook's own REFRACTORY_MS timer to coincide
  // with a separately-managed setTimeout in the caller. Two independent
  // timers that merely happen to match is how a fast second nod could sneak
  // a trigger through a few ms before the overlay had actually cleared.
  suppressedRef?: React.MutableRefObject<boolean>;
}

export function useTiltDetection({ enabled, onTiltDown, onTiltUp, suppressedRef }: UseTiltDetectionOptions) {
  const onTiltDownRef = useRef(onTiltDown);
  const onTiltUpRef = useRef(onTiltUp);
  onTiltDownRef.current = onTiltDown;
  onTiltUpRef.current = onTiltUp;

  useEffect(() => {
    if (!enabled) return;

    const accelSmoothed: Record<Axis, number | null> = { x: null, y: null, z: null };
    const accelBaseline: Record<Axis, number> = { x: 0, y: 0, z: 0 };
    const accelCalibrationSum: Record<Axis, number> = { x: 0, y: 0, z: 0 };
    let accelCalibrationCount = 0;
    let accelCalibrated = false;

    const gyroSmoothed: Record<Axis, number> = { x: 0, y: 0, z: 0 };
    let refractoryUntil = 0;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    Gyroscope.setUpdateInterval(UPDATE_INTERVAL_MS);

    const accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const raw: Record<Axis, number> = { x, y, z };
      AXES.forEach((axis) => {
        const prev = accelSmoothed[axis];
        accelSmoothed[axis] = prev === null ? raw[axis] : prev * (1 - ACCEL_SMOOTHING) + raw[axis] * ACCEL_SMOOTHING;
      });

      if (!accelCalibrated) {
        accelCalibrationSum.x += accelSmoothed.x ?? 0;
        accelCalibrationSum.y += accelSmoothed.y ?? 0;
        accelCalibrationSum.z += accelSmoothed.z ?? 0;
        accelCalibrationCount += 1;
        if (accelCalibrationCount >= ACCEL_CALIBRATION_SAMPLES) {
          accelBaseline.x = accelCalibrationSum.x / accelCalibrationCount;
          accelBaseline.y = accelCalibrationSum.y / accelCalibrationCount;
          accelBaseline.z = accelCalibrationSum.z / accelCalibrationCount;
          accelCalibrated = true;
        }
      }
    });

    const gyroSubscription = Gyroscope.addListener(({ x, y, z }) => {
      const now = Date.now();
      const raw: Record<Axis, number> = { x, y, z };
      AXES.forEach((axis) => {
        gyroSmoothed[axis] = gyroSmoothed[axis] * (1 - GYRO_SMOOTHING) + raw[axis] * GYRO_SMOOTHING;
      });

      const gyroAxis = AXES.reduce((a, b) => (Math.abs(gyroSmoothed[b]) > Math.abs(gyroSmoothed[a]) ? b : a));
      const gyroValue = gyroSmoothed[gyroAxis];

      if (!accelCalibrated) return;
      if (suppressedRef?.current) return;
      if (now < refractoryUntil) return;
      if (Math.abs(gyroValue) < GYRO_TRIGGER_THRESHOLD) return;

      // Accelerometer corroborates that this was a real, intentional tilt
      // (not noise/a bump) via magnitude only — it does NOT decide direction.
      // It's a smoothed "position" quantity that takes real time to develop,
      // sampled at the exact instant the gyro crosses threshold; if it hasn't
      // caught up yet at that moment its sign can be arbitrary regardless of
      // which way the phone actually rotated. The gyroscope's own sign is
      // what actually detected the rotation, so it's used for direction too
      // — no lag between "what triggered" and "what decides direction".
      const accelDelta: Record<Axis, number> = {
        x: (accelSmoothed.x ?? 0) - accelBaseline.x,
        y: (accelSmoothed.y ?? 0) - accelBaseline.y,
        z: (accelSmoothed.z ?? 0) - accelBaseline.z,
      };
      const accelAxis = AXES.filter((axis) => axis !== gyroAxis).reduce((a, b) =>
        Math.abs(accelDelta[b]) > Math.abs(accelDelta[a]) ? b : a
      );
      const accelValue = accelDelta[accelAxis];
      if (Math.abs(accelValue) < ACCEL_CORROBORATION_MIN_DELTA) return;

      refractoryUntil = now + REFRACTORY_MS;
      const direction = Math.sign(gyroValue) * TILT_SIGN;
      if (direction > 0) {
        onTiltDownRef.current();
      } else {
        onTiltUpRef.current();
      }
    });

    return () => {
      accelSubscription.remove();
      gyroSubscription.remove();
    };
  }, [enabled, suppressedRef]);
}
