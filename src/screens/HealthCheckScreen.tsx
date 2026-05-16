import React, { useMemo, useState } from 'react';
import { 
  Modal, 
  Platform, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, ChevronDown, Ruler, Weight, X, CheckCircle2, HeartPulse } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Header, PrimaryButton, Screen } from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import { loadHealthRecords, saveHealthRecord } from '../utils/storage';

const HEIGHT_STANDARDS = Array.from({ length: 230 }, (_, i) => i.toString());
const WEIGHT_STANDARDS = Array.from({ length: 200 }, (_, i) => i.toString());
const BASE_URL = "https://jom-healthy-java.onrender.com";

export default function HealthCheckScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { children, syncLatestHealthRecord } = useChildProfile();
  
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;
  
  // 表单状态管理
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [gender, setGender] = useState<number | null>(null);
  const [birthday, setBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  // 弹窗状态管理
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  // 测量结果与后端请求状态
  const [bmi, setBmi] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adviceText, setAdviceText] = useState("");
  const [isError, setIsError] = useState(false);

  // 切换选中儿童档案
  const handleSelectChild = (child: any) => {
    if (selectedChildId === child.id) {
      setSelectedChildId(null);
      setGender(null);
      setBirthday("");
    } else {
      setSelectedChildId(child.id);
      setGender(child.gender === 'boy' ? 1 : 0);
      setBirthday(child.birthday || "");
    }
    setBmi(null); 
    setAdviceText(""); 
  };

  // 生日日期格式化与处理逻辑
  const formatBirthday = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const normalizeBirthdayInput = (value: string) => {
    const cleaned = value.replace(/-/g, '/').replace(/[^\d/]/g, '');
    const segments = cleaned.split('/').filter(Boolean).slice(0, 3);
    if (segments.length === 0) return '';
    const [year = '', month = '', day = ''] = segments;
    const next = [year.slice(0, 4)];
    if (segments.length >= 2) next.push(month.slice(0, 2).padStart(2, '0'));
    if (segments.length >= 3) next.push(day.slice(0, 2).padStart(2, '0'));
    return next.join('/');
  };

  const parseBirthday = (value: string) => {
    const normalized = normalizeBirthdayInput(value);
    const parts = normalized.split('/');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    if (date.getTime() > Date.now()) return null;
    return date;
  };

  const birthdayDate = useMemo(() => parseBirthday(birthday), [birthday]);
  const isFormValid = birthdayDate !== null && height !== "" && weight !== "" && gender !== null;

  const handleBirthdayChangeText = (value: string) => {
    setBirthday(normalizeBirthdayInput(value));
    setBmi(null);
    setAdviceText("");
  };

  const handleBirthdayPickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setBirthday(formatBirthday(selectedDate));
      setBmi(null);
      setAdviceText("");
    }
    if (Platform.OS !== 'ios') setShowBirthdayPicker(false);
  };

  const handleBirthdayBlur = () => {
    const parsed = birthdayDate;
    if (parsed) setBirthday(formatBirthday(parsed));
  };

  // 格式化后端返回的医学建议文本
  const formatAdviceText = (text: string) => {
    if (!text) return "";
    return text
      .replace("Assessment results:", "\n\n📋 Assessment: ")
      .replace(" - It is recommended", "\n\n💡 Advice:\nIt is recommended")
      .replace("- It is recommended", "\n\n💡 Advice:\nIt is recommended");
  };

  // 触发 BMI 计算并请求后端医疗引擎
  const calculateBMI = async () => {
    if (!isFormValid) return;
    
    const h = Number(height) / 100;
    const w = Number(weight);
    if (h > 0 && w > 0) {
      const value = w / (h * h);
      setBmi(Number(value.toFixed(1)));
      setStatus(value < 14 ? t('underweight') : value < 18 ? t('normal') : t('overweight'));
      
      setIsLoading(true);
      setIsError(false);
      setAdviceText("");

      try {
        const url = `${BASE_URL}/api/bmi/evaluate?heightCm=${height}&weightKg=${weight}&birthDateStr=${birthday}&gender=${gender}`; 
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Server response error');
        
        const text = await response.text(); 
        setAdviceText(text);
      } catch (error) {
        console.error("请求后端医疗引擎失败:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 保存健康记录
  const handleSaveRecord = async () => {
    if (!selectedChildId || !bmi) return;
    const child = children.find(c => c.id === selectedChildId);
    if (!child) return;

    try {
      // 检查今日是否已经记录过该儿童的测量数据
      const existingRecords = await loadHealthRecords();
      const todayString = new Date().toDateString();
      const hasRecordedToday = existingRecords.some(
        (record) => record.nickname === child.nickname && new Date(record.date).toDateString() === todayString
      );

      if (hasRecordedToday) {
        // 如果今天已记录，弹出防呆提示并中止保存流程
        Alert.alert(
          getText('Already Measured Today', '今日已测量', 'Telah Diukur Hari Ini'),
          getText(
            "You can only save one measurement per day. You can still view today's BMI analysis, but this new data won't be saved to the growth trend.",
            "一天只能保存一次测量结果。您可以继续查看当前的 BMI 分析，但本次数据不会被叠加记录在成长趋势中。",
            "Anda hanya boleh menyimpan satu ukuran sehari. Anda masih boleh melihat analisis BMI hari ini, tetapi data baru ini tidak akan disimpan ke dalam trend pertumbuhan."
          ),
          [
            { text: getText('Got it', '我知道了', 'Faham'), style: 'default' }
          ]
        );
        return; 
      }

      // 计算保存所需的精确月龄
      let ageInMonths = 0;
      let ageText = "";
      if (birthdayDate) {
        const today = new Date();
        const mDiff = today.getMonth() - birthdayDate.getMonth();
        const yDiff = today.getFullYear() - birthdayDate.getFullYear();
        ageInMonths = yDiff * 12 + mDiff;
        ageText = getText(
          `${Math.floor(ageInMonths / 12)} years ${ageInMonths % 12} months`,
          `${Math.floor(ageInMonths / 12)}岁 ${ageInMonths % 12}个月`,
          `${Math.floor(ageInMonths / 12)} tahun ${ageInMonths % 12} bulan`
        );
      }

      const record = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        nickname: child.nickname || getText('Child', '孩子', 'Anak'),
        ageText: ageText,
        ageInMonths: ageInMonths,
        height: Number(height),
        weight: Number(weight),
        gender: gender ?? 1,
        bmiValue: bmi,
        adviceText: adviceText,
        status: status
      };

      await saveHealthRecord(record);
      
      // 同步全局状态
      if (syncLatestHealthRecord) {
        await syncLatestHealthRecord();
      }

      navigation.goBack();
    } catch (error) {
      console.error("保存健康记录失败:", error);
    }
  };

  // 通用范围选择器模态框组件
  const RangeModal = ({ visible, title, options, onClose, onSelect, unit }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#475569" size={22} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {options.map((opt: string) => (
              <TouchableOpacity 
                key={opt} 
                style={styles.sheetItem} 
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={styles.sheetItemText}>{opt} <Text style={styles.sheetItemUnit}>{unit}</Text></Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <Screen padded={false}>
      <Header title={t('checkChildHealth')} icon="fitness" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          
          {/* 儿童档案选择区域 */}
          {children && children.length > 0 && (
            <View style={[styles.fieldGroup, styles.profileSelectorSection]}>
              <Text style={styles.label}>{t('selectProfile')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
                {children.map((child: any) => {
                  const isSelected = selectedChildId === child.id;
                  return (
                    <TouchableOpacity 
                      key={child.id} 
                      onPress={() => handleSelectChild(child)}
                      style={[styles.profileAvatarItem, isSelected && styles.profileAvatarItemSelected]}
                    >
                      <ChildAvatar avatar={child.avatar} avatarImageUri={child.avatarImageUri} size={48} />
                      <Text style={styles.profileNickname} numberOfLines={1}>{child.nickname}</Text>
                      {isSelected && (
                        <View style={styles.selectedCheckmark}>
                          <CheckCircle2 color="#FFFFFF" size={12} fill={theme.colors.primaryDark} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 性别选择区域 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('gender')}</Text>
            {selectedChildId ? (
              <View style={styles.lockedBox}>
                <Text style={styles.lockedText}>
                  {gender === 1 ? getText('👦 Boy', '👦 男孩', '👦 Lelaki') : getText('👧 Girl', '👧 女孩', '👧 Perempuan')}
                </Text>
              </View>
            ) : (
              <View style={styles.genderRow}>
                <TouchableOpacity 
                  onPress={() => { setGender(1); setBmi(null); setAdviceText(""); }} 
                  style={[styles.genderBtn, gender === 1 ? styles.genderBoyActive : styles.genderInactive]}
                >
                  <Text style={[styles.genderBtnText, gender === 1 ? styles.textBoyActive : styles.textInactive]}>{getText('👦 Boy', '👦 男孩', '👦 Lelaki')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setGender(0); setBmi(null); setAdviceText(""); }} 
                  style={[styles.genderBtn, gender === 0 ? styles.genderGirlActive : styles.genderInactive]}
                >
                  <Text style={[styles.genderBtnText, gender === 0 ? styles.textGirlActive : styles.textInactive]}>{getText('👧 Girl', '👧 女孩', '👧 Perempuan')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 出生日期选择区域 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('birthday')}</Text>
            {selectedChildId ? (
              <View style={styles.lockedBox}>
                <View style={styles.dateInputLeft}>
                  <Calendar color="#9CA3AF" size={18} />
                  <Text style={styles.lockedText}>{birthday}</Text>
                </View>
              </View>
            ) : (
              <Pressable style={styles.dateButton} onPress={() => setShowBirthdayPicker((prev) => !prev)}>
                <View style={styles.dateInputLeft}>
                  <Calendar color={theme.colors.primaryDark} size={18} />
                  <Text style={[styles.dateButtonText, !birthday && styles.datePlaceholder]}>
                    {birthday || 'YYYY/MM/DD'}
                  </Text>
                </View>
                <Text style={styles.dateButtonAction}>{showBirthdayPicker ? getText('Hide', '隐藏', 'Sembunyi') : getText('Choose', '选择', 'Pilih')}</Text>
              </Pressable>
            )}

            {showBirthdayPicker && !selectedChildId && (
              <View style={styles.pickerWrap}>
                <DateTimePicker 
                  value={birthdayDate || new Date()} 
                  mode="date" 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                  maximumDate={new Date()} 
                  onChange={handleBirthdayPickerChange} 
                />
                <TextInput 
                  value={birthday} 
                  onChangeText={handleBirthdayChangeText} 
                  onBlur={handleBirthdayBlur} 
                  placeholder="YYYY/MM/DD" 
                  style={styles.hiddenInput} 
                  keyboardType="numbers-and-punctuation" 
                />
              </View>
            )}
          </View>

          {/* 身高输入区域 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('height')}</Text>
            <View style={styles.inputWithAddon}>
              <View style={styles.inputIconBox}><Ruler color="#22BBF7" size={18} /></View>
              <TextInput 
                value={height} 
                onChangeText={(val) => { setHeight(val); setBmi(null); setAdviceText(""); }} 
                placeholder={t('enterHeight')} 
                keyboardType="numeric" 
                style={styles.flexInput} 
              />
              <TouchableOpacity onPress={() => setShowHeightPicker(true)} style={styles.dropdownAddon}>
                <ChevronDown color={theme.colors.muted} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 体重输入区域 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('weight')}</Text>
            <View style={styles.inputWithAddon}>
              <View style={[styles.inputIconBox, { backgroundColor: '#EAF7F0' }]}><Weight color="#16A34A" size={18} /></View>
              <TextInput 
                value={weight} 
                onChangeText={(val) => { setWeight(val); setBmi(null); setAdviceText(""); }} 
                placeholder={t('enterWeight')} 
                keyboardType="numeric" 
                style={styles.flexInput} 
              />
              <TouchableOpacity onPress={() => setShowWeightPicker(true)} style={styles.dropdownAddon}>
                <ChevronDown color={theme.colors.muted} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton 
            title={t('calculateBMI')} 
            onPress={calculateBMI} 
            disabled={!isFormValid || isLoading} 
            style={{ marginTop: 8 }} 
          />
        </Card>

        {/* 结果呈现区域 */}
        {bmi !== null && (
          <Card style={styles.resultCard}>
            <Text style={styles.resultLabel}>{t('bmiResult')}</Text>
            <Text style={styles.bmi}>{bmi}</Text>
            <Text style={[styles.status, status === t('normal') ? styles.normal : status === t('underweight') ? styles.under : styles.over]}>
              {status}
            </Text>

            {/* WHO 医学引擎建议模块 */}
            <View style={styles.adviceContainer}>
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                  <Text style={styles.loadingText}>{getText('Analyzing WHO Growth Standard...', '正在分析 WHO 生长标准...', 'Menganalisis Standard Pertumbuhan WHO...')}</Text>
                </View>
              ) : isError ? (
                <Text style={styles.errorText}>{getText('Failed to connect to the medical engine. Please try again.', '无法连接到医疗引擎，请重试。', 'Gagal menyambung ke enjin perubatan. Sila cuba lagi.')}</Text>
              ) : adviceText ? (
                <View>
                  <View style={styles.adviceHeader}>
                    <HeartPulse color={theme.colors.primaryDark} size={20} />
                    <Text style={styles.adviceTitle}>{getText('WHO Medical Analysis', 'WHO 医学分析', 'Analisis Perubatan WHO')}</Text>
                  </View>
                  <Text style={styles.adviceBody}>
                    {formatAdviceText(adviceText).trim()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 保存记录判定 */}
            {selectedChildId ? (
              <PrimaryButton 
                title={t('saveRecommendations') || getText('Save Record', '保存记录', 'Simpan Rekod')} 
                icon="save" 
                disabled={isLoading || isError}
                onPress={handleSaveRecord} 
                style={{ marginTop: 24, width: '100%' }} 
              />
            ) : (
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
                  {t('selectProfileToSave') || getText('* Select a profile above to save this record.', '* 请选择上方的档案来保存这条记录。', '* Pilih profil di atas untuk menyimpan rekod ini.')}
                </Text>
              </View>
            )}
          </Card>
        )}
        
      </ScrollView>

      {/* 数值选择模态框 */}
      <RangeModal 
        visible={showHeightPicker} 
        title={getText('Select Height', '选择身高', 'Pilih Tinggi')} 
        options={HEIGHT_STANDARDS} 
        unit="cm" 
        onClose={() => setShowHeightPicker(false)} 
        onSelect={(val: string) => { setHeight(val); setBmi(null); setAdviceText(""); }} 
      />
      <RangeModal 
        visible={showWeightPicker} 
        title={getText('Select Weight', '选择体重', 'Pilih Berat')} 
        options={WEIGHT_STANDARDS} 
        unit="kg" 
        onClose={() => setShowWeightPicker(false)} 
        onSelect={(val: string) => { setWeight(val); setBmi(null); setAdviceText(""); }} 
      />
    </Screen>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 60 },
  fieldGroup: { marginBottom: 18 },
  label: { color: themeColors.text, fontWeight: '800', marginBottom: 8, fontSize: 14 },
  
  profileSelectorSection: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  profileScroll: { gap: 12, paddingVertical: 4 },
  profileAvatarItem: { alignItems: 'center', width: 64, position: 'relative', opacity: 0.7 },
  profileAvatarItemSelected: { opacity: 1 },
  profileNickname: { fontSize: 12, color: themeColors.text, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  selectedCheckmark: { position: 'absolute', top: -2, right: 4, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  lockedBox: { backgroundColor: '#F3F4F6', borderRadius: 16, minHeight: 52, paddingHorizontal: 14, justifyContent: 'center' },
  lockedText: { color: '#9CA3AF', fontWeight: '700', fontSize: 15 },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 2, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  genderInactive: { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  genderBoyActive: { borderColor: '#4CAF7A', backgroundColor: '#EAF7F0' },
  genderGirlActive: { borderColor: '#FF9F6E', backgroundColor: '#FFE8DC' },
  genderBtnText: { fontWeight: '700', fontSize: 15 },
  textInactive: { color: '#9CA3AF' },
  textBoyActive: { color: '#4CAF7A' },
  textGirlActive: { color: '#FF9F6E' },

  dateButton: { backgroundColor: themeColors.bg, borderRadius: 16, minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInputLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButtonText: { color: themeColors.text, fontWeight: '700', fontSize: 15 },
  datePlaceholder: { color: '#9CA3AF', fontWeight: '500' },
  dateButtonAction: { color: themeColors.primaryDark, fontWeight: '800', fontSize: 13 },
  pickerWrap: { marginTop: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: themeColors.bg },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },

  inputWithAddon: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.bg, borderRadius: 16, minHeight: 52, paddingLeft: 6, paddingRight: 6 },
  inputIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF6FB', alignItems: 'center', justifyContent: 'center' },
  flexInput: { flex: 1, paddingHorizontal: 12, color: themeColors.text, fontSize: 15, fontWeight: '600', height: '100%' },
  dropdownAddon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },

  backdrop: { flex: 1, backgroundColor: themeColors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '60%', paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: themeColors.text },
  closeBtn: { padding: 4 },
  sheetList: { paddingHorizontal: 20, paddingTop: 10 },
  sheetItem: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  sheetItemText: { fontSize: 16, fontWeight: '600', color: themeColors.text, textAlign: 'center' },
  sheetItemUnit: { fontSize: 14, color: themeColors.muted, fontWeight: '400' },

  resultCard: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  resultLabel: { color: themeColors.muted, fontWeight: '700', fontSize: 15 },
  bmi: { color: themeColors.text, fontSize: 54, fontWeight: '900', marginVertical: 8 },
  status: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99, fontWeight: '900', overflow: 'hidden' },
  normal: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  under: { backgroundColor: '#FEF3C7', color: '#D97706' },
  over: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  tip: { color: themeColors.muted, lineHeight: 21, fontSize: 13 },
  
  adviceContainer: { width: '100%', marginTop: 24, backgroundColor: '#F9FAFB', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  loadingBox: { padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  errorText: { padding: 24, color: '#EF4444', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  adviceHeader: { backgroundColor: '#EAF7F0', paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  adviceTitle: { color: themeColors.primaryDark, fontWeight: '800', fontSize: 15 },
  adviceBody: { padding: 20, color: '#4B5563', fontSize: 14, lineHeight: 24, fontWeight: '500' },
});
