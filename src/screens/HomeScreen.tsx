import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Image, 
  Modal, 
  Linking,
  TouchableOpacity, 
  FlatList,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { loadHealthRecords } from '../utils/storage';
import {
  Card,
  Chip,
  EmptyState,
  IconButton,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import DigitalTwin from '../components/DigitalTwin';
import LanguageModal from '../components/LanguageModal';
import AddChildModal from '../components/AddChildModal';
import { useAiMealPlanGeneration } from '../context/AiMealPlanGenerationContext';
import Markdown from 'react-native-markdown-display';
import { FileText, X, ExternalLink } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingAIChat from "../components/FloatingAIChat";
import { useActivity } from '../context/PhysicalActivityContext';
import FeatureGuideCoachmark, { FeatureGuideStep } from '../components/FeatureGuideCoachmark';

type FoodHistoryItem = {
  query: string;
  foodNameEn?: string;
  foodNameCn?: string;
  foodNameMs?: string;
  foodNameOriginal?: string;
  fallbackLabel?: string;
};

type FoodSuggestion = FoodHistoryItem & {
  label: string;
  imageUrl?: string;
};

const BASE_URL = 'https://jom-healthy-java.onrender.com';

function useHomeStyles() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  return { styles, theme };
}

function AnimatedHomeHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { themeName } = useTheme();
  const { styles, theme } = useHomeStyles();
  const heartScale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(0.86)).current;
  const haloOpacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    if (themeName !== 'classic') return;

    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(heartScale, {
            toValue: 1.18,
            duration: 170,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1.22,
            duration: 170,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.36,
            duration: 170,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartScale, {
            toValue: 0.96,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 0.96,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.16,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartScale, {
            toValue: 1.1,
            duration: 135,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1.12,
            duration: 135,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.28,
            duration: 135,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 190,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 0.86,
            duration: 190,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.18,
            duration: 190,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(760),
      ])
    );

    heartbeat.start();

    return () => {
      heartbeat.stop();
    };
  }, [haloOpacity, haloScale, heartScale, themeName]);

  if (themeName !== 'classic') {
    return (
      <View
        style={[
          styles.editorialHeader,
          { paddingTop: Math.max(insets.top, 24) + 12 },
        ]}
      >
        <View style={styles.editorialBubbleLarge} />
        <View style={styles.editorialBubbleSmall} />
        <View style={styles.editorialBubbleOutline} />

        <View style={styles.editorialTitleRow}>
          <View style={styles.editorialTitleWrap}>
            <Text style={styles.editorialTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.editorialSubtitle}>{subtitle}</Text>}
          </View>

          <View style={styles.editorialHeaderActionSlot}>{right}</View>
        </View>

        <View style={styles.editorialChipRow}>
          <View style={styles.editorialInfoChip}>
            <Ionicons name="sparkles-outline" size={14} color={theme.colors.primaryDark} />
            <Text style={styles.editorialInfoChipText}>AI Meal Plan</Text>
          </View>
          <View style={styles.editorialInfoChip}>
            <Ionicons name="fitness-outline" size={14} color={theme.colors.primaryDark} />
            <Text style={styles.editorialInfoChipText}>Family Health</Text>
          </View>
          <View style={styles.editorialInfoChip}>
            <Ionicons name="leaf-outline" size={14} color={theme.colors.primaryDark} />
            <Text style={styles.editorialInfoChipText}>Daily Care</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.animatedHeader, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
      <View style={styles.animatedHeaderGlowOne} />
      <View style={styles.animatedHeaderGlowTwo} />

      <View style={styles.animatedHeaderRow}>
        <View style={styles.heartIconWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartHalo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />

          <Animated.View
            style={{
              transform: [{ scale: heartScale }],
            }}
          >
            <Ionicons name="heart" size={24} color="white" />
          </Animated.View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.animatedHeaderTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.animatedHeaderSubtitle}>{subtitle}</Text>}
        </View>

        {right}
      </View>
    </View>
  );
}

