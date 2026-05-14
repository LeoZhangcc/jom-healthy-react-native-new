import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Modal, ScrollView, Pressable, 
  TouchableOpacity, Dimensions, TouchableWithoutFeedback, ActivityIndicator, Linking, Animated, Easing, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivity } from '../context/PhysicalActivityContext'; 
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext'; 

const { width } = Dimensions.get('window');

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  'MODERATE_AEROBIC': { label: 'Moderate', icon: '🚶‍♂️' },
  'VIGOROUS_AEROBIC': { label: 'Vigorous', icon: '🏃‍♂️' },
  'MUSCLE_STRENGTHENING': { label: 'Strength', icon: '💪' },
  'BONE_STRENGTHENING': { label: 'Bone Health', icon: '🦒' },
};

const ScrollingText = ({ text, style }: { text: string; style: any }) => {
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    if (textWidth > 0 && containerWidth > 0) {
      const duration = textWidth * 25; 
      const startAnimation = () => {
        scrollX.setValue(0); 
        Animated.timing(scrollX, {
          toValue: -textWidth, 
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            startAnimation(); 
          }
        });
      };
      startAnimation();
      return () => scrollX.stopAnimation();
    }
  }, [textWidth, containerWidth, text]);

  return (
    <View style={styles.scrollingContainer} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <Text
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setTextWidth(w);
        }}
        style={[style, { position: 'absolute', opacity: 0, left: -10000 }]}
        numberOfLines={1}
      >
        {text}      
      </Text>
      <Animated.View style={{ flexDirection: 'row', width: textWidth * 2 + 100, transform: [{ translateX: scrollX }] }}>
        <Text style={style} numberOfLines={1}>{text}      </Text>
        <Text style={style} numberOfLines={1}>{text}      </Text>
      </Animated.View>
    </View>
  );
};

