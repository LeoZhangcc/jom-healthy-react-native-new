import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Modal, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useChildProfile } from '../context/ChildProfileContext';
import { Screen, Header } from '../components/Common';
import { useLanguage } from '../context/LanguageContext';


const categoryConfig: Record<string, { emoji: string; color: string }> = {
  'Water': { emoji: '💧', color: '#3B82F6' },
  'Milk': { emoji: '🥛', color: '#F59E0B' },
  'Juice': { emoji: '🧃', color: '#10B981' },
  'Soft Drink': { emoji: '🥤', color: '#EF4444' },
  'Coffee & Tea': { emoji: '☕', color: '#8B5CF6' },
  'Alcohol': { emoji: '🍷', color: '#EC4899' },
  'Other': { emoji: '🍹', color: '#6B7280' }
};

// This function acts like a brain, reading the English drink name and assigning it a category
const getDrinkCategory = (name: string) => {
  if (!name) return 'Water';
  const lower = name.toLowerCase();
  
  if (['water', 'air', '水'].includes(lower)) return 'Water';
  if (lower.includes('milk') || lower.includes('whey') || lower.includes('soy')) return 'Milk';
  if (lower.includes('soda') || lower.includes('cola') || lower.includes('root beer') || lower.includes('carbonated')) return 'Soft Drink';
  if (lower.includes('juice') || lower.includes('lemonade') || lower.includes('punch') || lower.includes('fruit')) return 'Juice';
  if (lower.includes('coffee') || lower.includes('tea')) return 'Coffee & Tea';
  if (lower.includes('beer') || lower.includes('wine') || lower.includes('liquor') || lower.includes('whiskey') || lower.includes('alcoholic')) return 'Alcohol';
  
  return 'Other';
};

