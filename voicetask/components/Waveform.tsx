import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface WaveformProps {
  isRecording: boolean;
  barCount?: number;
  color?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  isRecording,
  barCount = 5,
  color = '#FFFFFF'
}) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Create staggered animations for each bar
      const animations = animatedValues.map((animValue, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
              delay: index * 50, // Stagger the start of each bar
            }),
            Animated.timing(animValue, {
              toValue: 0.3,
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      });

      // Start all animations
      animations.forEach(anim => anim.start());

      // Cleanup function
      return () => {
        animations.forEach(anim => anim.stop());
        animatedValues.forEach(val => val.setValue(0.3));
      };
    } else {
      // Reset all bars when not recording
      animatedValues.forEach(val => {
        Animated.timing(val, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isRecording]);

  return (
    <View style={styles.container}>
      {animatedValues.map((animValue, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [
                {
                  scaleY: animValue,
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginTop: 15,
    gap: 4,
  },
  bar: {
    width: 3,
    height: 40,
    borderRadius: 2,
    opacity: 0.8,
  },
});