const PhysicalActivityScreen = ({ navigation }: any) => {
  const { todayTotal, dailyGoal, logMinutes, updateGoal, todayCalories } = useActivity() as any; 
  const { activeChild } = useChildProfile();
  const { t, language } = useLanguage(); 

  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  CATEGORY_META['MODERATE_AEROBIC'].label = getText('Moderate', '中等有氧', 'Aerobik Sederhana');
  CATEGORY_META['VIGOROUS_AEROBIC'].label = getText('Vigorous', '高强有氧', 'Aerobik Kuat');
  CATEGORY_META['MUSCLE_STRENGTHENING'].label = getText('Strength', '肌肉强化', 'Kekuatan Otot');
  CATEGORY_META['BONE_STRENGTHENING'].label = getText('Bone Health', '骨骼强化', 'Kesihatan Tulang');

  const [minutesToLog, setMinutesToLog] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeRecommendation, setActiveRecommendation] = useState({ title: '', mins: 20, metValue: 0 });
  const [popupMins, setPopupMins] = useState(20);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [localCalories, setLocalCalories] = useState(0);
  const displayCalories = todayCalories ?? localCalories;

  // 💡 新增：追踪具体哪些运动被记录了 (存储其 title)
  const [loggedActivities, setLoggedActivities] = useState<Set<string>>(new Set());

  const getBmiAdvice = (status: string) => {
    switch (status.toUpperCase()) {
      case 'UNDERWEIGHT':
        return getText(
          'Focus on strength & moderate aerobic to build healthy muscle while avoiding excessive calorie loss.',
          '侧重于力量强化与中等有氧。旨在帮助孩子健康增肌，同时避免热量过度消耗。',
          'Tumpukan pada kekuatan & aerobik sederhana untuk membina otot tanpa kehilangan kalori berlebihan.'
        );
      case 'OVERWEIGHT':
      case 'OBESE':
        return getText(
          'Focus on moderate aerobic for gentle fat burning. High-intensity jumping is restricted to protect knee joints.',
          '以中等有氧为主，温和燃脂。系统已屏蔽高强度跑跳，以保护孩子的膝关节。',
          'Tumpukan pada aerobik sederhana. Lompatan intensiti tinggi dihadkan untuk melindungi sendi lutut.'
        );
      case 'NORMAL':
      default:
        return getText(
          'Great stage! We recommend a mix of aerobic and bone-strengthening exercises.',
          '处于最佳成长阶段！建议交替进行有氧和骨骼强化训练，全面促进发育。',
          'Tahap yang hebat! Kami mengesyorkan campuran senaman aerobik dan pengukuhan tulang.'
        );
    }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const status = activeChild?.status || 'NORMAL';
        const url = `https://jom-healthy-java.onrender.com/api/activity/recommend?status=${status}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data);
          if (data && data.length > 0) setSelectedCategory(data[0].categoryKey);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecommendations();
  }, [activeChild?.status]);

  const availableCategories = Array.from(new Set(recommendations.map(item => item.categoryKey)));
  const activeActivities = recommendations.filter(item => item.categoryKey === selectedCategory);

  const childWeight = activeChild?.weight || 20;

  const averageMetValue = useMemo(() => {
    if (recommendations.length === 0) return 4.0; 
    const sum = recommendations.reduce((acc, curr) => acc + (curr.metValue || 4.0), 0);
    return sum / recommendations.length;
  }, [recommendations]);

  const calculateBurnedCals = (mins: number, met: number) => {
    return Math.round(met * childWeight * (mins / 60));
  };

  const handleGeneralLogSubmit = () => {
    const burned = calculateBurnedCals(minutesToLog, averageMetValue);
    logMinutes(minutesToLog); 
    setLocalCalories(prev => prev + burned); 
  };

  const openLogPopup = (title: string, defaultMins: number, metValue: number) => {
    setActiveRecommendation({ title, mins: defaultMins, metValue: metValue || 4.0 });
    setPopupMins(defaultMins);
    setModalVisible(true);
  };

  const handlePopupSubmit = () => {
    const burned = calculateBurnedCals(popupMins, activeRecommendation.metValue);
    logMinutes(popupMins); 
    setLocalCalories(prev => prev + burned); 
    // 💡 记录该运动项
    setLoggedActivities(prev => new Set(prev).add(activeRecommendation.title));
    setModalVisible(false);
  };

  // 💡 一键清空逻辑
  const handleClearAll = () => {
    Alert.alert(
      t('clearConfirmTitle') || 'Clear Records',
      t('clearConfirmMsg') || "Are you sure you want to clear today's activity records?",
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('clearAll') || 'Clear All', 
          style: 'destructive', 
          onPress: () => {
            if (todayTotal > 0) logMinutes(-todayTotal); // 巧妙清零时间
            setLocalCalories(0); // 清零卡路里
            setLoggedActivities(new Set()); // 清除卡片上的已记录标志
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('logActivity') || 'Log Activity'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* 1. Log Activity Card */}
        <View style={styles.inlineLogContainer}>
           <View style={styles.logBox}>
              <Text style={styles.logQuestion}>
                {getText(
                  `How many minutes did ${activeChild?.nickname || 'Child'} play today?`,
                  `${activeChild?.nickname || '孩子'} 今天活动了多少分钟？`,
                  `Berapa minit ${activeChild?.nickname || 'Anak'} bermain hari ini?`
                )}
              </Text>

              <Text style={styles.logDisclaimer}>
                💡 {t('generalLogDisclaimer') || 'Uses average MET for calorie estimation. For better accuracy, log specific activities below.'}
              </Text>

              
              <View style={styles.counterRow}>
                <TouchableOpacity onPress={() => setMinutesToLog(Math.max(0, minutesToLog - 1))} style={styles.roundBtn}>
                  <Ionicons name="remove" size={28} color="#69B679" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', minWidth: 100 }}>
                  <Text style={styles.bigNumber}>{minutesToLog}</Text>
                  <Text style={styles.minsLabel}>{t('minutes') || 'minutes'}</Text>
                </View>
                <TouchableOpacity onPress={() => setMinutesToLog(minutesToLog + 1)} style={styles.roundBtn}>
                  <Ionicons name="add" size={28} color="#69B679" />
                </TouchableOpacity>
              </View>

              <View style={styles.quickSelectRow}>
                {[5, 10, 15].map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.quickBtn, minutesToLog === m && styles.quickBtnActive]}
                    onPress={() => setMinutesToLog(m)}
                  >
                    {/* 💡 修复：添加 min 多语言 */}
                    <Text style={[styles.quickText, minutesToLog === m && styles.quickTextActive]}>
                      {m} {t('min') || 'min'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.mainLogBtn} onPress={handleGeneralLogSubmit}>
                <Text style={styles.mainLogBtnText}>{t('logActivity') || 'Log Activity'}</Text>
              </TouchableOpacity>
            </View>
        </View>

        <Text style={styles.sectionTitle}>
          💡 {getText('Recommended for ', '专属推荐：', 'Disyorkan untuk ')}{activeChild?.nickname || 'Child'}
        </Text>
        
        <View style={styles.adviceBanner}>
          <View style={styles.adviceHeader}>
            <Ionicons name="information-circle" size={18} color="#0284C7" />
            <Text style={styles.adviceTag}>{t('systemAdvice') || 'System Advice:'}</Text>
          </View>
          <ScrollingText text={getBmiAdvice(activeChild?.status || 'NORMAL')} style={styles.adviceText} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#69B679" style={{ marginVertical: 30 }} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent} style={styles.categoryScroll}>
              {availableCategories.map((catKey) => {
                const meta = CATEGORY_META[catKey] || { label: catKey, icon: '🏅' };
                return (
                  <Pressable 
                    key={catKey}
                    onPress={() => setSelectedCategory(catKey)}
                    style={[styles.categoryBtn, selectedCategory === catKey && styles.categoryBtnActive]}
                  >
                    <Text style={styles.categoryIcon}>{meta.icon}</Text>
                    <Text style={[styles.categoryLabel, selectedCategory === catKey && styles.categoryLabelActive]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 3. Recommendation Cards */}
            {activeActivities.map((activity) => {
              const title = language === 'zh' ? activity.nameCn : language === 'ms' ? activity.nameMs : activity.nameEn;
              const desc = language === 'zh' ? activity.descCn : language === 'ms' ? activity.descMs : activity.descEn;

              return (
                <ActivityRecommendationCard 
                  key={activity.activityKey}
                  title={title}
                  desc={desc}
                  tag="15-20 mins" 
                  subtext={t('sysRecommended') || "System Recommended"}
                  videoUrl={activity.videoUrl}
                  imageUrl={activity.imageUrl} 
                  t={t} 
                  isLogged={loggedActivities.has(title)} // 💡 传入是否已记录状态
                  onLog={() => openLogPopup(title, 20, activity.metValue)}
                />
              )
            })}
          </>
        )}

        {/* 4. Synced Summary Card with Calories! */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              {/* 💡 修复：在这里加了垃圾桶清空按钮 */}
              <View style={styles.summaryLabelRow}>
                <Text style={styles.summaryLabel}>{t('todaysTotal') || "Today's Total"}</Text>
                {todayTotal > 0 && (
                  <TouchableOpacity onPress={handleClearAll} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.summaryValue}>
                {todayTotal} <Text style={styles.unitText}>{t('minutes') || 'mins'}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.goalHeader}>
                 <Text style={styles.summaryLabel}>{t('dailyGoal') || 'Daily Goal'}</Text>
                 <Pressable style={styles.editIcon} onPress={() => {
                    setTempGoal(dailyGoal);
                    setGoalModalVisible(true);
                  }}>
                    <Ionicons name="pencil" size={14} color="#69B679" />
                </Pressable>
              </View>
              <Text style={styles.summaryValue}>
                {dailyGoal} <Text style={styles.unitText}>{t('minutes') || 'mins'}</Text>
              </Text>
            </View>
          </View>
          
          <View style={styles.progressBarBg}>
             <View style={[styles.progressBarFill, { width: `${Math.min((todayTotal / dailyGoal) * 100, 100)}%` }]} />
          </View>

          {/* 卡路里显示框 */}
          <View style={styles.divider} />
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <View>
              <Text style={styles.summaryLabel}>{t('caloriesBurned') || 'Calories Burned'}</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                {displayCalories} <Text style={styles.unitText}>{t('kcal') || 'kcal'}</Text>
              </Text>
            </View>
            <View style={styles.calIconBox}>
               <Ionicons name="flame" size={24} color="#F59E0B" />
            </View>
          </View>

        </View>
      </ScrollView>

      {/* --- QUICK ADJUST MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalBackgroundClick} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.popupIconCircle}><Text style={{ fontSize: 32 }}>🎯</Text></View>
            <Text style={styles.popupTitle}>{activeRecommendation.title}</Text>
            <Text style={styles.popupSubtitle}>
              {getText('How long did they play?', '他/她玩了多久？', 'Berapa lama mereka bermain?')}
            </Text>

            <View style={styles.popupCounterRow}>
              <TouchableOpacity style={styles.popupSmallBtn} onPress={() => setPopupMins(Math.max(1, popupMins - 1))}>
                <Ionicons name="remove" size={24} color="#69B679" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', marginHorizontal: 20 }}>
                <Text style={styles.popupBigNumber}>{popupMins}</Text>
                <Text style={styles.popupMinsLabel}>{t('minutes') || 'minutes'}</Text>
              </View>
              <TouchableOpacity style={styles.popupSmallBtn} onPress={() => setPopupMins(popupMins + 1)}>
                <Ionicons name="add" size={24} color="#69B679" />
              </TouchableOpacity>
            </View>
            <Text style={styles.popupInstruction}>{getText('Tap +/- to adjust duration', '点击 +/- 调整时长', 'Ketik +/- untuk melaras tempoh')}</Text>

            <View style={styles.popupActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>{t('cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogBtn} onPress={handlePopupSubmit}>
                    <Text style={styles.confirmLogText}>{t('logIt') || 'Log It'}</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- GOAL MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={goalModalVisible} onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.goalModalContent}>
            <Text style={styles.popupTitle}>{t('customizeDailyGoal') || 'Customize Daily Goal'}</Text>
            
            {/* 💡 修复：规范的三语翻译长句 */}
            <Text style={styles.popupSubtitle}>
              {getText(
                `Set a realistic daily target for ${activeChild?.nickname}.`, 
                `为 ${activeChild?.nickname} 设定一个切合实际的每日目标。`, 
                `Tetapkan sasaran harian yang realistik untuk ${activeChild?.nickname}.`
              )}
            </Text>

            <View style={styles.goalSetterRow}>
              <TouchableOpacity style={styles.goalAdjBtn} onPress={() => setTempGoal(Math.max(5, tempGoal - 5))}>
                <Ionicons name="remove" size={32} color="#69B679" />
              </TouchableOpacity>
              <View style={styles.goalDisplayBox}>
                <Text style={styles.goalBigNum}>{tempGoal}</Text>
                {/* 💡 修复：/ day 三语补充 */}
                <Text style={styles.goalUnitText}>{t('minutes') || 'mins'} {t('perDay') || '/ day'}</Text>
              </View>
              <TouchableOpacity style={styles.goalAdjBtn} onPress={() => setTempGoal(tempGoal + 5)}>
                <Ionicons name="add" size={32} color="#69B679" />
              </TouchableOpacity>
            </View>
            <Text style={styles.popupInstruction}>{getText('Tap +/- to adjust in 5-min intervals', '点击 +/- 进行 5 分钟微调', 'Ketik +/- untuk melaras setiap 5 minit')}</Text>

            <View style={styles.recommendationTag}>
              <Text style={styles.recommendationText}>
                💡 {getText('Recommended: 60 - 90 mins / day', '建议：每天 60-90 分钟', 'Disyorkan: 60-90 minit / hari')}
              </Text>
            </View>

            <View style={styles.popupActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLogBtn} onPress={() => { updateGoal(tempGoal); setGoalModalVisible(false); }}>
                <Text style={styles.confirmLogText}>{t('setGoal') || 'Set Goal'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ActivityRecommendationCard = ({ title, desc, tag, subtext, onLog, videoUrl, imageUrl, t, isLogged }: any) => (
  <View style={styles.recCard}>
    <View style={styles.recHeader}>
      
      {/* 图片与已记录标签区域 */}
      <View style={styles.recImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.recImage} resizeMode="cover" />
        ) : (
          <View style={styles.recIconCircle}><Text style={{ fontSize: 24 }}>🏃</Text></View>
        )}
        {/* 💡 新增：绿色的 Logged 遮罩 */}
        {isLogged && (
          <View style={styles.loggedBadge}>
            <Text style={styles.loggedBadgeText}>{t('logged') || 'Logged'}</Text>
          </View>
        )}
      </View>
      
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.recTitleRow}>
          <Text style={styles.recTitle}>{title}</Text>
          <View style={styles.timeTag}><Text style={styles.timeTagText}>{tag}</Text></View>
        </View>
        <Text style={styles.recDesc}>{desc}</Text>
        <Text style={styles.recGreenSub}>✓ {subtext}</Text>
      </View>
    </View>

    <View style={styles.recButtonRow}>
      <TouchableOpacity style={styles.watchBtn} onPress={() => videoUrl && Linking.openURL(videoUrl)}>
        <Ionicons name="play" size={16} color="#475569" style={{ marginRight: 6 }} />
        <Text style={styles.watchBtnText}>{t('watchVideo') || 'Watch Video'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tapLogBtnLarge} onPress={onLog}>
        <Text style={styles.tapLogTextLarge}>{t('tapToLog') || 'Tap to Log'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, backgroundColor: '#FFF' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  inlineLogContainer: { padding: 20 },
  logBox: { backgroundColor: '#ECF9F1', padding: 24, borderRadius: 35, borderWidth: 1, borderColor: '#DCFCE7' },
  logQuestion: { textAlign: 'center', fontSize: 16, color: '#334155', fontWeight: '700', marginBottom: 20 },
  counterRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 25, marginBottom: 25 },
  roundBtn: { width: 55, height: 55, backgroundColor: '#FFF', borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  bigNumber: { fontSize: 56, fontWeight: '800', color: '#69B679' },
  minsLabel: { color: '#64748B', marginTop: -5, fontWeight: '600' },
  quickSelectRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 25 },
  quickBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#69B67930' },
  quickBtnActive: { backgroundColor: '#69B679', borderColor: '#69B679' },
  quickText: { color: '#69B679', fontWeight: '600' },
  quickTextActive: { color: '#FFF' },
  mainLogBtn: { backgroundColor: '#69B679', padding: 18, borderRadius: 25, alignItems: 'center' },
  mainLogBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginLeft: 20, marginBottom: 12, color: '#334155' },
  adviceBanner: { backgroundColor: '#F0F9FF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E0F2FE', height: 50, flexDirection: 'row', alignItems: 'center' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', marginRight: 8, borderRightWidth: 1, borderRightColor: '#BAE6FD', paddingRight: 8, zIndex: 10, backgroundColor: '#F0F9FF' },
  adviceTag: { fontSize: 12, fontWeight: 'bold', color: '#0369A1', marginLeft: 4 },
  scrollingContainer: { flex: 1, height: '100%', overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  adviceText: { fontSize: 13, color: '#0369A1', fontWeight: '500', textAlignVertical: 'center' },
  categoryScroll: { marginBottom: 20 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 10 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, backgroundColor: '#F1F5F9' },
  categoryBtnActive: { backgroundColor: '#69B679' },
  categoryIcon: { marginRight: 8, fontSize: 16 },
  categoryLabel: { fontWeight: '600', color: '#475569' },
  categoryLabelActive: { color: '#FFF' },
  recCard: { marginHorizontal: 20, marginBottom: 16, padding: 20, backgroundColor: '#FFF', borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recHeader: { flexDirection: 'row', marginBottom: 18 },
  
  // 修改：确保容器能装下底部绝对定位的 badge
  recImageContainer: { width: 60, height: 60, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  recImage: { width: '100%', height: '100%' },
  recIconCircle: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4' },
  loggedBadge: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.9)', paddingVertical: 3, alignItems: 'center' },
  loggedBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  recTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  timeTag: { backgroundColor: '#ECF9F1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  timeTagText: { color: '#69B679', fontSize: 13, fontWeight: '700' },
  recDesc: { color: '#64748B', fontSize: 14, marginTop: 4, lineHeight: 20 },
  recGreenSub: { color: '#69B679', fontSize: 13, fontWeight: '600', marginTop: 10 },
  recButtonRow: { flexDirection: 'row', gap: 12 },
  watchBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  watchBtnText: { color: '#475569', fontWeight: '700', fontSize: 15 },
  tapLogBtnLarge: { flex: 1, backgroundColor: '#73BC7D', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tapLogTextLarge: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  
  // Summary Card
  summaryCard: { margin: 20, padding: 24, borderRadius: 24, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }, // 新增的带垃圾桶的标题行
  trashBtn: { padding: 4, backgroundColor: '#FEE2E2', borderRadius: 8 }, // 垃圾桶按钮样式
  summaryLabel: { color: '#64748B', fontSize: 14 },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  unitText: { fontSize: 14, color: '#94A3B8', fontWeight: '400' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  editIcon: { backgroundColor: '#F0FDF4', padding: 4, borderRadius: 10 },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#69B679' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  calIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackgroundClick: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 40, padding: 30, alignItems: 'center' },
  popupIconCircle: { width: 80, height: 80, backgroundColor: '#F0FDF4', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  popupTitle: { fontSize: 24, fontWeight: '800', color: '#000', marginBottom: 5, textAlign: 'center' },
  popupSubtitle: { fontSize: 16, color: '#64748B', marginBottom: 30 },
  popupCounterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  popupSmallBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  popupBigNumber: { fontSize: 64, fontWeight: '800', color: '#69B679' },
  popupMinsLabel: { fontSize: 16, fontWeight: '600', color: '#334155', marginTop: -10 },
  popupInstruction: { color: '#94A3B8', fontSize: 14, marginBottom: 30 },
  popupActionRow: { flexDirection: 'row', gap: 15, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 18, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 16 },
  confirmLogBtn: { flex: 1, paddingVertical: 18, borderRadius: 20, backgroundColor: '#73BC7D', alignItems: 'center' },
  confirmLogText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  goalModalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 45, padding: 35, alignItems: 'center' },
  goalSetterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20, gap: 15 },
  goalAdjBtn: { width: 65, height: 65, borderRadius: 33, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  goalDisplayBox: { width: 140, height: 140, backgroundColor: '#F0FDF4', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  goalBigNum: { fontSize: 72, fontWeight: '800', color: '#69B679' },
  goalUnitText: { fontSize: 16, color: '#475569', fontWeight: '600', marginTop: -10 },
  recommendationTag: { backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 30 },
  recommendationText: { color: '#D97706', fontWeight: '700', fontSize: 14 },
  logDisclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8', // 比较柔和的灰色
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
});

export default PhysicalActivityScreen;