function AnimatedProfileAvatar({
  avatar,
  avatarImageUri,
}: {
  avatar: string;
  avatarImageUri?: string;
}) {
  const { styles } = useHomeStyles();
  const floatY = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.96)).current;
  const glowOpacity = useRef(new Animated.Value(0.16)).current;
  const tapScale = useRef(new Animated.Value(1)).current;
  const tapY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(floatY, {
            toValue: -3,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.08,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.28,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(floatY, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.96,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.16,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    floating.start();

    return () => {
      floating.stop();
    };
  }, [floatY, glowOpacity, glowScale]);

  const popAvatar = () => {
    tapScale.stopAnimation();
    tapY.stopAnimation();
    tapScale.setValue(1);
    tapY.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(tapScale, {
          toValue: 1.16,
          duration: 125,
          useNativeDriver: true,
        }),
        Animated.timing(tapY, {
          toValue: -8,
          duration: 125,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(tapScale, {
          toValue: 1,
          friction: 4.2,
          tension: 95,
          useNativeDriver: true,
        }),
        Animated.spring(tapY, {
          toValue: 0,
          friction: 4.2,
          tension: 95,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  return (
    <Pressable
      style={styles.profileAvatarPressArea}
      onPress={popAvatar}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Animate child avatar"
    >
      <Animated.View
        style={[
          styles.profileAvatarAnimatedWrap,
          {
            transform: [
              { translateY: Animated.add(floatY, tapY) },
              { scale: tapScale },
            ],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.profileAvatarGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <ChildAvatar
          avatar={avatar}
          avatarImageUri={avatarImageUri}
          size={58}
          style={styles.profileAvatar}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { openAiMealPlanModal } = useAiMealPlanGeneration();
  const { language, t } = useLanguage();
  const { themeName, theme } = useTheme();
  const { styles } = useHomeStyles();
  const { height: viewportHeight } = useWindowDimensions();
  
  const homeScrollRef = useRef<ScrollView>(null);
  const homeBodyRef = useRef<View>(null);
  const searchGuideRef = useRef<View>(null);
  const createProfileGuideRef = useRef<View>(null);
  const aiMealGuideRef = useRef<View>(null);
  const healthCheckGuideRef = useRef<View>(null);
  const hydrationGuideRef = useRef<View>(null);
  const activityGuideRef = useRef<View>(null);
  const growthGuideRef = useRef<View>(null);
  const insightsGuideRef = useRef<View>(null);
  const homeBodyYRef = useRef(0);
  
  const {
    activeChild,
    nutritionProgress,
    getTip,
    todayWaterIntake, 
    dailyWaterGoal, 
    addWater, 
    todayActivityMinutes, 
    dailyActivityGoal,
    addActivity,
  } = useChildProfile();

  const [showLanguage, setShowLanguage] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const currentLanguage = language; 

  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<FoodHistoryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  
  const [latestRecord, setLatestRecord] = useState<any>(null);
  const [chartRecords, setChartRecords] = useState<any[]>([]);

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';
  const locale = language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-US';

  const allGoalsMet =
    nutritionProgress.carbs.current >= nutritionProgress.carbs.target &&
    nutritionProgress.protein.current >= nutritionProgress.protein.target &&
    nutritionProgress.fat.current >= nutritionProgress.fat.target;

  // 获取最新的健康记录 (用于成长概览与 BMI 展示)
  useFocusEffect(
    React.useCallback(() => {
      const fetchLatestRecord = async () => {
        const records = await loadHealthRecords();
        if (records && records.length > 0 && activeChild) {
          const childRecords = records.filter(r => r.nickname === activeChild.nickname);
          if (childRecords.length > 0) {
            const sorted = [...childRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setLatestRecord(sorted[sorted.length - 1]);
            setChartRecords(sorted.slice(-6)); // 截取最近 6 次记录渲染图表
          } else {
            setLatestRecord(null);
            setChartRecords([]);
          }
        } else {
          setLatestRecord(null);
          setChartRecords([]);
        }
      };
      fetchLatestRecord();
    }, [activeChild])
  );

  const lastCheckDate = useMemo(
    () =>
      latestRecord 
        ? new Date(latestRecord.date).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null,
    [locale, latestRecord]
  );

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const getLocalizedFoodLabel = (item?: Partial<FoodHistoryItem> | null) => {
    if (!item) return '';

    const localizedLabel =
      language === 'zh'
        ? item.foodNameCn || item.foodNameOriginal || item.foodNameEn || item.foodNameMs
        : language === 'ms'
          ? item.foodNameMs || item.foodNameOriginal || item.foodNameEn || item.foodNameCn
          : item.foodNameEn || item.foodNameOriginal || item.foodNameMs || item.foodNameCn;

    return localizedLabel || item.fallbackLabel || item.query || '';
  };

  const handleHomeBodyLayout = useCallback((event: LayoutChangeEvent) => {
    homeBodyYRef.current = event.nativeEvent.layout.y;
  }, []);

  const handleHomeGuideStepChange = useCallback((step: FeatureGuideStep) => {
    const anchor = step.anchorRef.current;
    const body = homeBodyRef.current;

    if (
      !anchor ||
      !body ||
      typeof anchor.measureInWindow !== 'function' ||
      typeof anchor.measureLayout !== 'function'
    ) {
      return 120;
    }

    anchor.measureInWindow((_screenX, screenY, _width, height) => {
      const viewportPadding = 72;
      const targetTop = screenY;
      const targetBottom = screenY + height;
      const visibleTop = Math.max(targetTop, viewportPadding);
      const visibleBottom = Math.min(targetBottom, viewportHeight - viewportPadding);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleRatio = visibleHeight / Math.max(1, Math.min(height, viewportHeight));
      const isBarelyVisible = visibleHeight < 40 || visibleRatio < 0.5;

      if (!isBarelyVisible) {
        return;
      }

      anchor.measureLayout(
        body,
        (_x, y) => {
          homeScrollRef.current?.scrollTo({
            y: Math.max(homeBodyYRef.current + y - viewportHeight * 0.32, 0),
            animated: true,
          });
        },
        () => {
          if (step.key === 'food-search') {
            homeScrollRef.current?.scrollTo({ y: 0, animated: true });
          }
        }
      );
    });

    return 520;
  }, [viewportHeight]);

  const getFoodImageUrl = (item: any) => {
    const candidate =
      item?.picUrl ||
      item?.pic_url ||
      item?.imageUrl ||
      item?.image_url ||
      item?.foodImageUrl ||
      item?.food_image_url ||
      '';

    return typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())
      ? candidate.trim()
      : '';
  };

  const getStatusLabel = (status?: string | null) => {
    const value = String(status || 'Normal').toLowerCase();

    if (value.includes('under')) {
      return getText('Underweight', '偏瘦', 'Kurang Berat');
    }

    if (value.includes('over')) {
      return getText('Overweight', '偏重', 'Berat Berlebihan');
    }

    if (value.includes('obese')) {
      return getText('Obese', '肥胖', 'Obes');
    }

    if (value.includes('risk')) {
      return getText('At Risk', '需注意', 'Berisiko');
    }

    return getText('Normal', '正常', 'Normal');
  };

  const getTwinNickname = () => {
    const name = activeChild?.nickname || getText('Child', '小孩', 'Anak');
    return getText(`${name}'s Twin`, `${name}的数字分身`, `Digital Twin ${name}`);
  };

  const getTwinTip = () => {
    if (!activeChild) {
      return getText(
        'Create a child profile to unlock personalized health tips.',
        '创建小孩档案后，可以获得个性化健康建议。',
        'Cipta profil kanak-kanak untuk mendapatkan tip kesihatan peribadi.'
      );
    }

    if (allGoalsMet) {
      return getText(
        'Great job! Today’s carbs, protein and fat goals are all on track.',
        '太棒了！今天的碳水、蛋白质和脂肪目标都完成得不错。',
        'Bagus! Sasaran karbohidrat, protein dan lemak hari ini berada di landasan yang baik.'
      );
    }

    if (nutritionProgress.protein.current < nutritionProgress.protein.target) {
      return getText(
        'Protein is a little low today. Try adding egg, fish, chicken, tofu or yogurt.',
        '今天蛋白质有点不足，可以加鸡蛋、鱼、鸡肉、豆腐或酸奶。',
        'Protein hari ini agak rendah. Cuba tambah telur, ikan, ayam, tauhu atau yogurt.'
      );
    }

    if (nutritionProgress.carbs.current < nutritionProgress.carbs.target) {
      return getText(
        'Carbs are still low today. Rice, oats, bread, noodles or fruit can help provide energy.',
        '今天碳水还偏少，可以搭配米饭、燕麦、面包、面条或水果补充能量。',
        'Karbohidrat hari ini masih rendah. Nasi, oat, roti, mi atau buah boleh membantu memberi tenaga.'
      );
    }

    if (nutritionProgress.fat.current < nutritionProgress.fat.target) {
      return getText(
        'Healthy fats are a little low. Add avocado, nuts, egg, fish or olive oil in a child-sized portion.',
        '健康脂肪有点不足，可以少量加入牛油果、坚果、鸡蛋、鱼或橄榄油。',
        'Lemak sihat agak rendah. Tambah avokado, kekacang, telur, ikan atau minyak zaitun dalam hidangan sesuai untuk kanak-kanak.'
      );
    }

    return getText(
      'Try to keep today’s meals balanced with vegetables, protein and whole grains.',
      '今天尽量让餐食包含蔬菜、蛋白质和全谷物，保持均衡。',
      'Cuba pastikan hidangan hari ini seimbang dengan sayur, protein dan bijirin penuh.'
    );
  };

  // 带超时中断与自动重试的 Fetch 工具函数 (解决免费服务器冷启动缓慢问题)
  const fetchWithRetry = async (url: string, retries = 3, timeoutMs = 15000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error: any) {
        console.log(`第 ${i + 1} 次拉取健康建议失败或超时，准备重试...`, error.message);
        if (i === retries - 1) throw error; 
        
        // 等待 2 秒后再发起下一次重试，给服务器喘息时间
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  // 获取并缓存系统推荐的健康洞察 (Health Insights) 数据
  const fetchRecommendedTopics = useCallback(async () => {
    // 1. 优先尝试读取本地缓存数据，实现“无缝秒开”体验
    try {
      const cachedTopics = await AsyncStorage.getItem(`@cached_topics_${currentLanguage}`);
      if (cachedTopics) {
        setAllTopics(JSON.parse(cachedTopics));
        setTopicsLoading(false); // 有缓存直接取消加载圈，后台保持静默刷新
      } else {
        setTopicsLoading(true); 
      }
    } catch (e) {
      setTopicsLoading(true);
    }

    // 2. 发起自动重试的网络请求，拉取最新推荐并同时唤醒后端服务器
    try {
      let currentStatus = 'NORMAL';
      if (activeChild && activeChild.status) {
        currentStatus = activeChild.status.toUpperCase(); 
      }
      const lang = currentLanguage || 'en'; 
      const url = `${BASE_URL}/api/topics/recommend?status=${currentStatus}&lang=${lang}`;

      // 调用上面的重试工具：最大重试 3 次，单次超时 15 秒（总容忍时长约 45 秒）
      const data = await fetchWithRetry(url, 3, 15000);

      if (Array.isArray(data) && data.length > 0) {
        setAllTopics(data);
        // 3. 将成功获取的新数据覆盖至本地缓存中
        await AsyncStorage.setItem(`@cached_topics_${currentLanguage}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error("服务器唤醒失败 (达到最大重试次数):", error);
      // 若彻底失败且本地无缓存，则 allTopics 保持空数组，进而触发底部兜底 UI
    } finally {
      setTopicsLoading(false);
    }
  }, [activeChild?.status, currentLanguage]);

  useEffect(() => {
    fetchRecommendedTopics();
  }, [fetchRecommendedTopics]);

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');

      try {
        const response = await fetch(
          `${BASE_URL}/food/getFoodNutrition?name=${encodeURIComponent(query)}`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const nextSuggestions: FoodSuggestion[] = data.slice(0, 6).map((item: any) => {
          const backendQuery =
            item.foodNameCombine ||
            item.foodNameOriginal ||
            item.foodNameEn ||
            item.foodNameMs ||
            item.foodNameCn ||
            query;

          const suggestionBase: FoodHistoryItem = {
            query: backendQuery || query,
            foodNameEn: item.foodNameEn,
            foodNameCn: item.foodNameCn,
            foodNameMs: item.foodNameMs,
            foodNameOriginal: item.foodNameOriginal,
            fallbackLabel: query,
          };

          return {
            ...suggestionBase,
            label: getLocalizedFoodLabel(suggestionBase) || query,
            imageUrl: getFoodImageUrl(item),
          };
        });

        setSuggestions(nextSuggestions);
        setShowSuggestions(true);
      } catch (error: any) {
        console.log('Food suggestion search failed:', error);
        setSearchError(
          getText(
            'Network error. Please try again.',
            '网络错误，请稍后再试。',
            'Ralat rangkaian. Cuba lagi.'
          )
        );
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText, language]);

  const handleFoodSearch = (value?: string | FoodHistoryItem) => {
    const selectedItem = typeof value === 'string' || value === undefined ? null : value;
    const fallbackInput = typeof value === 'string' ? value : searchText;
    const foodName = (selectedItem?.query || fallbackInput || '').trim();

    if (!foodName) {
      Alert.alert(
        getText('Enter a food name', '请输入食物名称', 'Masukkan nama makanan')
      );
      return;
    }

    const historyItem: FoodHistoryItem = selectedItem
      ? {
          query: foodName,
          foodNameEn: selectedItem.foodNameEn,
          foodNameCn: selectedItem.foodNameCn,
          foodNameMs: selectedItem.foodNameMs,
          foodNameOriginal: selectedItem.foodNameOriginal,
          fallbackLabel: selectedItem.fallbackLabel || getLocalizedFoodLabel(selectedItem) || foodName,
        }
      : {
          query: foodName,
          fallbackLabel: foodName,
        };

    setSearchHistory((prev) =>
      [
        historyItem,
        ...prev.filter(
          (item) => item.query.toLowerCase() !== historyItem.query.toLowerCase()
        ),
      ].slice(0, 6)
    );

    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');

    navigation.navigate('FoodInfo', {
      foodName,
      source: 'search',
    });
  };

  // 计算并生成首页面板中 BMI 微型折线图所需的坐标数据
  const bmiChartData = useMemo(() => {
    if (chartRecords.length < 2) return null;
    const values = chartRecords.map(r => r.bmiValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;
    const width = 100;
    const height = 40;
    const padding = 6;
    
    const points = values.map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y, val };
    });
    
    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    
    return { points, pointsString, width, height };
  }, [chartRecords]);
  
  const { todayTotal, dailyGoal } = useActivity();
  const progressPercent = (todayTotal / dailyGoal) * 100;

  return (
    <>
      <Screen padded={false} scrollRef={homeScrollRef}>
        <AnimatedHomeHeader
          title={t('appName')}
          subtitle={t('tagline')}
          right={
            <Pressable
              style={[styles.langButton, themeName !== 'classic' && styles.langButtonEditorial]}
              onPress={() => setShowLanguage(true)}
            >
              <Text style={[styles.langText, themeName !== 'classic' && styles.langTextEditorial]}>{langCode}</Text>
            </Pressable>
          }
        />

        <View
          ref={homeBodyRef}
          style={styles.body}
          onLayout={handleHomeBodyLayout}
          collapsable={false}
        >
          {/* Search */}
          <View ref={searchGuideRef} collapsable={false}>
            <Card>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={22}
                color={theme.colors.primaryDark}
              />

              <TextInput
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setShowSuggestions(true);
                }}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor="#B8BEC8"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => handleFoodSearch()}
              />

              {searchText.length > 0 && (
                <IconButton
                  icon="close"
                  size={34}
                  onPress={() => {
                    setSearchText('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSearchError('');
                  }}
                />
              )}

              <IconButton
                icon="camera"
                size={38}
                onPress={() => navigation.navigate('CameraSearch')}
              />
            </View>

            {searchText.trim().length > 0 && showSuggestions && (
              <View style={styles.suggestionBox}>
                {searchLoading ? (
                  <View style={styles.suggestionStatus}>
                    <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                    <Text style={styles.suggestionStatusText}>
                      {getText('Searching...', '搜索中...', 'Mencari...')}
                    </Text>
                  </View>
                ) : searchError ? (
                  <View style={styles.suggestionStatus}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={styles.suggestionError}>{searchError}</Text>
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, index) => (
                    <Pressable
                      key={`${item.query}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 && styles.suggestionItemLast,
                      ]}
                      onPress={() => handleFoodSearch(item)}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.suggestionImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.suggestionImageFallback}>
                          <Ionicons
                            name="restaurant-outline"
                            size={18}
                            color={theme.colors.primaryDark}
                          />
                        </View>
                      )}

                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.suggestionStatus}>
                    <Text style={styles.suggestionStatusText}>
                      {getText(
                        'No matching food found',
                        '没有找到匹配食物',
                        'Tiada makanan ditemui'
                      )}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {searchText.trim().length === 0 && searchHistory.length > 0 && (
              <>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>
                    {getText('Search History', '搜索记录', 'Sejarah Carian')}
                  </Text>

                  <Pressable onPress={() => setSearchHistory([])}>
                    <Text style={styles.clearHistory}>
                      {getText('Clear', '清空', 'Kosongkan')}
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsRow}
                >
                  {searchHistory.map((food, index) => (
                    <Chip
                      key={`${food.query}-${index}`}
                      label={getLocalizedFoodLabel(food)}
                      onPress={() => handleFoodSearch(food)}
                    />
                  ))}
                </ScrollView>
              </>
            )}
            </Card>
          </View>

          {/* Child Profile */}
          {!activeChild ? (
            <EmptyState
              emoji="👶"
              title={getText(
                'No child profile yet',
                '还没有创建小孩档案',
                'Belum ada profil kanak-kanak'
              )}
              subtitle={getText(
                'You can still use food search, growth overview and health insights. Create a profile to unlock personalized meal plans.',
                '你仍然可以使用食品搜索、成长概览和健康建议。创建档案后可生成个性化食谱。',
                'Anda masih boleh guna carian makanan, gambaran pertumbuhan dan panduan kesihatan. Cipta profil untuk pelan makanan peribadi.'
              )}
              action={
                <View ref={createProfileGuideRef} collapsable={false}>
                  <PrimaryButton
                    title={getText('Create Profile', '创建档案', 'Cipta Profil')}
                    icon="add"
                    onPress={() => setShowAddChild(true)}
                  />
                </View>
              }
            />
          ) : (
            <Card style={styles.profileSummaryCard}>
              <View style={styles.profileSummaryTop}>
                <AnimatedProfileAvatar
                  avatar={activeChild.avatar}
                  avatarImageUri={activeChild.avatarImageUri}
                />

                <View style={styles.profileInfo}>
                  <View style={styles.profileNameRow}>
                    <Text style={styles.profileAge}>{activeChild.nickname}</Text>
                    <View style={styles.onlineDot} />
                  </View>

                  <Text style={styles.profileMeta}>
                    {activeChild.gender === 'boy'
                      ? getText('Boy', '男孩', 'Lelaki')
                      : getText('Girl', '女孩', 'Perempuan')}{' '}
                    · {activeChild.height}cm, {activeChild.weight}kg
                  </Text>

                  {lastCheckDate && (
                    <Text style={styles.profileLastCheck}>
                      {t('lastCheck')}: {lastCheckDate}
                    </Text>
                  )}
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {getStatusLabel(activeChild?.status || 'Normal')}
                  </Text>
                </View>
              </View>

              <View style={styles.profileActions}>
                <View ref={aiMealGuideRef} collapsable={false} style={{ flex: 1 }}>
                  <Pressable
                    style={[
                      styles.mealPlanButton,
                      language === 'ms' && styles.profileActionButtonMalay,
                    ]}
                    onPress={() => openAiMealPlanModal({ startDate: new Date() })}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.mealPlanButtonText,
                        language === 'ms' && styles.profileActionButtonTextMalay,
                      ]}
                      numberOfLines={language === 'ms' ? 2 : undefined}
                    >
                      {getText('AI Meal Plan', 'AI 膳食计划', 'Pelan Makanan AI')}
                    </Text>
                  </Pressable>
                </View>

                {/* 进入健康检查 (BMI 测试) 页面按钮 */}
                <View ref={healthCheckGuideRef} collapsable={false} style={{ flex: 1 }}>
                  <Pressable
                    style={[
                      styles.checkHealthButton,
                      language === 'ms' && styles.profileActionButtonMalay,
                    ]}
                    onPress={() => navigation.navigate('HealthCheck')}
                  >
                    <Ionicons
                      name="pulse"
                      size={17}
                      color={theme.colors.primaryDark}
                    />
                    <Text
                      style={[
                        styles.checkHealthButtonText,
                        language === 'ms' && styles.profileActionButtonTextMalay,
                      ]}
                      numberOfLines={language === 'ms' ? 2 : undefined}
                    >
                      {t('checkHealth')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          {/* Hydration Card */}
          {(() => {
            const isWellHydrated = todayWaterIntake >= dailyWaterGoal;
            const progressPercent = Math.min((todayWaterIntake / dailyWaterGoal) * 100, 100) || 0;

            return (
              <View ref={hydrationGuideRef} collapsable={false}>
                <Pressable 
                  onPress={() => navigation.navigate('Hydration')}
                  style={({ pressed }) => [
                    styles.newHydrationCard,
                    pressed && { transform: [{ scale: 0.98 }] } 
                  ]}
                >
                <View style={styles.newHydrationTopRow}>
                  <View style={styles.newHydrationLeft}>
                    <View style={styles.newHydrationIconContainer}>
                      <Ionicons name="water" size={22} color="#3B82F6" />
                    </View>
                    
                    <View>
                      <Text style={styles.newHydrationTitle}>
                        {getText('Hydration', '饮水', 'Penghidratan')}
                      </Text>
                      <View style={[
                        styles.newHydrationBadge, 
                        isWellHydrated ? styles.newHydrationBadgeGood : styles.newHydrationBadgeNeeds
                      ]}>
                        <Text style={[
                          styles.newHydrationBadgeText,
                          isWellHydrated ? styles.newHydrationBadgeTextGood : styles.newHydrationBadgeTextNeeds
                        ]}>
                          {isWellHydrated 
                            ? getText('Well Hydrated', '水分充足', 'Penghidratan Baik') 
                            : getText('Needs More Water', '需要多喝水', 'Perlu Lebih Air')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sectionArrowButton}>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.primaryDark} />
                  </View>
                </View>

                <View style={styles.newHydrationProgressContainer}>
                  <View style={styles.newHydrationProgressLabelRow}>
                    <Text style={styles.newHydrationProgressLabel}>
                      {getText('Progress', '进度', 'Kemajuan')}
                    </Text>
                    <Text style={styles.newHydrationProgressValue}>
                      {todayWaterIntake} / {dailyWaterGoal} {t('ml')}
                    </Text>
                  </View>
                  
                  <View style={styles.newHydrationBarBg}>
                    <View 
                      style={[
                        styles.newHydrationBarFill, 
                        { 
                          width: `${progressPercent}%`,
                          backgroundColor: isWellHydrated ? '#3B82F6' : '#60A5FA'
                        }
                      ]} 
                    /> 
                  </View>
                </View>
                </Pressable>
              </View>
            );
          })()}

          {/* 运动记录入口卡片 (Physical Activity) */}
          <View ref={activityGuideRef} collapsable={false}>
            <Pressable onPress={() => navigation.navigate('PhysicalActivity')}>
              <Card style={styles.newActivityCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconContainer}>
                <Image source={require('../assets/images/physical-activity-icon.jpeg')} style={styles.activityImage} resizeMode="cover" />
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.activityTitleText}>{getText('Activity', '运动', 'Aktiviti')}</Text>
                <View style={styles.statusBadgeActivity}>
                  <Text style={styles.statusText}>
                    {todayTotal < dailyGoal / 2 ? (t('lowactive') || 'Low Activity') : (t('active') || 'Active')}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionArrowButton}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primaryDark} />
              </View>
            </View>

            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{getText('Progress', '进度', 'Kemajuan')}</Text>
              <Text style={styles.progressValueText}>
                {todayTotal} / {dailyGoal} {t('minutes') || 'mins'}
              </Text>
            </View>

            <View style={styles.thinBarBg}>
              <View 
                style={[
                  styles.thinBarFill, 
                  { width: `${Math.min((todayTotal / dailyGoal) * 100, 100)}%` }
                ]} 
              /> 
            </View>
              </Card>
            </Pressable>
          </View>
          
          {/* 成长概览入口卡片及微型折线图 (Growth Overview) */}
          <View
            ref={growthGuideRef}
            collapsable={false}
          >
            <Pressable
              style={styles.growthOverviewCard}
              onPress={() => navigation.navigate('Growth')}
            >
            <View style={styles.growthHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.growthTitle}>{t('growthOverview')}</Text>
                
                {activeChild?.bmi && (
                  <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                     <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700' }}>BMI {activeChild.bmi}</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionArrowButton}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.primaryDark}
                />
              </View>
            </View>

            <View style={styles.growthLineWrap}>
              {bmiChartData ? (
                <Svg width="100%" height={bmiChartData.height}>
                  <Polyline
                    points={bmiChartData.pointsString}
                    fill="none"
                    stroke={theme.colors.primaryDark}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {bmiChartData.points.map((p, i) => (
                    <SvgCircle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#FFFFFF"
                      stroke={theme.colors.primaryDark}
                      strokeWidth="2"
                    />
                  ))}
                </Svg>
              ) : (
                <>
                  <View style={styles.growthDottedLine} />
                  <View style={[styles.growthDot, { left: '0%' }]} />
                  <View style={[styles.growthDot, { left: '32%' }]} />
                  <View style={[styles.growthDot, { left: '64%' }]} />
                  <View style={[styles.growthDot, { right: 0 }]} />
                </>
              )}
            </View>

            <Text style={styles.growthHint}>
              {activeChild
                ? getText(
                    'Tap to view detailed growth chart',
                    '点击查看详细成长图表',
                    'Ketik untuk lihat carta pertumbuhan'
                  )
                : getText(
                    'Create profile to track growth',
                    '创建档案以追踪成长',
                    'Cipta profil untuk jejak pertumbuhan'
                  )}
            </Text>
            </Pressable>
          </View>

          {/* 健康建议与洞察列表 (Health Insights) */} 
          <View
            ref={insightsGuideRef}
            collapsable={false}
          >
            <Text style={styles.localSectionTitle}>{t('healthInsights')}</Text>

            {topicsLoading ? (
               <ActivityIndicator size="small" color={theme.colors.primaryDark} style={{ paddingVertical: 20 }} />
            ) : allTopics.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.displayTopicsScroll}
              >
                {allTopics.map((topic) => (
                  <Pressable 
                    key={topic.id || topic.title} 
                    style={styles.topicCard}
                    onPress={() => {
                      setSelectedTopic(topic);
                      setShowTopicModal(true);
                    }}
                  >
                    <View style={styles.topicCategoryBadge}>
                      <Text style={styles.topicCategoryText}>
                        {topic?.category 
                          ? t(topic.category.trim().toLowerCase())
                          : t('healthInsights')}
                      </Text>
                    </View>

                    <Image 
                      source={{ uri: topic.imageUrl }} 
                      style={styles.topicImage} 
                      resizeMode="cover" 
                    />

                    <View style={styles.topicTextContainer}>
                      <Text style={styles.topicTitle} numberOfLines={2}>
                        {topic.title}
                      </Text>
                      <Text style={styles.topicSummary} numberOfLines={2}>
                        {topic.summary}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              // 请求失败或数据为空时的重试防呆处理UI
              <View style={styles.emptyInsightBox}>
                <Ionicons name="bulb-outline" size={28} color={theme.colors.muted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyInsightText}>
                  {getText('No insights available at the moment.', '暂无健康建议内容，请稍后重试。', 'Tiada panduan kesihatan buat masa ini.')}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchRecommendedTopics}>
                  <Text style={styles.retryBtnText}>
                    {getText('Tap to Retry', '点击重试', 'Ketik untuk Cuba Lagi')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Screen>

      {/* 健康建议详情阅读弹窗 (Health Insight Modal) */}
      <Modal visible={showTopicModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {selectedTopic && (
            <View style={styles.modalContent}>
              
              <View style={styles.modalImageWrap}>
                <Image source={{ uri: selectedTopic.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                <TouchableOpacity onPress={() => setShowTopicModal(false)} style={styles.modalCloseBtn}>
                  <X color="#FFFFFF" size={20} />
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.modalTagRow}>
                  <FileText color={theme.colors.primaryDark} size={18} />
                  <Text style={styles.modalTagText}>{t('healthInsights')}</Text>
                </View>
                
                <Text style={styles.modalTitle}>{selectedTopic.title}</Text>
                
                <Markdown
                  style={{
                    body: { color: '#475569', fontSize: 16, lineHeight: 24 },
                    strong: { fontWeight: 'bold', color: '#2F3A3A' },
                    ordered_list_icon: { color: theme.colors.primaryDark, fontWeight: 'bold' }
                  }}
                >
                  {selectedTopic.content}
                </Markdown>
              </ScrollView>
              
              {selectedTopic.sourceUrl && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => Linking.openURL(selectedTopic.sourceUrl)} style={styles.modalActionBtn}>
                    <ExternalLink color="#3B82F6" size={18} />
                    <Text style={styles.modalActionText}>{t('readOriginal')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <LanguageModal
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />

      <AddChildModal
        visible={showAddChild}
        onClose={() => setShowAddChild(false)}
      />

      <FeatureGuideCoachmark
        guideKey="home_guest_core"
        enabled={!activeChild && !showLanguage && !showAddChild && !showTopicModal}
        steps={[
          {
            key: 'food-search',
            anchorRef: searchGuideRef,
            icon: 'search-outline',
            placement: 'bottom',
            title: getText('Start by searching a food', '先从搜索食物开始', 'Mulakan dengan mencari makanan'),
            description: getText(
              'When you want to understand a meal or ingredient, type its name here. JomHealthy will show matching foods and nutrition details.',
              '当你想了解某个食物或食材时，在这里输入名称。JomHealthy 会返回匹配结果和营养信息。',
              'Apabila anda ingin memahami hidangan atau bahan, taip namanya di sini. JomHealthy akan menunjukkan padanan dan maklumat nutrisi.'
            ),
          },
          {
            key: 'create-profile',
            anchorRef: createProfileGuideRef,
            icon: 'person-add-outline',
            placement: 'top',
            title: getText('Create a child profile when you are ready', '准备好后创建儿童档案', 'Cipta profil anak apabila anda bersedia'),
            description: getText(
              'Profiles unlock personalized nutrition targets, AI meal plans and health suggestions for each child.',
              '儿童档案会开启个性化营养目标、AI 膳食计划和健康建议。',
              'Profil membuka sasaran nutrisi peribadi, pelan makanan AI dan cadangan kesihatan untuk setiap anak.'
            ),
          },
        ]}
      />

      <FeatureGuideCoachmark
        guideKey="home_profile_core"
        enabled={!!activeChild && !showLanguage && !showAddChild && !showTopicModal}
        onStepChange={handleHomeGuideStepChange}
        steps={[
          {
            key: 'ai-meal-plan',
            anchorRef: aiMealGuideRef,
            icon: 'sparkles-outline',
            placement: 'bottom',
            title: getText('Generate a plan for this child', '为当前小孩生成膳食计划', 'Jana pelan untuk anak ini'),
            description: getText(
              'This uses the selected child profile and nutrition needs to create a daily meal plan. It is the fastest path from needs to meals.',
              '这里会结合当前儿童档案和营养需求生成每日膳食计划，是从“需求”到“餐食”的最快入口。',
              'Fungsi ini menggunakan profil anak dan keperluan nutrisi untuk menjana pelan makanan harian.'
            ),
          },
          {
            key: 'health-check',
            anchorRef: healthCheckGuideRef,
            icon: 'pulse-outline',
            placement: 'bottom',
            title: getText('Check growth and health context', '补充成长与健康信息', 'Semak konteks tumbesaran dan kesihatan'),
            description: getText(
              'Use Health Check to record growth details. The home page can then show more meaningful status and recommendations.',
              '使用健康检查记录成长信息，首页就能展示更有参考价值的状态和建议。',
              'Gunakan Health Check untuk merekod maklumat tumbesaran supaya cadangan menjadi lebih bermakna.'
            ),
          },
          {
            key: 'hydration',
            anchorRef: hydrationGuideRef,
            icon: 'water-outline',
            placement: 'top',
            title: getText('Track daily hydration in context', '结合日常场景记录饮水', 'Jejak hidrasi harian mengikut situasi'),
            description: getText(
              'Tap this card when the child drinks water or beverages. It helps the dashboard reflect today’s real routine.',
              '当小孩喝水或饮品时点这里记录，让首页真正反映今天的生活情况。',
              'Ketik kad ini apabila anak minum air atau minuman supaya papan pemuka mencerminkan rutin sebenar hari ini.'
            ),
          },
          {
            key: 'physical-activity',
            anchorRef: activityGuideRef,
            icon: 'walk-outline',
            placement: 'top',
            title: getText('Record daily movement next', '接着记录每天的运动', 'Rekod pergerakan harian seterusnya'),
            description: getText(
              'Use this card to log activity minutes. It helps you connect nutrition planning with the child’s daily energy use.',
              '通过这里记录运动时长，把营养安排和小孩当天的活动量联系起来。',
              'Gunakan kad ini untuk merekod minit aktiviti supaya perancangan nutrisi berkait dengan penggunaan tenaga harian anak.'
            ),
          },
          {
            key: 'growth-overview',
            anchorRef: growthGuideRef,
            icon: 'trending-up-outline',
            placement: 'top',
            title: getText('Review growth trends over time', '查看一段时间内的成长趋势', 'Semak trend tumbesaran dari semasa ke semasa'),
            description: getText(
              'Growth Overview brings recent measurements together so you can open the detailed chart when you want more context.',
              'Growth Overview 会汇总近期记录，需要更详细背景时可以从这里进入图表页。',
              'Growth Overview menghimpunkan rekod terkini supaya anda boleh membuka carta terperinci apabila perlukan konteks tambahan.'
            ),
          },
          {
            key: 'health-insights',
            anchorRef: insightsGuideRef,
            icon: 'bulb-outline',
            placement: 'top',
            title: getText('Use health insights for practical follow-up', '用健康建议完成下一步行动', 'Gunakan health insights untuk tindakan susulan'),
            description: getText(
              'These cards explain useful topics in context, such as habits, diet and reports, so the dashboard leads to action instead of just numbers.',
              '这里会结合当前场景展示习惯、饮食和报告等健康内容，让首页不只是数字，而是能继续行动。',
              'Kad ini menerangkan topik seperti tabiat, diet dan laporan mengikut konteks supaya papan pemuka membawa kepada tindakan, bukan sekadar angka.'
            ),
          },
        ]}
      />
    </>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  editorialHeader: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: themeColors.primaryLight,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  editorialBubbleLarge: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.40)',
    right: -60,
    top: -66,
  },

  editorialBubbleSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.26)',
    left: -44,
    bottom: -64,
  },

  editorialBubbleOutline: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(13,107,118,0.14)',
    right: 26,
    bottom: -28,
  },

  editorialTitleRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  editorialHeaderActionSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  editorialTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  editorialTitle: {
    color: themeColors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  editorialSubtitle: {
    marginTop: 4,
    color: themeColors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },

  editorialChipRow: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  editorialInfoChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(13,107,118,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  editorialInfoChipText: {
    color: themeColors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },

  langButtonEditorial: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  langTextEditorial: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  animatedHeader: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  animatedHeaderGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -50,
    top: -20,
  },

  animatedHeaderGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -20,
    bottom: -10,
  },

  animatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },

  heartIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heartHalo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: themeColors.card,
  },

  animatedHeaderTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },

  animatedHeaderSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 5,
    fontSize: 14,
  },

  body: {
    padding: 20,
    gap: 16,
    paddingBottom: 110,
  },

  langButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  langText: {
    color: 'white',
    fontWeight: '800',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.bg,
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 56,
  },

  searchInput: {
    flex: 1,
    color: themeColors.text,
    fontSize: 15,
    paddingVertical: 10,
  },

  suggestionBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 18,
    backgroundColor: themeColors.card,
    overflow: 'hidden',
  },

  suggestionItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  suggestionItemLast: {
    borderBottomWidth: 0,
  },

  suggestionImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  suggestionImageFallback: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: themeColors.text,
    fontWeight: '600',
  },

  suggestionStatus: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  suggestionStatusText: {
    fontSize: 13,
    color: themeColors.muted,
  },

  suggestionError: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  historyTitle: {
    color: themeColors.text,
    fontWeight: '800',
    fontSize: 13,
  },

  clearHistory: {
    color: themeColors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },

  suggestionsRow: {
    marginTop: 10,
  },

  profileSummaryCard: {
    padding: 18,
    borderRadius: 24,
  },

  profileSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatarPressArea: {
    width: 72,
    height: 72,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAvatarAnimatedWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAvatarGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: themeColors.primaryLight,
  },

  profileAvatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  profileInfo: {
    flex: 1,
  },

  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  profileAge: {
    fontSize: 20,
    fontWeight: '900',
    color: themeColors.text,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  profileMeta: {
    marginTop: 4,
    fontSize: 13,
    color: themeColors.text,
  },

  profileLastCheck: {
    marginTop: 4,
    fontSize: 12,
    color: themeColors.muted,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDFBE8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: themeColors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  mealPlanButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  mealPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  checkHealthButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  checkHealthButtonText: {
    color: themeColors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },

  // 运动记录卡片 (Physical Activity) 相关样式
  profileActionButtonMalay: {
    height: 'auto',
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  profileActionButtonTextMalay: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },

  newActivityCard: {
    backgroundColor: themeColors.card,
    borderRadius: 24,
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    overflow: 'hidden', 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityImage: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  activityTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusBadgeActivity: {
    backgroundColor: '#FEF3C6', 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#BB4D00', 
    fontSize: 12,
    fontWeight: '600',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: themeColors.muted,
    fontWeight: '500',
  },
  progressValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  thinBarBg: {
    height: 8,
    backgroundColor: themeColors.surfaceAlt, 
    borderRadius: 4,
    overflow: 'hidden',
  },
  thinBarFill: {
    height: '100%',
    backgroundColor: '#10B981', 
  },

  // 成长概览卡片 (Growth Overview) 相关样式
  growthOverviewCard: {
    backgroundColor: themeColors.card,
    borderRadius: 24,
    padding: 20,
    minHeight: 150,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  growthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  growthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },

  growthLineWrap: {
    height: 44,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },

  growthDottedLine: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D3D8E0',
  },

  growthDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6CDD8',
    top: 19,
  },

  growthHint: {
    color: themeColors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  // 健康建议与洞察 (Health Insights) 相关样式
  displayTopicsScroll: {
    paddingBottom: 8,
    gap: 16, 
  },
  
  topicCard: {
    width: 256, 
    backgroundColor: themeColors.card,
    borderRadius: 24, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border, 
    shadowColor: themeColors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },

  topicCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(15,23,42,0.55)', 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  topicCategoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  topicImage: {
    width: '100%',
    height: 160, 
  },

  topicTextContainer: {
    padding: 16,
  },

  topicTitle: {
    fontWeight: 'bold',
    color: '#2F3A3A',
    fontSize: 16,
    marginBottom: 4,
  },

  topicSummary: {
    fontSize: 12,
    color: '#7A8A8A',
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: themeColors.overlay, 
    justifyContent: 'center', 
    paddingHorizontal: 24 
  },

  modalContent: { 
    width: '100%', 
    backgroundColor: themeColors.card, 
    borderRadius: 24, 
    overflow: 'hidden', 
    maxHeight: '85%' 
  },

  modalImageWrap: { width: '100%', height: 180, position: 'relative' },

  modalImage: { width: '100%', height: '100%' },

  modalCloseBtn: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 8, 
    borderRadius: 24 
  },

  modalBody: { padding: 24 },

  modalTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  modalTagText: { color: themeColors.primaryDark, fontWeight: '600', fontSize: 14 },

  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2F3A3A', marginBottom: 16, lineHeight: 32 },

  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },

  modalActionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: themeColors.card, 
    paddingVertical: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: themeColors.border 
  },

  modalActionText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },

  nutritionIconBox: {
    backgroundColor: '#E8F5E9',
  },

  hydrationIconBox: {
    backgroundColor: '#EFF6FF',
  },

  insightEmoji: {
    fontSize: 18,
  },

  insightTitle: {
    color: themeColors.text,
    fontWeight: '800',
    marginTop: 12,
  },
  insightDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 8,
  },
  hydrationCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#EFF6FF', 
    borderColor: '#BFDBFE',
    borderWidth: 1,
    marginBottom: 14,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hydrationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hydrationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  hydrationDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hydrationDetailText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  hydrationProgressWrap: {
    marginBottom: 16,
  },
  hydrationBarBg: {
    height: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hydrationBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  hydrationText: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '600',
    textAlign: 'right',
  },
  hydrationCurrent: {
    color: '#2563EB',
    fontWeight: '800',
  },
  hydrationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addWaterBtn: {
    flex: 1,
    backgroundColor: themeColors.card,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  addWaterText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },

  newHydrationCard: {
    backgroundColor: themeColors.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  newHydrationTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newHydrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newHydrationIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newHydrationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  newHydrationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  newHydrationBadgeGood: {
    backgroundColor: '#DCFCE7',
  },
  newHydrationBadgeNeeds: {
    backgroundColor: '#FEF3C7',
  },
  newHydrationBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  newHydrationBadgeTextGood: {
    color: '#15803D',
  },
  newHydrationBadgeTextNeeds: {
    color: '#B45309',
  },
  sectionArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newHydrationProgressContainer: {
    marginTop: 4,
  },
  newHydrationProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  newHydrationProgressLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  newHydrationProgressValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  newHydrationBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  newHydrationBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  localSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    marginTop: 12,
  },

  // 健康建议读取空状态兜底 UI 样式
  emptyInsightBox: {
    backgroundColor: themeColors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    marginTop: 8,
    marginBottom: 16,
  },
  emptyInsightText: {
    color: themeColors.muted,
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: themeColors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  retryBtnText: {
    color: themeColors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
});
