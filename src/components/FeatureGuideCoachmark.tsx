import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type CoachmarkAnchor = View | null;

type AnchorRef = React.RefObject<CoachmarkAnchor>;

export type FeatureGuideStep = {
  key: string;
  anchorRef: AnchorRef;
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  placement?: 'auto' | 'top' | 'bottom';
};

type FeatureGuideCoachmarkProps = {
  guideKey: string;
  enabled?: boolean;
  steps: FeatureGuideStep[];
  startDelayMs?: number;
  onStepChange?: (step: FeatureGuideStep, index: number) => number | void;
  restartKey?: string | number;
  onFinished?: () => void;
};

type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const STORAGE_PREFIX = 'JOMHEALTHY_FEATURE_GUIDE_DONE_V1:';
const RESTART_SIGNAL_KEY = 'JOMHEALTHY_FEATURE_GUIDE_RESTART_SIGNAL_V1';
const DEFAULT_BUBBLE_HEIGHT = 236;
const SIDE_MARGIN = 14;
const TARGET_GAP = 18;

function isMalay(language?: string | null) {
  const lang = String(language || '').toLowerCase();
  return lang === 'ms' || lang === 'my' || lang.startsWith('ms-');
}

function isChinese(language?: string | null) {
  const lang = String(language || '').toLowerCase();
  return lang === 'zh' || lang === 'cn' || lang.startsWith('zh-');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function FeatureGuideCoachmark({
  guideKey,
  enabled = true,
  steps,
  startDelayMs = 650,
  onStepChange,
  restartKey,
  onFinished,
}: FeatureGuideCoachmarkProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const colors = theme.colors;
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(0);
  const [globalRestartKey, setGlobalRestartKey] = useState<string | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureAttemptRef = useRef(0);
  const pulseScale = useRef(new Animated.Value(0.82)).current;
  const pulseOpacity = useRef(new Animated.Value(0.38)).current;

  const getText = useCallback(
    (en: string, zh: string, ms: string) => {
      if (isChinese(language)) return zh;
      if (isMalay(language)) return ms;
      return en;
    },
    [language]
  );

  const cleanSteps = useMemo(
    () => steps.filter((step) => Boolean(step?.key && step.anchorRef)),
    [steps]
  );

  const currentStep = cleanSteps[activeIndex];
  const storageKey = `${STORAGE_PREFIX}${guideKey}`;

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      AsyncStorage.getItem(RESTART_SIGNAL_KEY)
        .then((signal) => {
          if (mounted && signal) {
            setGlobalRestartKey(signal);
          }
        })
        .catch((error) => {
          console.log('Load feature guide restart signal failed:', error);
        });

      return () => {
        mounted = false;
      };
    }, [])
  );

  const clearTimers = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }

    if (measureTimerRef.current) {
      clearTimeout(measureTimerRef.current);
      measureTimerRef.current = null;
    }
  }, []);

  const hideGuide = useCallback(() => {
    clearTimers();
    setVisible(false);
    setTargetRect(null);
    setBubbleHeight(0);
  }, [clearTimers]);

  useEffect(() => {
    if (!visible || !targetRect) {
      pulseScale.stopAnimation();
      pulseOpacity.stopAnimation();
      return;
    }

    pulseScale.setValue(0.82);
    pulseOpacity.setValue(0.38);

    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.18,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 0.82,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.38,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseOpacity, pulseScale, targetRect, visible]);

  const finishGuide = useCallback(async () => {
    try {
      await AsyncStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.log('Save feature guide state failed:', error);
    } finally {
      hideGuide();
      onFinished?.();
    }
  }, [hideGuide, onFinished, storageKey]);

  useEffect(() => {
    let mounted = true;
    clearTimers();

    if (!enabled || cleanSteps.length === 0) {
      hideGuide();
      return;
    }

    setChecking(true);

    AsyncStorage.getItem(storageKey)
      .then((completed) => {
        if (!mounted || completed === 'true') return;

        startTimerRef.current = setTimeout(() => {
          if (!mounted) return;
          setActiveIndex(0);
          setTargetRect(null);
          setBubbleHeight(0);
          setVisible(true);
        }, startDelayMs);
      })
      .catch((error) => {
        console.log('Load feature guide state failed:', error);
        if (!mounted) return;

        startTimerRef.current = setTimeout(() => {
          if (!mounted) return;
          setActiveIndex(0);
          setTargetRect(null);
          setBubbleHeight(0);
          setVisible(true);
        }, startDelayMs);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
      clearTimers();
    };
  }, [cleanSteps.length, clearTimers, enabled, globalRestartKey, hideGuide, restartKey, startDelayMs, storageKey]);

  const jumpToNextMeasurableStep = useCallback(() => {
    if (activeIndex < cleanSteps.length - 1) {
      setTargetRect(null);
      setBubbleHeight(0);
      setActiveIndex((prev) => prev + 1);
      return;
    }

    finishGuide();
  }, [activeIndex, cleanSteps.length, finishGuide]);

  const measureCurrentTarget = useCallback(() => {
    if (!visible || !currentStep) return;

    const anchor = currentStep.anchorRef.current;
    if (!anchor || typeof anchor.measureInWindow !== 'function') {
      measureAttemptRef.current += 1;

      if (measureAttemptRef.current >= 10) {
        jumpToNextMeasurableStep();
        return;
      }

      measureTimerRef.current = setTimeout(measureCurrentTarget, 140);
      return;
    }

    anchor.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setTargetRect({ x, y, width, height });
        return;
      }

      measureAttemptRef.current += 1;

      if (measureAttemptRef.current >= 10) {
        jumpToNextMeasurableStep();
        return;
      }

      measureTimerRef.current = setTimeout(measureCurrentTarget, 140);
    });
  }, [currentStep, jumpToNextMeasurableStep, visible]);

  useEffect(() => {
    if (!visible || !currentStep) return;

    let cancelled = false;
    measureAttemptRef.current = 0;
    setTargetRect(null);

    if (measureTimerRef.current) {
      clearTimeout(measureTimerRef.current);
      measureTimerRef.current = null;
    }

    const requestedDelay = onStepChange?.(currentStep, activeIndex);
    const delayMs = typeof requestedDelay === 'number' ? requestedDelay : 80;

    measureTimerRef.current = setTimeout(() => {
      if (!cancelled) measureCurrentTarget();
    }, delayMs);

    return () => {
      cancelled = true;
      if (measureTimerRef.current) {
        clearTimeout(measureTimerRef.current);
        measureTimerRef.current = null;
      }
    };
  }, [activeIndex, currentStep, measureCurrentTarget, onStepChange, visible, viewportWidth, viewportHeight]);

  const topBoundary = Math.max(SIDE_MARGIN, insets.top + 8);
  const bottomBoundary = Math.max(SIDE_MARGIN, insets.bottom + 14);
  const usableHeight = Math.max(220, viewportHeight - topBoundary - bottomBoundary);
  const bubbleWidth = Math.min(Math.max(viewportWidth - SIDE_MARGIN * 2, 260), 380);
  const resolvedBubbleHeight = bubbleHeight || DEFAULT_BUBBLE_HEIGHT;
  const maxBubbleHeight = Math.max(180, usableHeight);
  const layoutBubbleHeight = Math.min(resolvedBubbleHeight, maxBubbleHeight);
  const targetCenterX = targetRect ? targetRect.x + targetRect.width / 2 : viewportWidth / 2;
  const bubbleLeft = clamp(
    targetCenterX - bubbleWidth / 2,
    SIDE_MARGIN,
    Math.max(SIDE_MARGIN, viewportWidth - bubbleWidth - SIDE_MARGIN)
  );
  const preferredPlacement = currentStep?.placement || 'auto';
  const spaceAbove = targetRect ? Math.max(0, targetRect.y - topBoundary - TARGET_GAP) : 0;
  const spaceBelow = targetRect
    ? Math.max(0, viewportHeight - bottomBoundary - (targetRect.y + targetRect.height + TARGET_GAP))
    : usableHeight;
  const fitsAbove = targetRect ? spaceAbove >= layoutBubbleHeight : false;
  const fitsBelow = targetRect ? spaceBelow >= layoutBubbleHeight : true;
  const placeAbove = targetRect
    ? preferredPlacement === 'top' && fitsAbove
      ? true
      : preferredPlacement === 'bottom' && fitsBelow
        ? false
        : fitsAbove && !fitsBelow
          ? true
          : !fitsAbove && fitsBelow
            ? false
            : spaceAbove > spaceBelow
    : false;

  const bubbleTop = targetRect
    ? placeAbove
      ? clamp(
          targetRect.y - layoutBubbleHeight - TARGET_GAP,
          topBoundary,
          Math.max(topBoundary, viewportHeight - bottomBoundary - layoutBubbleHeight)
        )
      : clamp(
          targetRect.y + targetRect.height + TARGET_GAP,
          topBoundary,
          Math.max(topBoundary, viewportHeight - bottomBoundary - layoutBubbleHeight)
        )
    : clamp(
        (viewportHeight - layoutBubbleHeight) / 2,
        topBoundary,
        Math.max(topBoundary, viewportHeight - bottomBoundary - layoutBubbleHeight)
      );

  const arrowLeft = clamp(targetCenterX - bubbleLeft - 10, 24, bubbleWidth - 40);
  const targetPulseSize = targetRect
    ? clamp(Math.min(targetRect.width, targetRect.height, 72), 34, 54)
    : 54;
  const targetPulseLeft = targetRect
    ? clamp(
        targetCenterX - targetPulseSize / 2,
        8,
        Math.max(8, viewportWidth - targetPulseSize - 8)
      )
    : 0;
  const targetPulseTop = targetRect
    ? clamp(
        targetRect.y + targetRect.height / 2 - targetPulseSize / 2,
        topBoundary,
        Math.max(topBoundary, viewportHeight - bottomBoundary - targetPulseSize)
      )
    : 0;

  const goBack = useCallback(() => {
    if (activeIndex <= 0) return;
    setTargetRect(null);
    setBubbleHeight(0);
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, [activeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex >= cleanSteps.length - 1) {
      finishGuide();
      return;
    }

    setTargetRect(null);
    setBubbleHeight(0);
    setActiveIndex((prev) => Math.min(cleanSteps.length - 1, prev + 1));
  }, [activeIndex, cleanSteps.length, finishGuide]);

  if ((!visible && !checking) || cleanSteps.length === 0 || !currentStep) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const isLastStep = activeIndex === cleanSteps.length - 1;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent={Platform.OS === 'android'}
      navigationBarTranslucent={Platform.OS === 'android'}
      onRequestClose={finishGuide}
    >
      <View style={styles.overlay}>
        {targetRect && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.targetPulse,
              {
                top: targetPulseTop,
                left: targetPulseLeft,
                width: targetPulseSize,
                height: targetPulseSize,
                borderRadius: targetPulseSize / 2,
                borderColor: colors.primaryDark,
                backgroundColor: colors.primaryLight,
                shadowColor: colors.primaryDark,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        )}

        <View
          style={[
            styles.bubble,
            {
              width: bubbleWidth,
              left: bubbleLeft,
              top: bubbleTop,
              maxHeight: maxBubbleHeight,
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0 && Math.abs(nextHeight - bubbleHeight) > 1) {
              setBubbleHeight(nextHeight);
            }
          }}
        >
          <View
            pointerEvents="none"
            style={[
              styles.arrow,
              {
                left: arrowLeft,
                backgroundColor: colors.card,
                borderColor: colors.border,
                top: placeAbove ? undefined : -10,
                bottom: placeAbove ? -10 : undefined,
              },
            ]}
          />

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bubbleContent}
          >
          <View style={styles.bubbleHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}> 
              <Ionicons name={currentStep.icon || 'sparkles-outline'} size={18} color={colors.primaryDark} />
            </View>

            <View style={styles.titleWrap}>
              <Text style={[styles.stepMeta, { color: colors.primaryDark }]}> 
                {getText('Context Guide', '场景引导', 'Panduan Konteks')} · {activeIndex + 1}/{cleanSteps.length}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>{currentStep.title}</Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.muted }]}>{currentStep.description}</Text>

          <View style={styles.footerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                pressed && styles.pressed,
              ]}
              onPress={finishGuide}
            >
              <Text style={[styles.skipButtonText, { color: colors.primaryDark }]}> 
                {getText('Skip', '跳过', 'Langkau')}
              </Text>
            </Pressable>

            <View style={styles.actionButtons}>
              {activeIndex > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    pressed && styles.pressed,
                  ]}
                  onPress={goBack}
                >
                  <Ionicons name="arrow-back" size={15} color={colors.primaryDark} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primaryDark }]}> 
                    {getText('Back', '上一步', 'Kembali')}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primaryDark },
                  pressed && styles.pressed,
                ]}
                onPress={goNext}
              >
                {targetRect ? (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {isLastStep ? getText('Got it', '知道了', 'Faham') : getText('Next', '下一步', 'Seterusnya')}
                    </Text>
                    <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={15} color="#FFFFFF" />
                  </>
                ) : (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  targetPulse: {
    position: 'absolute',
    borderWidth: 2,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  bubbleContent: {
    padding: 16,
  },
  arrow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMeta: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 3,
  },
  description: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  skipButton: {
    height: 42,
    minWidth: 72,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    minWidth: 96,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