export default function HydrationScreen({ navigation }: any) {
  const { t , language} = useLanguage();

  const unitText = language === 'zh' ? '毫升' : 'mL';

  const getDrinkName = (drink: any) => {
    if (language === 'zh' && drink.title_zh) return drink.title_zh;
    if (language === 'ms' && drink.title_ms) return drink.title_ms;
    return drink.title; // Default to English
  };

  const { activeChild, todayWaterIntake, dailyWaterGoal, addWater, hydrationHistory } = useChildProfile();

  const drinkOptions = useMemo(() => [
    { id: 'Water', emoji: '💧', title: t('water') || 'Water', amountValue: 200 },
    { id: 'Milk', emoji: '🥛', title: t('milk') || 'Milk', amountValue: 250 },
    { id: 'Juice', emoji: '🧃', title: t('juice') || 'Juice', amountValue: 150 },
    { id: 'Soft Drink', emoji: '🥤', title: t('softDrink') || 'Soft Drink', amountValue: 250 },
    { id: 'Coffee & Tea', emoji: '☕', title: t('coffeeTea') || 'Coffee & Tea', amountValue: 250 },
    { id: 'Alcohol', emoji: '🍷', title: t('alcohol') || 'Alcohol', amountValue: 150 },
  ], [t, language]); // added language dependency so it refreshes when language changes

  const [amount, setAmount] = useState(200);
  const [customAmount, setCustomAmount] = useState('200');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<any>(null);
  const [customDrinkName, setCustomDrinkName] = useState('');
  const [expandedHistoryDate, setExpandedHistoryDate] = useState<string | null>(null);
  
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [pendingDrink, setPendingDrink] = useState<any>(null);
  const [inputAmount, setInputAmount] = useState('250');

  const [selectedDrinkType, setSelectedDrinkType] = useState<{ id?: string, emoji: string; title: string; type: 'healthy' | 'unhealthy' }>({
    id: 'Water', emoji: '💧', title: t('water'), type: 'healthy',
  });

  const normalizeDrinkType = (type: string) => {
    if (!type) return 'Water';
    const lower = type.toLowerCase();
    if (['water', 'air', '水'].includes(lower)) return 'Water';
    if (['milk', 'susu', '牛奶'].includes(lower)) return 'Milk';
    if (['fresh juice', 'jus segar', '鲜榨果汁'].includes(lower)) return 'Fresh Juice';
    if (['packaged juice', 'jus kotak', '包装果汁'].includes(lower)) return 'Packaged Juice';
    if (['other', 'lain-lain', '其他'].includes(lower)) return 'Other';
    return type; // Leave custom/searched drinks exactly as they are
  };

  // Group history by date for the accordion and breakdown
  const { groupedHistory, todaysDrinks } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const grouped: Record<string, { date: string; total: number; drinks: any[] }> = {};
    let todayDrinksArr: any[] = [];

    hydrationHistory.forEach((record) => {
      const dateStr = new Date(record.timestamp).toISOString().split('T')[0];
      if (!grouped[dateStr]) grouped[dateStr] = { date: dateStr, total: 0, drinks: [] };
      grouped[dateStr].total += record.amount;
      grouped[dateStr].drinks.push(record);
      if (dateStr === todayStr) todayDrinksArr.push(record);
    });

    const sortedArray = Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { groupedHistory: sortedArray, todaysDrinks: todayDrinksArr };
  }, [hydrationHistory]);

  const handleLog = () => {
    const finalAmount = parseInt(customAmount) || amount;
    // Always save the English ID (e.g. "Water") to the database!
    const drinkId = selectedDrinkType.id || selectedDrinkType.title;
    const drinkName = drinkId === 'Other' ? (customDrinkName || 'Other') : drinkId;
    addWater(finalAmount, drinkName);
    setCustomAmount('200');
    setCustomDrinkName('');
  };

  const handleQuickAdd = (ml: number) => {
    setAmount(ml);
    setCustomAmount(String(ml));
  };

  const handleIncrement = () => {
    const current = parseInt(customAmount) || 0;
    setCustomAmount((current + 50).toString());
  };

  const handleDecrement = () => {
    const current = parseInt(customAmount) || 0;
    if (current > 50) {
      setCustomAmount((current - 50).toString());
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 1000) setAmount(numValue);
  };

  const handleDrinkCardClick = (drink: any) => {
    setPendingDrink(drink);
    setInputAmount(String(drink.amountValue));
    setShowAmountInput(true);
  };

  const handleConfirmAmount = () => {
    if (pendingDrink) {
      const finalAmount = parseInt(inputAmount) || pendingDrink.amountValue;
      // Use the hidden English ID, otherwise fallback to the title
      addWater(finalAmount, pendingDrink.id || pendingDrink.title); 
      setShowAmountInput(false);
      setPendingDrink(null);
      handleBackFromAnalysis();
    }
  };

  useEffect(() => {
    // If the search bar is empty, clear the results and do nothing
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Search timer
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const API_URL = `https://jom-healthy-java-drink.onrender.com/api/drinks/search?q=${searchQuery}`;
        const response = await fetch(API_URL);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Failed to fetch drinks:", error);
      } finally {
        setIsSearching(false);
      }
    }, 0); // enter time delay

    // Cleanup function: If the user types another letter before 500ms is up, cancel the previous timer!
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]); // This tells React to run this effect every time searchQuery changes

  const handleBackFromAnalysis = () => {
    setShowAnalysis(false);
    setSelectedDrink(null);
    setSearchQuery('');
  };

  const needsMoreWater = todayWaterIntake < dailyWaterGoal;
  const progressPercent = Math.min((todayWaterIntake / dailyWaterGoal) * 100, 100);
  const isWellHydrated = todayWaterIntake >= dailyWaterGoal;

  // Calculate drink breakdown for donut chart
  // Calculate drink breakdown for donut chart
  const drinkBreakdown = useMemo(() => {
    const breakdown: Record<string, { amount: number; emoji: string; color: string }> = {};
    
    todaysDrinks.forEach((drink) => {
      // 1. Run the saved drink name through the smart sorter!
      const category = getDrinkCategory(drink.drinkType);
      
      // 2. Add it to that category's total
      if (!breakdown[category]) {
        breakdown[category] = { 
          amount: 0, 
          emoji: categoryConfig[category].emoji, 
          color: categoryConfig[category].color 
        };
      }
      breakdown[category].amount += drink.amount;
    });

    let cumulativePercent = 0;
    return Object.entries(breakdown).map(([name, data]) => {
      const percentage = todayWaterIntake > 0 ? (data.amount / todayWaterIntake) * 100 : 0;
      const startPercent = cumulativePercent;
      cumulativePercent += percentage;
      return { 
        name, // The Category Name (e.g. "Soft Drink")
        value: data.amount, 
        emoji: data.emoji, 
        color: data.color, 
        percentage: Math.round(percentage), 
        startPercent 
      };
    });
  }, [todaysDrinks, todayWaterIntake]);

  // Donut Chart Math
  const chartRadius = 45;
  const chartStrokeWidth = 18;
  const chartCircumference = 2 * Math.PI * chartRadius;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Header title={t('logHydration')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery} // This instantly updates the state, which triggers the useEffect!
            placeholder={t('searchDrinks')}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
        </View>
        
        {searchResults.length > 0 && !showAnalysis && (
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 8, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' }}>
            {searchResults.map((drink, index) => (
              <Pressable 
                key={drink.id || index}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: index === searchResults.length - 1 ? 0 : 1, borderBottomColor: '#F3F4F6' }}
                onPress={() => {
                  Keyboard.dismiss();
                  // Set the selected database drink and open Analysis!
                  setSelectedDrink({
                    id: drink.title,
                    emoji: drink.emoji,
                    title: getDrinkName(drink), 
                    type: drink.type,
                    sugar: drink.sugar,
                    energy: drink.energy,
                    carbs: drink.carbs,
                    protein: drink.protein,
                    amountValue: drink.amountValue
                  });
                  setSearchResults([]); // Hide list
                  setSearchQuery(''); // Clear text
                  setShowAnalysis(true); // Open analysis view
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{drink.emoji}</Text>
                
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937' }}>{getDrinkName(drink)}</Text>
                
              </Pressable>
            ))}
          </View>
        )}

        
            {/* Hydration Progress Section */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressCurrentText}>{todayWaterIntake}<Text style={styles.progressUnitText}>{unitText}</Text></Text>
                  <Text style={styles.progressGoalText}>{t('of')} {dailyWaterGoal}{unitText} {t('dailyGoal')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.progressPercentText}>{Math.round(progressPercent)}%</Text>
                  <Text style={styles.progressGoalText}>{t('completed')}</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.progressFooter}>
                <View style={[styles.statusBadge, isWellHydrated ? styles.statusBadgeGood : styles.statusBadgeNeeds]}>
                  <Text style={styles.statusBadgeText}>{isWellHydrated ? t('wellHydrated') : t('needsMoreWater')}</Text>
                </View>
                <Text style={styles.remainingText}>{isWellHydrated ? t('goalAchieved') : `${dailyWaterGoal - todayWaterIntake}${unitText} ${t('remaining')}`}</Text>
              </View>
            </View>

            {/* Drink Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('selectDrinkType')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {[...drinkOptions, { id: 'Other', emoji: '🍹', title: t('other') || 'Other' }].map((drink) => {
                  const isSelected = selectedDrinkType.id === drink.id;
                  return (
                    <Pressable
                      key={drink.id}
                      onPress={() => setSelectedDrinkType(drink as any)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                    >
                      <Text style={styles.chipEmoji}>{drink.emoji}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{drink.title}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {selectedDrinkType.title === 'Other' && (
                <TextInput
                  style={styles.customDrinkInput}
                  value={customDrinkName}
                  onChangeText={setCustomDrinkName}
                  placeholder="Enter drink name (e.g., Soda, Tea)"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>

            {/* Amount Picker */}
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>
                {(() => {
                  const activeTitle = drinkOptions.find(d => d.id === selectedDrinkType.id)?.title 
                    || (selectedDrinkType.id === 'Other' ? (t('other') || 'Other') : selectedDrinkType.title);
                  if (language === 'ms') return `Berapa banyak ${activeTitle} yang diminum oleh ${activeChild?.nickname || 'anak anda'}?`;
                  if (language === 'zh') return `${activeChild?.nickname || '您的孩子'}喝了多少${activeTitle}？`;
                  return `How much ${activeTitle} did ${activeChild?.nickname || 'your child'} drink?`;
                })()}
              </Text>
              
              <View style={styles.stepperContainer}>
                <Pressable 
                  onPress={handleDecrement} 
                  style={({pressed}) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                >
                  <Ionicons name="remove" size={28} color="#6B7280" />
                </Pressable>

                <View style={styles.amountInputWrap}>
                  <Text style={styles.stepperValue}>{customAmount}</Text>
                  <Text style={styles.stepperUnit}>{unitText}</Text>
                </View>

                <Pressable 
                  onPress={handleIncrement} 
                  style={({pressed}) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                >
                  <Ionicons name="add" size={28} color="#3B82F6" />
                </Pressable>
              </View>

              <View style={styles.quickAddRow}>
                {[100, 200, 250].map((val) => (
                  <Pressable key={val} onPress={() => handleQuickAdd(val)} style={[styles.quickAddBtn, amount === val && styles.quickAddBtnActive]}>
                    <Text style={[styles.quickAddText, amount === val && styles.quickAddTextActive]}>{val} {unitText}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={handleLog} style={({ pressed }) => [styles.logBtn, pressed && styles.btnPressed]}>
                <Text style={styles.logBtnText}>
                  {t('log')} {drinkOptions.find(d => d.id === selectedDrinkType.id)?.title || (selectedDrinkType.id === 'Other' ? (t('other') || 'Other') : selectedDrinkType.title)}
                </Text>
              </Pressable>
            </View>

            {/* Drink Breakdown SVG Chart */}
            {drinkBreakdown.length > 0 && (
              <View style={styles.breakdownCard}>
                <Text style={styles.sectionTitle}>{t('todayDrinkBreakdown')}</Text>
                <View style={styles.breakdownRow}>
                  <View style={styles.chartContainer}>
                    <Svg width="120" height="120" viewBox="0 0 120 120">
                      <G rotation="-90" origin="60, 60">
                        {drinkBreakdown.map((slice, index) => {
                          const strokeDasharray = `${(slice.percentage / 100) * chartCircumference} ${chartCircumference}`;
                          const strokeDashoffset = -((slice.startPercent / 100) * chartCircumference);
                          return (
                            <Circle
                              key={index}
                              cx="60"
                              cy="60"
                              r={chartRadius}
                              stroke={slice.color}
                              strokeWidth={chartStrokeWidth}
                              fill="transparent"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap={drinkBreakdown.length === 1 ? "round" : "butt"}
                            />
                          );
                        })}
                      </G>
                    </Svg>
                  </View>
                  
                  <View style={styles.legendContainer}>
                    {drinkBreakdown.map((drink, index) => {
                      // Translate the category names for the chart legend
                      let translatedName = drink.name;
                      if (language === 'ms') {
                        if (drink.name === 'Water') translatedName = 'Air';
                        if (drink.name === 'Milk') translatedName = 'Susu';
                        if (drink.name === 'Juice') translatedName = 'Jus';
                        if (drink.name === 'Soft Drink') translatedName = 'Minuman Ringan';
                        if (drink.name === 'Coffee & Tea') translatedName = 'Kopi & Teh';
                        if (drink.name === 'Alcohol') translatedName = 'Alkohol';
                        if (drink.name === 'Other') translatedName = 'Lain-lain';
                      } else if (language === 'zh') {
                        if (drink.name === 'Water') translatedName = '水';
                        if (drink.name === 'Milk') translatedName = '牛奶';
                        if (drink.name === 'Juice') translatedName = '果汁';
                        if (drink.name === 'Soft Drink') translatedName = '汽水';
                        if (drink.name === 'Coffee & Tea') translatedName = '咖啡和茶';
                        if (drink.name === 'Alcohol') translatedName = '酒精';
                        if (drink.name === 'Other') translatedName = '其他';
                      }

                      return (
                        <View key={index} style={styles.legendItem}>
                          <View style={styles.legendLeft}>
                            <View style={[styles.legendColor, { backgroundColor: drink.color }]} />
                            <Text style={styles.legendName}>{drink.emoji} {translatedName}</Text>
                          </View>
                          <View style={styles.legendRight}>
                            <Text style={styles.legendPercent}>{drink.percentage}%</Text>
                            <Text style={styles.legendMl}>({drink.value}{unitText})</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Hydration Tip */}
            {needsMoreWater && (
              <View style={styles.tipBox}>
                <View style={styles.tipIconBox}><Text style={{ fontSize: 20 }}>💡</Text></View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>{t('stayHydrated')}</Text>
                  <Text style={styles.tipDesc}>
                    {activeChild?.nickname} {t('needsMore')} {dailyWaterGoal - todayWaterIntake} {t('moreToReach')}
                  </Text>
                </View>
              </View>
            )}

            {/* Hydration History Accordion */}
            <View style={styles.section}>
              {/* 1. Translated Title */}
              <Text style={styles.sectionTitle}>{t('hydrationHistory')}</Text>
              
              {groupedHistory.slice(0, 5).map((record) => {
                const dateObj = new Date(record.date);
                
                // 2. Dynamic Date Translation (changes language of the month abbreviation)
                const locale = language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-MY';
                const dateStr = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
                
                const isExpanded = expandedHistoryDate === record.date;

                return (
                  <View key={record.date} style={styles.historyGroup}>
                    <Pressable onPress={() => setExpandedHistoryDate(isExpanded ? null : record.date)} style={styles.historyHeader}>
                      <Text style={styles.historyDate}>{dateStr}</Text>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyTotal}>{record.total}{unitText}</Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.historyDetails}>
                        {record.drinks.map((drink, index) => {
                          const time = new Date(drink.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <View key={index} style={styles.historyDrinkRow}>
                              <View style={styles.historyDrinkLeft}>
                                <Text style={styles.historyTime}>{time}</Text>
                                
                                {/* 3. Translated Logged Drink Names */}
                                <Text style={styles.historyDrinkName}>
                                  {(() => {
                                    const nType = normalizeDrinkType(drink.drinkType);
                                    if (nType === 'Water') return t('water');
                                    if (nType === 'Milk') return t('milk');
                                    if (nType === 'Fresh Juice') return t('freshJuice');
                                    if (nType === 'Packaged Juice') return t('packagedJuice');
                                    if (nType === 'Other') return t('other');
                                    return drink.drinkType; // Keep custom searched drink names as is
                                  })()}
                                </Text>
                                
                              </View>
                              <Text style={styles.historyDrinkAmount}>{drink.amount}{unitText}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          {/* --- DRINK ANALYSIS MODAL --- */}
          <Modal visible={showAnalysis} transparent animationType="slide" onRequestClose={handleBackFromAnalysis}>
            <View style={[styles.modalOverlay, { padding: 12 }]}>
              <View style={[styles.modalContent, { maxHeight: '85%', padding: 0, alignItems: 'stretch' }]}>
                {selectedDrink && (
                  <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                    
                    {/* Close Button (Top Right) */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Pressable onPress={handleBackFromAnalysis} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                        <Ionicons name="close-circle" size={32} color="#D1D5DB" />
                      </Pressable>
                    </View>

                    <View style={styles.analysisHeader}>
                      <View style={styles.analysisIconBox}><Text style={{ fontSize: 40 }}>{selectedDrink.emoji}</Text></View>
                      <Text style={styles.analysisTitle}>{selectedDrink.title}</Text>
                      <Text style={[styles.analysisDesc, { textAlign: 'center' }]}>{selectedDrink.description}</Text>
                    </View>

                    <View style={styles.analysisCard}>
                      <Text style={styles.cardTitle}>{t('nutritionalAnalysis') || 'Nutritional Analysis (per 100g)'}</Text>
                      
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t('energy') || 'Energy'}</Text>
                        <Text style={styles.analysisValue}>{selectedDrink.energy || 0} kcal</Text>
                      </View>

                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t('carbohydrates') || 'Carbohydrates'}</Text>
                        <Text style={styles.analysisValue}>{selectedDrink.carbs || 0}g</Text>
                      </View>

                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t('sugar') || 'Sugar'}</Text>
                        <Text style={styles.analysisValue}>{selectedDrink.sugar || 0}g</Text>
                      </View>

                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t('protein') || 'Protein'}</Text>
                        <Text style={styles.analysisValue}>{selectedDrink.protein || 0}g</Text>
                      </View>
                    </View>

                    {/* HIGH SUGAR WARNING ALERT */}
                    {selectedDrink.sugar > 8 && (
                      <View style={[styles.tipBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <View style={[styles.tipIconBox, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={{ fontSize: 20 }}>⚠️</Text>
                        </View>
                        <View style={styles.tipContent}>
                          <Text style={[styles.tipTitle, { color: '#991B1B' }]}>{t('highSugarAlert') || 'High Sugar Alert'}</Text>
                          <Text style={[styles.tipDesc, { color: '#B91C1C' }]}>
                            {t('highSugarDescPart1') || 'This drink contains'} {selectedDrink.sugar}{t('highSugarDescPart2') || 'g of sugar. Frequent consumption may exceed'} {activeChild?.nickname || 'your child'}{t('highSugarDescPart3') || "'s recommended daily limits."}
                          </Text>
                        </View>
                      </View>
                    )}

                    <Pressable onPress={() => {
                      handleDrinkCardClick(selectedDrink);
                      handleBackFromAnalysis();
                    }} style={styles.logBtn}>
                      <Text style={styles.logBtnText}>{t('addToLog') || 'Add to Log'}</Text>
                    </Pressable>

                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
          {/* --------------------------------- */}
      </ScrollView>

      {/* Pop-up Modal for Custom Analysis Amount */}
      <Modal transparent visible={showAmountInput} animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.analysisIconBox}><Text style={{ fontSize: 30 }}>{pendingDrink?.emoji}</Text></View>
                <Text style={styles.modalTitle}>{pendingDrink?.title}</Text>
                <Text style={styles.modalDesc}>
                  {t('howMuchDid') || 'How much did'} {activeChild?.nickname || 'your child'} {t('drinkQuestion') || 'drink?'}
                </Text>
              </View>

              <View style={styles.modalInputWrap}>
                <TextInput style={styles.modalInput} value={inputAmount} onChangeText={setInputAmount} keyboardType="number-pad" />
                <Text style={styles.modalUnit}>{unitText}</Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowAmountInput(false)} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>{t('cancel') || 'Cancel'}</Text>
                </Pressable>
                <Pressable onPress={handleConfirmAmount} style={styles.modalConfirmBtn}>
                  <Text style={styles.modalConfirmText}>{t('confirm') || 'Confirm'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  
  // Search
  // --- UPGRADED SEARCH BAR STYLES ---
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', // Changed to solid white
    borderRadius: 24, // Matches the Home Screen cards
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    marginBottom: 24,
    // Added Home Screen style shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3, 
  },
  searchIcon: { 
    marginRight: 12,
    color: '#6B7280'
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    color: '#1F2937',
    fontWeight: '400'
  },

  // Progress Card
  progressCard: { backgroundColor: '#2563EB', borderRadius: 24, padding: 20, marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressCurrentText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  progressUnitText: { fontSize: 18, color: 'rgba(255,255,255,0.8)' },
  progressGoalText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  progressPercentText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', backgroundColor: 'white', borderRadius: 10 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeGood: { backgroundColor: 'rgba(255,255,255,0.3)' },
  statusBadgeNeeds: { backgroundColor: 'rgba(251,191,36,0.3)' }, 
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  remainingText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  // Chips
  chipScroll: { paddingBottom: 8, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#3B82F6' },
  chipEmoji: { fontSize: 16, marginRight: 8 },
  chipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: 'white' },
  customDrinkInput: { marginTop: 12, borderWidth: 2, borderColor: '#DBEAFE', borderRadius: 16, padding: 12, fontSize: 14, backgroundColor: 'white' },

  // Picker Box
  pickerBox: { backgroundColor: '#EFF6FF', borderRadius: 24, padding: 24, marginBottom: 24 },
  pickerTitle: { fontSize: 14, fontWeight: '500', color: '#374151', textAlign: 'center', marginBottom: 20 },
  amountInputWrap: { alignSelf: 'center', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 2, borderColor: '#93C5FD' },
  amountInput: { fontSize: 48, fontWeight: 'bold', color: '#3B82F6', minWidth: 100, textAlign: 'center' },
  amountUnit: { fontSize: 14, color: '#4B5563', marginTop: 4 },
  quickAddRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 },
  quickAddBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  quickAddBtnActive: { backgroundColor: '#3B82F6' },
  quickAddText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },
  quickAddTextActive: { color: 'white' },
  logBtn: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  logBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  // Breakdown Chart
  breakdownCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  chartContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  legendContainer: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 6 },
  legendName: { fontSize: 12, color: '#374151' },
  legendRight: { alignItems: 'flex-end' },
  legendPercent: { fontSize: 12, fontWeight: '600', color: '#111827' },
  legendMl: { fontSize: 10, color: '#6B7280' },

  // Tip Box
  tipBox: { flexDirection: 'row', backgroundColor: '#F0F9FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 24, gap: 12 },
  tipIconBox: { width: 40, height: 40, backgroundColor: '#DBEAFE', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginBottom: 4 },
  tipDesc: { fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  // History Accordion
  historyGroup: { marginBottom: 8, backgroundColor: '#EFF6FF', borderRadius: 16, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  historyDate: { fontSize: 14, color: '#374151' },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTotal: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  historyDetails: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  historyDrinkRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 12, borderRadius: 12, borderColor: '#DBEAFE', borderWidth: 1 },
  historyDrinkLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  historyTime: { fontSize: 12, color: '#6B7280' },
  historyDrinkName: { fontSize: 12, fontWeight: '500', color: '#374151' },
  historyDrinkAmount: { fontSize: 12, fontWeight: '600', color: '#2563EB' },

  // Analysis & Modal
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backBtnText: { fontSize: 14, color: '#4B5563' },
  analysisHeader: { alignItems: 'center', marginBottom: 24 },
  analysisIconBox: { width: 80, height: 80, backgroundColor: '#EFF6FF', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  analysisTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  analysisDesc: { fontSize: 14, color: '#4B5563' },
  analysisCard: { backgroundColor: '#EFF6FF', borderRadius: 20, padding: 20, marginBottom: 24 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  analysisRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  analysisLabel: { fontSize: 13, color: '#4B5563' },
  analysisValue: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', width: '100%', borderRadius: 32, padding: 24, alignItems: 'center' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalDesc: { fontSize: 14, color: '#6B7280' },
  modalInputWrap: { backgroundColor: '#EFF6FF', borderRadius: 24, paddingVertical: 20, paddingHorizontal: 40, alignItems: 'center', marginBottom: 24, width: '100%' },
  modalInput: { fontSize: 56, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center' },
  modalUnit: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { color: '#4B5563', fontWeight: '600', fontSize: 16 },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center' },
  modalConfirmText: { color: 'white', fontWeight: '600', fontSize: 16 },

  // --- NEW STEPPER STYLES ---
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepperBtnPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#F3F4F6',
  },
  stepperValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
  },
  stepperUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});