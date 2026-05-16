import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Chip, IconButton, PrimaryButton } from './Common';
import ChildAvatar, { CHILD_AVATAR_OPTIONS } from './ChildAvatar';
import TagInput from './TagInput';

type Child = {
  id: number;
  avatar: string;
  avatarImageUri?: string;
  nickname: string;
  birthday?: string;
  age: number;
  height: number;
  weight: number;
  gender: 'boy' | 'girl';
  allergies?: string[];
  restrictions?: {
    vegetarian?: boolean;
    halal?: boolean;
    lactoseIntolerance?: boolean;
    noSeafood?: boolean;
  };
};

export default function AddChildModal({
  visible,
  onClose,
  onSuccess,
  childToEdit,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  childToEdit?: Child | null;
}) {
  const { addChild, updateChild } = useChildProfile();
  const { language } = useLanguage();
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const avatarOptions = CHILD_AVATAR_OPTIONS;
  const defaultBuiltInAvatar = avatarOptions[0]?.id || 'kid-avatar-01';

  const [selectedAvatar, setSelectedAvatar] = useState(
    childToEdit?.avatar || defaultBuiltInAvatar
  );
  const [avatarImageUri, setAvatarImageUri] = useState(
    childToEdit?.avatarImageUri || ''
  );
  const [gender, setGender] = useState<'boy' | 'girl'>(
    childToEdit?.gender || 'boy'
  );
  const [nickname, setNickname] = useState(childToEdit?.nickname || '');
  const [birthday, setBirthday] = useState(childToEdit?.birthday || '');
  const [height, setHeight] = useState(
    childToEdit?.height?.toString() || ''
  );
  const [weight, setWeight] = useState(
    childToEdit?.weight?.toString() || ''
  );
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(
    childToEdit?.allergies || []
  );
  const [restrictions, setRestrictions] = useState({
    vegetarian: childToEdit?.restrictions?.vegetarian || false,
    halal: childToEdit?.restrictions?.halal || false,
    lactoseIntolerance:
      childToEdit?.restrictions?.lactoseIntolerance || false,
    noSeafood: childToEdit?.restrictions?.noSeafood || false,
  });

  useEffect(() => {
    if (!visible) return;

    setSelectedAvatar(childToEdit?.avatar || defaultBuiltInAvatar);
    setAvatarImageUri(childToEdit?.avatarImageUri || '');
    setGender(childToEdit?.gender || 'boy');
    setNickname(childToEdit?.nickname || '');
    setBirthday(childToEdit?.birthday || '');
    setHeight(childToEdit?.height?.toString() || '');
    setWeight(childToEdit?.weight?.toString() || '');
    setShowBirthdayPicker(false);
    setShowAvatarPicker(false);
    setAllergies(childToEdit?.allergies || []);
    setRestrictions({
      vegetarian: childToEdit?.restrictions?.vegetarian || false,
      halal: childToEdit?.restrictions?.halal || false,
      lactoseIntolerance:
        childToEdit?.restrictions?.lactoseIntolerance || false,
      noSeafood: childToEdit?.restrictions?.noSeafood || false,
    });
  }, [visible, childToEdit]);

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

    if (segments.length >= 2) {
      next.push(month.slice(0, 2).padStart(2, '0'));
    }

    if (segments.length >= 3) {
      next.push(day.slice(0, 2).padStart(2, '0'));
    }

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

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    if (date.getTime() > Date.now()) return null;

    return date;
  };

  const birthdayDate = useMemo(() => parseBirthday(birthday), [birthday]);

  const birthdayError =
    birthday.trim() && !birthdayDate
      ? 'Please use YYYY/MM/DD or pick a valid date.'
      : '';

  const valid = useMemo(
    () =>
      Boolean(
        nickname.trim() &&
          birthdayDate &&
          Number(height) > 0 &&
          Number(weight) > 0 &&
          !birthdayError
      ),
    [nickname, birthdayDate, height, weight, birthdayError]
  );

  const pickAvatarFromAlbum = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo permission needed',
        'Please allow photo access to choose an avatar from your album.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarImageUri(result.assets[0].uri);
    }
  };

  const randomAvatar = () => {
    const random = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
    setAvatarImageUri('');
    setSelectedAvatar(random?.id || defaultBuiltInAvatar);
  };

  const handleBirthdayChangeText = (value: string) => {
    setBirthday(normalizeBirthdayInput(value));
  };

  const handleBirthdayPickerChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (selectedDate) {
      setBirthday(formatBirthday(selectedDate));
    }

    if (Platform.OS !== 'ios') {
      setShowBirthdayPicker(false);
    }
  };

  const handleBirthdayBlur = () => {
    const parsed = birthdayDate;

    if (parsed) {
      setBirthday(formatBirthday(parsed));
    }
  };

  const calculateAge = (value: Date) => {
    const now = new Date();
    let age = now.getFullYear() - value.getFullYear();
    const monthDiff = now.getMonth() - value.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < value.getDate())
    ) {
      age -= 1;
    }

    return Math.max(0, age || 7);
  };

  const save = () => {
    if (!valid) return;

    const parsedBirthday = birthdayDate;

    if (!parsedBirthday) return;

    const h = Number(height) / 100;
    const w = Number(weight);
    const bmiValue = w / (h * h);

    const child = {
      id: childToEdit?.id || Date.now(),
      nickname: nickname.trim(),
      avatar: selectedAvatar,
      avatarImageUri: avatarImageUri || undefined,
      age: calculateAge(parsedBirthday),
      height: Number(height),
      weight: Number(weight),
      gender,
      bmi: Number(bmiValue.toFixed(1)),
      status:
        bmiValue < 14
          ? 'Underweight'
          : bmiValue < 18
            ? 'Normal'
            : 'Overweight',
      birthday: formatBirthday(parsedBirthday),
      preferences: [],
      allergies,
      restrictions,
    };

    childToEdit ? updateChild(child as any) : addChild(child as any);

    onSuccess?.();
    onClose();
  };

  const RowSwitch = ({
    label,
    value,
    keyName,
  }: {
    label: string;
    value: boolean;
    keyName: keyof typeof restrictions;
  }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(next) =>
          setRestrictions((prev) => ({
            ...prev,
            [keyName]: next,
          }))
        }
        thumbColor={value ? colors.primaryDark : '#F3F4F6'}
        trackColor={{
          false: '#D1D5DB',
          true: '#A7F3D0',
        }}
      />
    </View>
  );

  const allergySuggestions = [
    { value: 'Peanuts', label: getText('Peanuts', '花生', 'Kacang tanah') },
    { value: 'Dairy', label: getText('Dairy', '乳制品', 'Tenusu') },
    { value: 'Shellfish', label: getText('Shellfish', '贝类海鲜', 'Kerang-kerangan') },
    { value: 'Eggs', label: getText('Eggs', '鸡蛋', 'Telur') },
    { value: 'Soy', label: getText('Soy', '大豆', 'Soya') },
    { value: 'Wheat', label: getText('Wheat', '小麦', 'Gandum') },
    { value: 'Tree nuts', label: getText('Tree nuts', '坚果', 'Kacang pokok') },
  ];

  return (
    <>
      <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Card style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {childToEdit ? getText('Edit Child Profile', '编辑儿童资料', 'Edit Profil Kanak-kanak') : getText('Add Child', '添加孩子', 'Tambah Kanak-kanak')}
            </Text>

            <IconButton icon="close" onPress={onClose} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.label}>{getText('Avatar', '头像', 'Avatar')}</Text>

            <View style={styles.avatarPreviewRow}>
              <Pressable
                style={styles.avatarPreviewButton}
                onPress={() => setShowAvatarPicker(true)}
              >
                <ChildAvatar
                  avatar={selectedAvatar}
                  avatarImageUri={avatarImageUri}
                  size={72}
                  style={styles.avatarPreview}
                />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="pencil" size={12} color="#FFFFFF" />
                </View>
              </Pressable>

              <View style={styles.avatarInfo}>
                <Text style={styles.avatarHint}>
                  {getText(
                    'Tap the avatar to choose from all built-in child avatars, or upload a photo from your album.',
                    '点击头像可以查看并选择全部内置儿童头像，也可以从相册上传照片。',
                    'Ketik avatar untuk memilih daripada semua avatar kanak-kanak terbina dalam, atau muat naik foto daripada album anda.'
                  )}
                </Text>

                <View style={styles.avatarTopActions}>
                  <Pressable
                    style={styles.avatarActionButton}
                    onPress={randomAvatar}
                  >
                    <Ionicons
                      name="shuffle"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.avatarActionText}>{getText('Random Avatar', '随机头像', 'Avatar Rawak')}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.avatarActionButton}
                    onPress={pickAvatarFromAlbum}
                  >
                    <Ionicons
                      name="image"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.avatarActionText}>{getText('Upload Photo', '上传照片', 'Muat Naik Foto')}</Text>
                  </Pressable>
                </View>

                {!!avatarImageUri && (
                  <Pressable
                    style={styles.useEmojiButton}
                    onPress={() => setAvatarImageUri('')}
                  >
                    <Ionicons
                      name="happy"
                      size={15}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.useEmojiText}>{getText('Use Built-in Avatar', '使用内置头像', 'Guna Avatar Terbina Dalam')}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.label}>{getText('Nickname', '昵称', 'Nama Panggilan')}</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="e.g. Aiman"
              style={styles.input}
            />

            <Text style={styles.label}>{getText('Birthday', '生日', 'Hari Lahir')}</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowBirthdayPicker((prev) => !prev)}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !birthday && styles.datePlaceholder,
                ]}
              >
                {birthday || 'YYYY/MM/DD'}
              </Text>

              <Text style={styles.dateButtonAction}>
                {showBirthdayPicker ? getText('Hide', '隐藏', 'Sembunyi') : getText('Choose', '选择', 'Pilih')}
              </Text>
            </Pressable>

            {showBirthdayPicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={parseBirthday(birthday) || new Date()}
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

            {!!birthdayError && (
              <Text style={styles.errorText}>{birthdayError}</Text>
            )}

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{getText('Height (cm)', '身高（厘米）', 'Tinggi (sentimeter)')}</Text>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  placeholder="118"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{getText('Weight (kg)', '体重（公斤）', 'Berat (kilogram)')}</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="23"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>{getText('Gender', '性别', 'Jantina')}</Text>
            <View style={styles.genderRow}>
              <Chip
                label={getText('Boy', '男孩', 'Lelaki')}
                icon="male"
                selected={gender === 'boy'}
                onPress={() => setGender('boy')}
              />
              <Chip
                label={getText('Girl', '女孩', 'Perempuan')}
                icon="female"
                selected={gender === 'girl'}
                onPress={() => setGender('girl')}
              />
            </View>

            <Text style={styles.label}>{getText('Cannot Eat / Allergies', '不能吃 / 过敏', 'Tidak Boleh Makan / Alahan')}</Text>
            <TagInput
              tags={allergies}
              onChange={setAllergies}
              suggestions={allergySuggestions}
              placeholder={getText('Add allergy...', '添加过敏项...', 'Tambah alahan...')}
            />

            <Text style={styles.label}>{getText('Dietary Restrictions', '饮食限制', 'Sekatan Diet')}</Text>
            <View style={styles.restrictions}>
              <RowSwitch
                label={getText('Vegetarian', '素食', 'Vegetarian')}
                value={restrictions.vegetarian}
                keyName="vegetarian"
              />
              <RowSwitch
                label={getText('Halal', '清真', 'Halal')}
                value={restrictions.halal}
                keyName="halal"
              />
              <RowSwitch
                label={getText('Lactose Intolerance', '乳糖不耐受', 'Intoleransi Laktosa')}
                value={restrictions.lactoseIntolerance}
                keyName="lactoseIntolerance"
              />
              <RowSwitch
                label={getText('No Seafood', '不吃海鲜', 'Tiada Makanan Laut')}
                value={restrictions.noSeafood}
                keyName="noSeafood"
              />
            </View>

            <PrimaryButton
              title={childToEdit ? getText('Save Changes', '保存更改', 'Simpan Perubahan') : getText('Create Profile', '创建档案', 'Cipta Profil')}
              icon="save"
              disabled={!valid}
              onPress={save}
              style={{ marginTop: 18 }}
            />
          </ScrollView>
        </Card>

      {showAvatarPicker && (
        <Pressable
          style={styles.avatarPickerOverlay}
          onPress={() => setShowAvatarPicker(false)}
        >
          <Pressable
            style={styles.avatarPickerCard}
            onPress={() => {}}
          >
            <View style={styles.avatarPickerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarPickerTitle}>
                  {getText('Choose Avatar', '选择头像', 'Pilih Avatar')}
                </Text>
                <Text style={styles.avatarPickerSubtitle}>
                  {getText(
                    'Tap one avatar to use it for this child profile.',
                    '点击任意头像即可用于当前小孩档案。',
                    'Ketik mana-mana avatar untuk digunakan pada profil kanak-kanak ini.'
                  )}
                </Text>
              </View>

              <Pressable
                style={styles.avatarPickerClose}
                onPress={() => setShowAvatarPicker(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarPickerGrid}
            >
              {avatarOptions.map((option) => {
                const selected = selectedAvatar === option.id && !avatarImageUri;

                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.builtInAvatarOption,
                      selected && styles.builtInAvatarOptionSelected,
                    ]}
                    onPress={() => {
                      setAvatarImageUri('');
                      setSelectedAvatar(option.id);
                      setShowAvatarPicker(false);
                    }}
                  >
                    <ChildAvatar avatar={option.id} size={68} />
                    {selected && (
                      <View style={styles.avatarSelectedBadge}>
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
      </View>
      </Modal>


    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  sheet: {
    maxHeight: '92%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },

  scrollContent: {
    paddingBottom: 18,
  },

  label: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
    fontWeight: '800',
  },

  input: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    color: colors.text,
  },

  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },

  dateButton: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateButtonText: {
    color: colors.text,
    fontWeight: '700',
  },

  datePlaceholder: {
    color: colors.muted,
    fontWeight: '600',
  },

  dateButtonAction: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },

  errorText: {
    marginTop: 6,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },

  pickerWrap: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },

  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatarPreviewButton: {
    position: 'relative',
    alignSelf: 'flex-start',
  },

  avatarPreview: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },

  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  avatarInfo: {
    flex: 1,
  },

  avatarHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },

  avatarTopActions: {
    flexDirection: 'row',
    gap: 8,
  },

  avatarActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },

  avatarActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },

  useEmojiButton: {
    marginTop: 8,
    minHeight: 38,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  useEmojiText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },

  avatarPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
    backgroundColor: 'rgba(15,23,42,0.50)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  avatarPickerCard: {
    maxHeight: '78%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },

  avatarPickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  avatarPickerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  avatarPickerSubtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  avatarPickerClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 10,
  },

  builtInAvatarOption: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  builtInAvatarOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDark,
  },

  avatarSelectedBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  twoCols: {
    flexDirection: 'row',
    gap: 12,
  },

  genderRow: {
    flexDirection: 'row',
  },

  restrictions: {
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 14,
  },

  switchRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  switchLabel: {
    color: colors.text,
    fontWeight: '700',
  },
});
