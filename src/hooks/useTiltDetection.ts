import { useEffect, useRef } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';

// A nod is a brief ROTATION, not a resting posture, so the gyroscope (angular
// velocity) is the primary trigger: "at rest" is ~0 on all axes regardless of
// how the phone happens to sit against a given forehead, which sidesteps the
// resting-angle/saturation problems a pure accelerometer approach ran into.
//
// The accelerometer is used only to corroborate DIRECTION at the moment of a
// gyroscope spike, checked against its own calibrated baseline. It must be
// read on its own dominant axis (not the gyroscope's) — rotating about an
// axis doesn't change the accelerometer reading on that same axis, only on
// the other two, so the two dominant axes are expected to differ.
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
}

export function useTiltDetection({ enabled, onTiltDown, onTiltUp }: UseTiltDetectionOptions) {
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
      const raw: Record<Axis, number> = { x, y, z };
      AXES.forEach((axis) => {
        gyroSmoothed[axis] = gyroSmoothed[axis] * (1 - GYRO_SMOOTHING) + raw[axis] * GYRO_SMOOTHING;
      });

      if (!accelCalibrated) return;
      const now = Date.now();
      if (now < refractoryUntil) return;

      const gyroAxis = AXES.reduce((a, b) => (Math.abs(gyroSmoothed[b]) > Math.abs(gyroSmoothed[a]) ? b : a));
      if (Math.abs(gyroSmoothed[gyroAxis]) < GYRO_TRIGGER_THRESHOLD) return;

      // Corroborate direction using the accelerometer's own dominant axis,
      // excluding the gyroscope's rotation axis (which won't have moved).
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
      const direction = Math.sign(accelValue) * TILT_SIGN;
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
  }, [enabled]);
}
