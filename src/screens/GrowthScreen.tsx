import React, { useCallback, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Dimensions, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CheckSquare, Square, Trash2 } from 'lucide-react-native';

import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext'; 
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { Card, Chip, Header, Screen, SectionTitle } from '../components/Common';
import { HealthRecord, deleteHealthRecords, loadHealthRecords } from '../utils/storage';

const BASE_URL = "https://jom-healthy-java.onrender.com";
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===================================================================
// SVG chart component: supports horizontal scrolling and fixed Y-axis
// ===================================================================
type Point = { 
  label: string; 
  value: number; 
  sd0?: number; 
  sd1?: number; 
  neg1?: number; 
};

function useGrowthStyles() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  return { styles, theme };
}

function SimpleLineChart({ data, unit, showWhoLines }: { data: Point[]; unit: string, showWhoLines: boolean }) {
  const { t } = useLanguage();
  const { styles, theme } = useGrowthStyles();
  const containerHeight = 200;
  const topPadding = 24;
  const bottomPadding = 30;
  const yAxisWidth = 45; 
  
  if (data.length === 0) {
    return (
      <View style={[styles.chartWrap, { height: containerHeight, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.muted }}>{t('chartNoData')}</Text>
      </View>
    );
  }

  // 1. Extract all visible values to calculate the Y-axis scale.
  const values = data.flatMap((d) => 
    showWhoLines && d.sd1 && d.neg1 ? [d.value, d.sd1, d.neg1] : [d.value]
  );
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  
  // Leave 10% vertical buffer space.
  const valuePadding = (rawMax - rawMin) * 0.1 || 1;
  const min = rawMin - valuePadding;
  const max = rawMax + valuePadding;

  // 💡 判断是否为单点数据
  const isSingle = data.length === 1;

  // 2. Dynamically calculate X-axis layout
  const chartViewportWidth = SCREEN_WIDTH - 40 - yAxisWidth - 20; 
  const maxVisiblePoints = 8;
  const pointSpacing = chartViewportWidth / (maxVisiblePoints - 1);
  
  // 如果只有一个点，宽度就是屏幕可视宽度；否则根据点数动态延伸
  const dynamicWidth = isSingle 
    ? chartViewportWidth 
    : Math.max(chartViewportWidth, (data.length - 1) * pointSpacing + 15 * 2);

  // 如果只有一个点，让点居中；如果是多个点，靠左排列
  const xOffset = isSingle ? dynamicWidth / 2 : 15; 
  const x = (i: number) => xOffset + i * pointSpacing;
  const y = (v: number) => containerHeight - bottomPadding - ((v - min) * (containerHeight - bottomPadding - topPadding)) / Math.max(1, max - min);

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  const hasSd0 = showWhoLines && data.some(d => d.sd0 !== undefined);
  const hasSd1 = showWhoLines && data.some(d => d.sd1 !== undefined);
  const hasNeg1 = showWhoLines && data.some(d => d.neg1 !== undefined);

  // 💡 视觉魔法：如果只有一个点，我们克隆这个点，并在 X 轴首尾相连，让背景铺满整个屏幕
  const whoRenderData = isSingle ? [data[0], data[0]] : data;
  const whoX = (i: number) => isSingle ? (i === 0 ? 0 : dynamicWidth) : x(i);

  const sd0Points = hasSd0 ? whoRenderData.map((d, i) => `${whoX(i)},${y(d.sd0 ?? d.value)}`).join(' ') : '';
  const sd1Points = hasSd1 ? whoRenderData.map((d, i) => `${whoX(i)},${y(d.sd1 ?? d.value)}`).join(' ') : '';
  const neg1Points = hasNeg1 ? whoRenderData.map((d, i) => `${whoX(i)},${y(d.neg1 ?? d.value)}`).join(' ') : '';
  
  // 3. 计算健康区域 (中间绿色)
  const healthyTop = hasSd1 ? whoRenderData.map((d, i) => `${whoX(i)},${y(d.sd1 ?? d.value)}`).join(' ') : '';
  const healthyBottom = hasNeg1 ? whoRenderData.map((d, i) => `${whoX(i)},${y(d.neg1 ?? d.value)}`).reverse().join(' ') : '';

  // 4. 计算风险区域的多边形阴影 (浅黄色背景) - 使用 whoX 替代原来的 x
  const riskTopArea = hasSd1 ? 
    whoRenderData.map((d, i) => `${whoX(i)},${y(d.sd1 ?? d.value)}`).join(' ') + ` ${dynamicWidth},${y(max)} 0,${y(max)}` : '';
  
  const riskBottomArea = hasNeg1 ? 
    whoRenderData.map((d, i) => `${whoX(i)},${y(d.neg1 ?? d.value)}`).join(' ') + ` ${dynamicWidth},${y(min)} 0,${y(min)}` : '';

  return (
    <View style={styles.chartWrap}>
      <View style={{ flexDirection: 'row', height: containerHeight }}>
        
        {/* =================  Left side fixed Y-axis ================= */}
        <View style={styles.yAxisContainer}>
          <Text style={styles.yAxisUnit}>{unit}</Text>
          <Text style={[styles.yAxisLabel, { top: topPadding - 6 }]}>{max.toFixed(1)}</Text>
          <Text style={[styles.yAxisLabel, { top: containerHeight - bottomPadding - 6 }]}>{min.toFixed(1)}</Text>
          
          <View style={styles.yAxisLine} />
          <View style={styles.yAxisTick} />
        </View>

        {/* ================= Right side horizontal scrolling area ================= */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <Svg width={dynamicWidth} height={containerHeight}>
            <Line x1={0} y1={containerHeight - bottomPadding} x2={dynamicWidth} y2={containerHeight - bottomPadding} stroke="#E5E7EB" strokeWidth="1" />

            {riskTopArea && (
              <Polyline points={riskTopArea} fill="rgba(245, 158, 11, 0.12)" stroke="none" />
            )}
            {riskBottomArea && (
              <Polyline points={riskBottomArea} fill="rgba(245, 158, 11, 0.12)" stroke="none" />
            )}

            {healthyTop && healthyBottom && (
              <Polyline points={`${healthyTop} ${healthyBottom}`} fill="rgba(76, 175, 122, 0.1)" stroke="none" />
            )}

            {sd1Points && <Polyline points={sd1Points} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" />}
            {sd0Points && <Polyline points={sd0Points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />}
            {neg1Points && <Polyline points={neg1Points} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" />}

            <Polyline points={points} fill="none" stroke={theme.colors.primaryDark} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => <Circle key={`pt-${i}`} cx={x(i)} cy={y(d.value)} r="4.5" fill={theme.colors.primaryDark} stroke="#FFFFFF" strokeWidth="1.5" />)}
            
            {data.map((d, i) => (
              <SvgText key={`lbl-${i}`} x={x(i)} y={containerHeight - 10} fontSize="10" textAnchor="middle" fill="#9CA3AF" fontWeight="600">
                {d.label}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
      </View>
      
      {/* ================= Bottom legend ================= */}
      {showWhoLines && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} /><Text style={styles.legendText}>{t('optimal')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>{t('riskrange')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.primaryDark }]} /><Text style={styles.legendText}>{t('yourchildbmi')}</Text></View>
        </View>
      )}
    </View>
  );
}

// ==========================================
// Main page logic: data fetching and record management
// ==========================================
type SegmentType = "HEIGHT" | "WEIGHT" | "BMI";

export default function GrowthScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { styles, theme } = useGrowthStyles();
  
  const { activeChild } = useChildProfile();
  
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [whoData, setWhoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<SegmentType>('HEIGHT');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      setIsEditMode(false); 
      setSelectedIds([]);
      fetchData();
    }, [selectedTab, activeChild])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!activeChild) {
        setRecords([]);
        setWhoData(null);
        return;
      }

      const stored = await loadHealthRecords();
      const childRecords = stored.filter(record => record.nickname === activeChild.nickname);
      const sortedRecords = childRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setRecords(sortedRecords);

      if (selectedTab === "BMI" && sortedRecords.length > 0) {
        const genderInt = activeChild.gender === 'boy' ? 1 : 2; 
        
        const response = await fetch(`${BASE_URL}/api/bmi/who-standards?type=MONTH&gender=${genderInt}`);
        const data = await response.json();
        setWhoData(data);
      } else {
        setWhoData(null);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleDelete = (id: string) => {
    Alert.alert(
      getText('Delete Record', '删除记录', 'Padam Rekod'), getText('Are you sure you want to delete this record?', '您确定要删除这条记录吗？', 'Adakah anda pasti mahu memadam rekod ini?'),
      [
        { text: getText('Cancel', '取消', 'Batal'), style: "cancel" },
        { 
          text: getText('Delete', '删除', 'Padam'), style: "destructive", 
          onPress: async () => {
            await deleteHealthRecords([id]);
            fetchData(); 
          } 
        }
      ]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return setIsEditMode(false);
    Alert.alert(
      getText('Delete Records', '删除记录', 'Padam Rekod'), getText('Delete {{count}} selected record(s)?', '删除 {{count}} 条已选择记录？', 'Padam {{count}} rekod yang dipilih?').replace('{{count}}', String(selectedIds.length)),
      [
        { text: getText('Cancel', '取消', 'Batal'), style: "cancel" },
        {
          text: getText('Delete', '删除', 'Padam'), style: "destructive",
          onPress: async () => {
            await deleteHealthRecords(selectedIds);
            setSelectedIds([]); 
            setIsEditMode(false); 
            fetchData(); 
          }
        }
      ]
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const unit = selectedTab === 'HEIGHT' ? 'cm' : selectedTab === 'WEIGHT' ? 'kg' : 'BMI';
  
  const chartData: Point[] = records.map((r) => {
    let val = 0;
    if (selectedTab === 'BMI') val = r.bmiValue;
    else if (selectedTab === 'HEIGHT') val = Number(r.height);
    else val = Number(r.weight);

    const point: Point = {
      label: new Date(r.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
      value: val
    };

    if (selectedTab === 'BMI' && whoData) {
      let age = r.ageInMonths;
      if (!age && activeChild?.birthday) {
        const birth = new Date(activeChild.birthday);
        const recordDate = new Date(r.date);
        age = (recordDate.getFullYear() - birth.getFullYear()) * 12 + (recordDate.getMonth() - birth.getMonth());
      }
      age = age || 0; 

      if (Array.isArray(whoData)) {
        const standard = whoData.find((w: any) => w.month === age || w.Month === age || w.ageInMonths === age);
        if (standard) {
          point.sd0 = standard.sd0?.value ?? standard.sd0;
          point.sd1 = standard.sd1?.value ?? standard.sd1;
          point.neg1 = standard.neg1?.value ?? standard.neg1;
        }
      } else {
        if (whoData.sd0 && whoData.sd0[age]) point.sd0 = whoData.sd0[age].value ?? whoData.sd0[age];
        if (whoData.sd1 && whoData.sd1[age]) point.sd1 = whoData.sd1[age].value ?? whoData.sd1[age];
        if (whoData.neg1 && whoData.neg1[age]) point.neg1 = whoData.neg1[age].value ?? whoData.neg1[age];
      }
    }
    return point;
  });

  const displayRecords = [...records].reverse();

  return (
    <Screen padded={false}>
      <Header title={t('growth')} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.tabs}>
            <Chip label={t('yourheight')} selected={selectedTab === 'HEIGHT'} onPress={() => setSelectedTab('HEIGHT')} />
            <Chip label={t('yourweight')} selected={selectedTab === 'WEIGHT'} onPress={() => setSelectedTab('WEIGHT')} />
            <Chip label={t('yourchildbmi')} selected={selectedTab === 'BMI'} onPress={() => setSelectedTab('BMI')} />
          </View>
          <Text style={styles.chartTitle}>
            {selectedTab === 'HEIGHT' ? t('heightTrend') : selectedTab === 'WEIGHT' ? t('weightTrend') : getText('BMI Trend', 'BMI趋势', 'Trend BMI')}
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primaryDark} style={{ height: 200 }} />
          ) : !activeChild ? (
            <View style={[styles.emptyState, { height: 200, borderWidth: 0 }]}>
               <Text style={styles.emptyStateText}>
                 {getText('Please create a child profile first.', '请先创建小孩档案。', 'Sila cipta profil kanak-kanak dahulu.')}
               </Text>
            </View>
          ) : (
            <SimpleLineChart 
              data={chartData} 
              unit={unit} 
              showWhoLines={selectedTab === 'BMI' && whoData !== null} 
            />
          )}
        </Card>

        <View style={styles.listHeader}>
          <SectionTitle title={t('pastRecords') || getText('History Records', '历史记录', 'Rekod Lepas')} />
          
          {displayRecords.length > 0 && (
            <Pressable 
              onPress={() => {
                if (isEditMode) {
                  setIsEditMode(false);
                  setSelectedIds([]);
                } else {
                  setIsEditMode(true);
                }
              }}
              style={styles.manageBtn}
            >
              <Text style={styles.manageBtnText}>{isEditMode ? getText('Cancel', '取消', 'Batal') : t('manage')}</Text>
            </Pressable>
          )}
        </View>

        {isEditMode && displayRecords.length > 0 && (
          <View style={styles.batchActions}>
            <Pressable 
              onPress={() => {
                if (selectedIds.length === displayRecords.length) setSelectedIds([]); 
                else setSelectedIds(displayRecords.map(r => r.id));
              }}
              style={styles.selectAllBtn}
            >
              {selectedIds.length === displayRecords.length ? <CheckSquare color={theme.colors.primaryDark} size={20} /> : <Square color="#CBD5E1" size={20} />}
              <Text style={[styles.selectAllText, selectedIds.length === displayRecords.length && { color: theme.colors.primaryDark }]}>
                {getText('Select All', '全选', 'Pilih Semua')}
              </Text>
            </Pressable>

            <TouchableOpacity 
              onPress={handleBatchDelete} 
              disabled={selectedIds.length === 0}
              style={[styles.deleteBatchBtn, selectedIds.length > 0 ? styles.deleteBatchActive : styles.deleteBatchDisabled]}
            >
              <Trash2 color="#FFFFFF" size={16} />
              <Text style={styles.deleteBatchText}>{getText('Delete', '删除', 'Padam')} ({selectedIds.length})</Text>
            </TouchableOpacity>
          </View>
        )}

        {displayRecords.length > 0 ? displayRecords.map((record) => {
          const isSelected = selectedIds.includes(record.id);
          const valToShow = selectedTab === 'BMI' ? record.bmiValue : selectedTab === 'HEIGHT' ? record.height : record.weight;

          return (
            <Card key={record.id} style={[styles.recordRow, isSelected && styles.recordRowSelected]}>
              <Pressable 
                onPress={() => isEditMode && toggleSelection(record.id)}
                style={styles.recordContent}
                disabled={!isEditMode}
              >
                {isEditMode && (
                  <View style={{ marginRight: 16 }}>
                    {isSelected ? <CheckSquare color={theme.colors.primaryDark} size={22} /> : <Square color="#CBD5E1" size={22} />}
                  </View>
                )}
                
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordDate}>{new Date(record.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
                  <Text style={styles.recordStatus}>{record.status || t('recorded')}</Text>
                </View>
                
                <Text style={styles.recordValue}>{valToShow} {selectedTab !== 'BMI' && unit}</Text>
              </Pressable>

              {!isEditMode && (
                <TouchableOpacity onPress={() => handleSingleDelete(record.id)} style={styles.singleDeleteBtn}>
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              )}
            </Card>
          );
        }) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{getText('No health records found.', '没有找到健康记录。', 'Tiada rekod kesihatan ditemui.')}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  body: { padding: 20, gap: 12, paddingBottom: 60 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chartTitle: { color: themeColors.text, fontWeight: '900', fontSize: 18, marginBottom: 10 },
  
  chartWrap: { backgroundColor: themeColors.bg, borderRadius: 18, paddingTop: 16, paddingBottom: 8, overflow: 'hidden' },
  
  yAxisContainer: { width: 45, height: '100%', zIndex: 10, backgroundColor: themeColors.bg },
  yAxisUnit: { position: 'absolute', top: 0, right: 6, fontSize: 11, fontWeight: 'bold', color: '#9CA3AF' },
  yAxisLabel: { position: 'absolute', right: 6, fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  yAxisLine: { position: 'absolute', right: 0, top: 24, bottom: 30, width: 1, backgroundColor: themeColors.border },
  yAxisTick: { position: 'absolute', right: 0, bottom: 30, width: 4, height: 1, backgroundColor: themeColors.border },

  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: themeColors.muted, fontWeight: '600' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  manageBtn: { backgroundColor: themeColors.bg, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99 },
  manageBtnText: { color: themeColors.primaryDark, fontWeight: '700', fontSize: 12 },

  batchActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: themeColors.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: themeColors.border },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  selectAllText: { color: themeColors.muted, fontWeight: '700', fontSize: 14 },
  deleteBatchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  deleteBatchActive: { backgroundColor: '#EF4444' },
  deleteBatchDisabled: { backgroundColor: themeColors.border },
  deleteBatchText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  recordRow: { padding: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  recordRowSelected: { borderWidth: 2, borderColor: themeColors.primaryDark, backgroundColor: themeColors.primaryLight },
  recordContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 },
  recordDate: { color: themeColors.text, fontWeight: '800', fontSize: 15 },
  recordStatus: { color: themeColors.primaryDark, marginTop: 4, fontWeight: '700', fontSize: 12 },
  recordValue: { color: themeColors.text, fontWeight: '900', fontSize: 20 },
  singleDeleteBtn: { padding: 16, backgroundColor: '#FEF2F2', justifyContent: 'center' },

  emptyState: { alignItems: 'center', padding: 32, backgroundColor: themeColors.card, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border, borderStyle: 'dashed' },
  emptyStateText: { color: themeColors.muted, fontWeight: '600' },

});
