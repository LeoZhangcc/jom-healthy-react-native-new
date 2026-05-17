import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import ChildAvatar from '../components/ChildAvatar';
import {
  Card,
  Header,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
import FeatureGuideCoachmark from '../components/FeatureGuideCoachmark';

type BackupPayload = {
  backupType: 'JOMHEALTHY_BACKUP';
  appName: 'JomHealthy';
  version: number;
  exportedAt: string;
  data: Record<string, any> | [string, any][];
};

const BACKUP_TYPE = 'JOMHEALTHY_BACKUP';
const BACKUP_VERSION = 1;
const FEATURE_GUIDE_STORAGE_PREFIX = 'JOMHEALTHY_FEATURE_GUIDE_DONE_V1:';

function createBackupFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hour = `${now.getHours()}`.padStart(2, '0');
  const minute = `${now.getMinutes()}`.padStart(2, '0');

  return `JomHealthy_Backup_${year}-${month}-${day}_${hour}-${minute}.json`;
}

function getBackupDirectory() {
  const backupDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

  if (!backupDir) {
    throw new Error('File system directory is not available.');
  }

  return backupDir;
}


function isValidImageUrl(url?: string | null) {
  if (!url) return false;

  const lower = String(url).toLowerCase().trim();

  if (!lower.startsWith('https://') && !lower.startsWith('file://')) {
    return false;
  }

  if (lower.includes('example.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('chicken-rice.jpg')) return false;

  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.startsWith('file://')
  );
}

function guessMealEmoji(name?: string | null, category?: string | null) {
  const text = `${name || ''} ${category || ''}`.toLowerCase();

  if (text.includes('nasi lemak')) return '🍛';
  if (text.includes('fried rice')) return '🍛';
  if (
    text.includes('rice') ||
    text.includes('nasi') ||
    text.includes('biryani') ||
    text.includes('porridge') ||
    text.includes('congee')
  ) {
    return '🍚';
  }
  if (
    text.includes('noodle') ||
    text.includes('mee') ||
    text.includes('laksa') ||
    text.includes('ramen') ||
    text.includes('udon') ||
    text.includes('pasta') ||
    text.includes('spaghetti')
  ) {
    return '🍜';
  }
  if (text.includes('soup') || text.includes('stew') || text.includes('broth')) return '🍲';
  if (text.includes('salad') || text.includes('vegetable') || text.includes('veggie')) return '🥗';
  if (text.includes('sandwich') || text.includes('burger') || text.includes('toast')) return '🥪';
  if (text.includes('bread') || text.includes('roti') || text.includes('bun')) return '🍞';
  if (text.includes('pizza')) return '🍕';
  if (text.includes('taco') || text.includes('wrap')) return '🌮';
  if (text.includes('chicken') || text.includes('ayam')) return '🍗';
  if (text.includes('beef') || text.includes('steak')) return '🥩';
  if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) return '🐟';
  if (text.includes('shrimp') || text.includes('prawn') || text.includes('seafood')) return '🦐';
  if (text.includes('egg') || text.includes('omelette') || text.includes('omelet')) return '🥚';
  if (text.includes('tofu') || text.includes('bean') || text.includes('lentil')) return '🫘';
  if (text.includes('curry')) return '🍛';
  if (text.includes('satay')) return '🍢';
  if (text.includes('sushi')) return '🍣';
  if (text.includes('dumpling')) return '🥟';
  if (text.includes('potato') || text.includes('fries')) return '🥔';
  if (text.includes('corn')) return '🌽';
  if (text.includes('carrot')) return '🥕';
  if (text.includes('broccoli')) return '🥦';
  if (text.includes('tomato')) return '🍅';
  if (text.includes('avocado')) return '🥑';
  if (text.includes('banana')) return '🍌';
  if (text.includes('apple')) return '🍎';
  if (text.includes('orange')) return '🍊';
  if (text.includes('mango')) return '🥭';
  if (text.includes('strawberry') || text.includes('berry')) return '🍓';
  if (text.includes('fruit')) return '🍎';
  if (text.includes('yogurt') || text.includes('oat') || text.includes('cereal') || text.includes('granola')) return '🥣';
  if (text.includes('milk') || text.includes('smoothie')) return '🥛';
  if (text.includes('juice')) return '🧃';
  if (text.includes('snack') || text.includes('cookie') || text.includes('biscuit')) return '🍪';

  return '🍽️';
}

function getSavedRecipeImageUrl(recipe: any) {
  const possibleUrl =
    recipe?.imageUrl ||
    recipe?.strMealThumb ||
    recipe?.meal?.strMealThumb ||
    recipe?.meal?.imageUrl ||
    '';

  return isValidImageUrl(possibleUrl) ? possibleUrl : null;
}

function getSavedRecipeEmoji(recipe: any) {
  return (
    recipe?.mealIconEmoji ||
    recipe?.meal?.mealIconEmoji ||
    guessMealEmoji(
      recipe?.name || recipe?.strMeal || recipe?.meal?.strMeal,
      recipe?.category || recipe?.strCategory || recipe?.meal?.strCategory
    )
  );
}

function normalizeBackupValue(value: any) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function isPlainObject(value: any) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function entriesFromBackupData(data: any, removeMetadata = false): [string, string][] {
  const metadataKeys = new Set([
    'backupType',
    'appName',
    'version',
    'exportedAt',
    'createdAt',
    'data',
  ]);

  const entries: [string, string][] = [];

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const key = String(item[0] || '').trim();

        if (key.length > 0 && (!removeMetadata || !metadataKeys.has(key))) {
          entries.push([key, normalizeBackupValue(item[1])]);
        }

        return;
      }

      if (isPlainObject(item)) {
        const key = String(item.key || item.name || '').trim();
        const value = item.value ?? item.data;

        if (key.length > 0 && value !== undefined && (!removeMetadata || !metadataKeys.has(key))) {
          entries.push([key, normalizeBackupValue(value)]);
        }
      }
    });

    return entries;
  }

  if (isPlainObject(data)) {
    Object.entries(data).forEach(([key, value]) => {
      const cleanKey = String(key || '').trim();

      if (cleanKey.length === 0) return;
      if (removeMetadata && metadataKeys.has(cleanKey)) return;

      entries.push([cleanKey, normalizeBackupValue(value)]);
    });
  }

  return entries;
}

function extractBackupEntries(payload: any): [string, string][] {
  if (!payload) return [];

  const candidates = [
    payload.data,
    payload.asyncStorageData,
    payload.asyncStorage,
    payload.storageData,
    payload.storage,
    payload.items,
  ];

  for (const candidate of candidates) {
    const entries = entriesFromBackupData(candidate);

    if (entries.length > 0) {
      return entries;
    }
  }

  // Also support importing a raw AsyncStorage JSON object directly.
  return entriesFromBackupData(payload, true);
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { themeName, setThemeName, theme, themes } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const themeGuideRef = useRef<View>(null);
  const childrenGuideRef = useRef<View>(null);
  const backupGuideRef = useRef<View>(null);
  const childProfile = useChildProfile() as any;

  const {
    children = [],
    activeChild,
    savedRecipes = [],
    removeSavedRecipe,
  } = childProfile;

  const [showChildren, setShowChildren] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);


  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const themeOptions = [
    {
      key: 'classic' as const,
      icon: 'leaf-outline' as const,
      title: getText('Classic Green', '经典绿色', 'Hijau Klasik'),
      subtitle: getText('Keep the original JomHealthy look.', '保留现在的 JomHealthy 主题。', 'Kekalkan gaya asal JomHealthy.'),
    },
    {
      key: 'light' as const,
      icon: 'color-palette-outline' as const,
      title: getText('Light Editorial', '浅色圆润', 'Editorial Cerah'),
      subtitle: getText('Soft cards with navy and teal accents.', '浅色卡片搭配深蓝与青绿色点缀。', 'Kad lembut dengan aksen navy dan teal.'),
    },
    {
      key: 'green' as const,
      icon: 'nutrition-outline' as const,
      title: getText('Fresh Green', '清新绿色', 'Hijau Segar'),
      subtitle: getText('Forest-green editorial style inspired by the meal UI.', '参考膳食页的森林绿色编辑风格。', 'Gaya editorial hijau hutan berinspirasikan halaman meal.'),
    },
  ];


  const getChildCountText = () => {
    if (children.length === 0) {
      return getText('No children registered', '还没有注册小孩档案', 'Belum ada profil kanak-kanak');
    }

    if (children.length === 1) {
      return getText('1 child registered', '已注册 1 个小孩', '1 profil kanak-kanak');
    }

    return getText(
      `${children.length} children registered`,
      `已注册 ${children.length} 个小孩`,
      `${children.length} profil kanak-kanak`
    );
  };

  const getGenderText = (gender?: string | null) => {
    if (gender === 'boy') return getText('boy', '男孩', 'lelaki');
    if (gender === 'girl') return getText('girl', '女孩', 'perempuan');
    return getText('child', '小孩', 'anak');
  };

  const getTagText = (tag: string) => {
    const value = String(tag || '').toLowerCase();

    if (value.includes('vegetarian')) return getText('Vegetarian', '素食', 'Vegetarian');
    if (value.includes('halal')) return getText('Halal', '清真', 'Halal');
    if (value.includes('lactose')) return getText('Lactose intolerance', '乳糖不耐受', 'Intoleransi laktosa');
    if (value.includes('seafood')) return getText('No seafood', '不吃海鲜', 'Tiada makanan laut');

    if (value.includes('peanut')) return getText('Peanuts', '花生', 'Kacang tanah');
    if (value.includes('dairy')) return getText('Dairy', '乳制品', 'Tenusu');
    if (value.includes('shellfish')) return getText('Shellfish', '贝类海鲜', 'Kerang-kerangan');
    if (value === 'eggs' || value.includes('egg')) return getText('Eggs', '鸡蛋', 'Telur');
    if (value.includes('soy')) return getText('Soy', '大豆', 'Soya');
    if (value.includes('wheat')) return getText('Wheat', '小麦', 'Gandum');
    if (value.includes('tree nut')) return getText('Tree nuts', '坚果', 'Kacang pokok');

    return tag;
  };

  const getLocalizedRecipeName = (recipe: any) => {
    if (language === 'zh') {
      return recipe?.nameCn || recipe?.strMealCn || recipe?.meal?.strMealCn || recipe?.meal?.nameCn || recipe?.name || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
    }

    if (language === 'ms') {
      return recipe?.nameMs || recipe?.strMealMs || recipe?.meal?.strMealMs || recipe?.meal?.nameMs || recipe?.name || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
    }

    return recipe?.nameEn || recipe?.strMealEn || recipe?.name || recipe?.meal?.strMealEn || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
  };

  const tags = [
    ...(activeChild?.allergies || []),
    ...(activeChild?.restrictions?.vegetarian ? ['Vegetarian'] : []),
    ...(activeChild?.restrictions?.halal ? ['Halal'] : []),
    ...(activeChild?.restrictions?.lactoseIntolerance
      ? ['Lactose intolerance']
      : []),
    ...(activeChild?.restrictions?.noSeafood ? ['No seafood'] : []),
  ];

  const exportAllDataToLocal = async () => {
    if (exportingData) return;

    setExportingData(true);

    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);

      const data: Record<string, string> = {};

      pairs.forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          data[key] = value;
        }
      });

      if (Object.keys(data).length === 0) {
        throw new Error(
          getText(
            'There is no app data to export yet.',
            '当前还没有可以导出的 App 数据。',
            'Belum ada data app untuk dieksport.'
          )
        );
      }

      const payload: BackupPayload = {
        backupType: BACKUP_TYPE,
        appName: 'JomHealthy',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
      };

      const fileName = createBackupFileName();
      const backupText = JSON.stringify(payload, null, 2);

      const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;

      if (Platform.OS === 'android' && StorageAccessFramework) {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permission.granted && permission.directoryUri) {
          const fileUri = await StorageAccessFramework.createFileAsync(
            permission.directoryUri,
            fileName,
            'application/json'
          );

          await FileSystem.writeAsStringAsync(fileUri, backupText, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          Alert.alert(
            getText('Export complete', '导出完成', 'Eksport selesai'),
            getText(
              `Backup saved to your selected folder.\n\n${fileName}`,
              `备份已保存到你选择的文件夹。\n\n${fileName}`,
              `Sandaran telah disimpan ke folder yang dipilih.\n\n${fileName}`
            )
          );

          return;
        }
      }

      const fileUri = `${getBackupDirectory()}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, backupText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          getText('Export complete', '导出完成', 'Eksport selesai'),
          getText(
            `Backup file created.\n\n${fileName}`,
            `备份文件已创建。\n\n${fileName}`,
            `Fail sandaran telah dibuat.\n\n${fileName}`
          )
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: getText(
          'Save JomHealthy backup file',
          '保存 JomHealthy 备份文件',
          'Simpan fail sandaran JomHealthy'
        ),
        UTI: 'public.json',
      });
    } catch (error: any) {
      console.log('Export backup failed:', error);
      Alert.alert(
        getText('Export failed', '导出失败', 'Eksport gagal'),
        error?.message ||
          getText(
            'Unable to export data. Please try again.',
            '无法导出数据，请重试。',
            'Tidak dapat mengeksport data. Cuba lagi.'
          )
      );
    } finally {
      setExportingData(false);
    }
  };

  const importBackupFromFile = async () => {
    if (importingData) return;

    setImportingData(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        throw new Error('No file selected.');
      }

      const backupText = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const payload = JSON.parse(backupText);
      const entries = extractBackupEntries(payload);

      if (entries.length === 0) {
        throw new Error(
          getText(
            'This backup file does not contain any JomHealthy data.',
            '这个备份文件里面没有 JomHealthy 数据。',
            'Fail sandaran ini tidak mengandungi data JomHealthy.'
          )
        );
      }

      await AsyncStorage.multiSet(entries);

      if (typeof childProfile.reloadChildProfileData === 'function') {
        await childProfile.reloadChildProfileData();
      } else if (typeof childProfile.reloadFromStorage === 'function') {
        await childProfile.reloadFromStorage();
      } else if (typeof childProfile.refreshFromStorage === 'function') {
        await childProfile.refreshFromStorage();
      } else if (typeof childProfile.loadFromStorage === 'function') {
        await childProfile.loadFromStorage();
      }

      setShowImportGuide(false);

      Alert.alert(
        getText('Import complete', '导入完成', 'Import selesai'),
        getText(
          `Restored ${entries.length} data item(s) and refreshed the profile.`,
          `已恢复 ${entries.length} 条数据，并已自动刷新档案。`,
          `${entries.length} item data telah dipulihkan dan profil telah dikemas kini.`
        )
      );
    } catch (error: any) {
      console.log('Import backup failed:', error);
      Alert.alert(
        getText('Import failed', '导入失败', 'Import gagal'),
        error?.message ||
          getText(
            'Unable to import data. Please choose a valid backup file.',
            '无法导入数据，请选择有效的备份文件。',
            'Tidak dapat mengimport data. Sila pilih fail sandaran yang sah.'
          )
      );
    } finally {
      setImportingData(false);
    }
  };

  const replayHomeGuide = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const guideKeys = keys.filter((key) =>
        key.startsWith(FEATURE_GUIDE_STORAGE_PREFIX)
      );

      if (guideKeys.length > 0) {
        await AsyncStorage.multiRemove(guideKeys);
      }
    } catch (error) {
      console.log('Reset feature guide state failed:', error);
    } finally {
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: { replayGuideToken: Date.now() },
      });
    }
  };

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('profile')}
          subtitle={t('manageAccount')}
          right={
            <View ref={themeGuideRef} collapsable={false}>
              <Pressable
                style={({ pressed }) => [
                  styles.themeAvatarTrigger,
                  pressed && styles.themeAvatarTriggerPressed,
                ]}
                onPress={() => setShowThemePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={getText('Choose app theme', '选择应用主题', 'Pilih tema aplikasi')}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={25}
                  color={theme.colors.primaryDark}
                />
              </Pressable>
            </View>
          }
        />

        <View style={styles.body}>
          <Card>
            <View style={styles.profileRow}>
              <ChildAvatar
                avatar={activeChild?.avatar || '👶'}
                avatarImageUri={activeChild?.avatarImageUri}
                size={58}
                style={styles.profileAvatar}
              />

              <View style={styles.profileInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {activeChild?.nickname || getText('No Child Selected', '未选择小孩', 'Tiada Anak Dipilih')}
                </Text>

                <Text style={styles.meta}>
                  {getChildCountText()}
                </Text>

                {activeChild && (
                  <Text style={styles.meta}>
                    {activeChild.age} {getText('years', '岁', 'tahun')} · {getGenderText(activeChild.gender)} · {activeChild.height}{getText('cm', '厘米', ' sentimeter')} ·{' '}
                    {activeChild.weight}{getText('kg', '公斤', ' kilogram')}
                  </Text>
                )}
              </View>

            </View>

            <View
              ref={childrenGuideRef}
              collapsable={false}
              style={styles.manageChildrenGuideTarget}
            >
              <PrimaryButton
                title={t('manageChildren')}
                icon="settings"
                onPress={() => setShowChildren(true)}
              />
            </View>
          </Card>
          {activeChild && tags.length > 0 && (
            <Card>
              <Text style={styles.sectionHeading}>
                {getText('Preferences & Restrictions', '偏好与限制', 'Pilihan & Sekatan')}
              </Text>

              <View style={styles.tags}>
                {tags.map((tag: string) => (
                  <Text key={getTagText(tag)} style={styles.tag}>
                    {getTagText(tag)}
                  </Text>
                ))}
              </View>
            </Card>
          )}

          <View ref={backupGuideRef} collapsable={false}>
            <Card>
              <Pressable
                style={styles.settingRow}
              onPress={exportAllDataToLocal}
              disabled={exportingData}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name={exportingData ? 'hourglass-outline' : 'download'}
                  color={theme.colors.primaryDark}
                  size={18}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{t('exportData')}</Text>
                <Text style={styles.meta}>
                  {getText(
                    'Save JSON backup to phone storage',
                    '保存 JSON 备份到手机本地',
                    'Simpan sandaran JSON ke storan telefon'
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                color={theme.colors.muted}
                size={18}
              />
            </Pressable>

            <Pressable
              style={styles.settingRow}
              onPress={() => setShowImportGuide(true)}
              disabled={importingData}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name={importingData ? 'hourglass-outline' : 'cloud-upload'}
                  color={theme.colors.primaryDark}
                  size={18}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{t('importData')}</Text>
                <Text style={styles.meta}>
                  {getText(
                    'Choose a backup file from phone storage',
                    '从手机本地选择备份文件',
                    'Pilih fail sandaran daripada storan telefon'
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                color={theme.colors.muted}
                size={18}
              />
            </Pressable>

            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={replayHomeGuide}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name="refresh-circle"
                  color={theme.colors.primaryDark}
                  size={20}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>
                  {getText('Replay beginner guide', '重新查看新手教程', 'Lihat semula panduan pemula')}
                </Text>
                <Text style={styles.meta}>
                  {getText(
                    'Jump to Home and start the walkthrough again',
                    '跳到首页并重新开始引导',
                    'Pergi ke Home dan mula panduan semula'
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                color={theme.colors.muted}
                size={18}
              />
            </Pressable>
            </Card>
          </View>

          <SectionTitle title={getText('Saved Recipes', '收藏食谱', 'Resipi Tersimpan')} />

          {savedRecipes.length === 0 ? (
            <Card style={styles.emptySavedCard}>
              <Text style={styles.emptySavedEmoji}>🔖</Text>
              <Text style={styles.emptySavedTitle}>{getText('No saved recipes yet', '还没有收藏食谱', 'Belum ada resipi disimpan')}</Text>
              <Text style={styles.emptySavedText}>
                {getText('Open a recipe detail page and tap Save to add it here.', '打开食谱详情页，点击收藏即可显示在这里。', 'Buka halaman butiran resipi dan tekan Simpan untuk tambah di sini.')}
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.savedScroll}
              contentContainerStyle={styles.savedScrollContent}
            >
              {savedRecipes.map((recipe: any) => {
                const recipeImageUrl = getSavedRecipeImageUrl(recipe);
                const recipeEmoji = getSavedRecipeEmoji(recipe);

                return (
                  <Pressable
                    key={recipe.id}
                    onPress={() =>
                      recipe.meal &&
                      navigation.navigate('RecipeDetail', { meal: recipe.meal })
                    }
                    style={styles.recipeCard}
                  >
                    {recipeImageUrl ? (
                      <Image
                        source={{ uri: recipeImageUrl }}
                        style={styles.recipeImage}
                      />
                    ) : (
                      <View style={styles.recipePlaceholder}>
                        <Text style={styles.recipePlaceholderEmoji}>
                          {recipeEmoji}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.recipeName} numberOfLines={2}>
                      {getLocalizedRecipeName(recipe)}
                    </Text>

                    <Pressable
                      style={styles.removeSaved}
                      onPress={() => removeSavedRecipe(recipe.id)}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Screen>

      <FeatureGuideCoachmark
        guideKey="profile_core"
        enabled={!showThemePicker && !showImportGuide && !showChildren}
        steps={[
          {
            key: 'theme-switch',
            anchorRef: themeGuideRef,
            icon: 'color-palette-outline',
            placement: 'bottom',
            title: getText('Change the whole app style here', '在这里切换整个 App 风格', 'Tukar gaya keseluruhan aplikasi di sini'),
            description: getText(
              'When you want a different visual mood, open the theme selector from this icon. The chosen style applies across pages.',
              '当你想换一种视觉风格时，点这里打开主题选择。选中的风格会应用到所有页面。',
              'Apabila anda mahu gaya visual berbeza, buka pemilih tema di sini. Tema dipakai pada semua halaman.'
            ),
          },
          {
            key: 'children-management',
            anchorRef: childrenGuideRef,
            icon: 'people-outline',
            placement: 'bottom',
            title: getText('Manage child profiles from one place', '在一个入口管理小孩档案', 'Urus profil anak dari satu tempat'),
            description: getText(
              'Use this button to add, switch or update child profiles. Meal plans and nutrition views follow the active child.',
              '通过这个按钮添加、切换或更新小孩档案。膳食计划和营养展示都会跟随当前小孩。',
              'Gunakan butang ini untuk menambah, menukar atau mengemas kini profil anak. Pelan makanan dan paparan nutrisi mengikut anak aktif.'
            ),
          },
          {
            key: 'local-backup',
            anchorRef: backupGuideRef,
            icon: 'download-outline',
            placement: 'top',
            title: getText('Back up or move local data when needed', '需要时备份或迁移本地数据', 'Sandarkan atau pindahkan data tempatan apabila perlu'),
            description: getText(
              'Export creates a JSON backup on the phone. Import restores it later, which is useful when changing devices or testing.',
              '导出会生成本地 JSON 备份，导入可以之后恢复，适合换设备或测试时使用。',
              'Eksport menghasilkan sandaran JSON tempatan. Import memulihkannya kemudian, sesuai apabila menukar peranti atau menguji.'
            ),
          },
        ]}
      />

      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <Pressable
          style={styles.themePickerOverlay}
          onPress={() => setShowThemePicker(false)}
        >
          <Pressable
            style={styles.themePickerPopover}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.themePickerHeader}>
              <View style={styles.themePickerHeaderIcon}>
                <Ionicons name="color-palette-outline" size={17} color={theme.colors.primaryDark} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.themePickerTitle}>
                  {getText('Choose Theme', '选择主题', 'Pilih Tema')}
                </Text>
                <Text style={styles.themePickerSubtitle}>
                  {getText('Applies to every page.', '会应用到所有页面。', 'Digunakan pada semua halaman.')}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.themePickerClose, pressed && styles.themeAvatarTriggerPressed]}
                onPress={() => setShowThemePicker(false)}
              >
                <Ionicons name="close" size={17} color={theme.colors.muted} />
              </Pressable>
            </View>

            <View style={styles.themePickerList}>
              {themeOptions.map((option) => {
                const optionTheme = themes[option.key];
                const selected = themeName === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.themePickerOption,
                      {
                        backgroundColor: selected ? optionTheme.colors.primaryLight : theme.colors.surfaceAlt,
                        borderColor: selected ? optionTheme.colors.primaryDark : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      setThemeName(option.key);
                      setShowThemePicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.themePickerOptionIcon,
                        { backgroundColor: optionTheme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons name={option.icon} color={optionTheme.colors.primaryDark} size={17} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.themePickerOptionTitle}>{option.title}</Text>
                      <Text style={styles.themePickerOptionSubtitle} numberOfLines={2}>{option.subtitle}</Text>
                    </View>

                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      color={selected ? optionTheme.colors.primaryDark : theme.colors.muted}
                      size={21}
                    />
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showImportGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportGuide(false)}
      >
        <View style={styles.importOverlay}>
          <View style={styles.importModal}>
            <View style={styles.importHeader}>
              <View style={styles.importIconBox}>
                <Ionicons name="document-attach-outline" size={24} color="#22C55E" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>
                  {getText('Import Backup', '导入备份', 'Import Sandaran')}
                </Text>
                <Text style={styles.importSubTitle}>
                  {getText(
                    'Choose the JomHealthy backup JSON file from your phone.',
                    '从手机本地选择 JomHealthy 备份 JSON 文件。',
                    'Pilih fail JSON sandaran JomHealthy daripada telefon anda.'
                  )}
                </Text>
              </View>

              <Pressable
                style={styles.importCloseButton}
                onPress={() => setShowImportGuide(false)}
              >
                <Ionicons name="close" size={18} color={theme.colors.muted} />
              </Pressable>
            </View>

            <View style={styles.importStepBox}>
              <Text style={styles.importStepText}>
                {getText(
                  '1. Tap Choose Backup File.',
                  '1. 点击选择备份文件。',
                  '1. Ketik Pilih Fail Sandaran.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '2. Select the JomHealthy_Backup_xxx.json file.',
                  '2. 选择 JomHealthy_Backup_xxx.json 文件。',
                  '2. Pilih fail JomHealthy_Backup_xxx.json.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '3. After import, the profile will refresh automatically.',
                  '3. 导入后档案会自动刷新。',
                  '3. Selepas import, profil akan dikemas kini secara automatik.'
                )}
              </Text>
            </View>


            <Pressable
              style={styles.chooseFileButton}
              onPress={importBackupFromFile}
              disabled={importingData}
            >
              <Ionicons
                name={importingData ? 'hourglass-outline' : 'document-attach-outline'}
                size={18}
                color={theme.colors.primaryDark}
              />
              <Text style={styles.chooseFileButtonText}>
                {importingData
                  ? getText('Importing...', '导入中...', 'Mengimport...')
                  : getText('Choose Backup File', '选择备份文件', 'Pilih Fail Sandaran')}
              </Text>
            </Pressable>

            <Text style={styles.importNote}>
              {getText(
                'Only JSON backup files exported by JomHealthy can be imported.',
                '只能导入由 JomHealthy 导出的 JSON 备份文件。',
                'Hanya fail sandaran JSON yang dieksport oleh JomHealthy boleh diimport.'
              )}
            </Text>
          </View>
        </View>
      </Modal>

      <ChildrenProfilesModal
        visible={showChildren}
        onClose={() => setShowChildren(false)}
      />

    </>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  body: {
    padding: 20,
    gap: 14,
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

  themeAvatarTrigger: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.5,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  themeAvatarTriggerPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },



  themePickerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 96,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },

  themePickerPopover: {
    width: '94%',
    maxWidth: 380,
    backgroundColor: themeColors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 15,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  themePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  themePickerHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: themeColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themePickerTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  themePickerSubtitle: {
    color: themeColors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  themePickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themePickerList: {
    marginTop: 13,
    gap: 10,
  },

  themePickerOption: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  themePickerOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themePickerOptionTitle: {
    color: themeColors.text,
    fontWeight: '900',
    fontSize: 14,
  },

  themePickerOptionSubtitle: {
    color: themeColors.muted,
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  profileAvatar: {
    borderWidth: 2,
    borderColor: themeColors.border,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  manageChildrenGuideTarget: {
    marginTop: 14,
  },

  name: {
    color: themeColors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  meta: {
    color: themeColors.muted,
    marginTop: 3,
    fontSize: 12,
  },

  sectionHeading: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    color: themeColors.primaryDark,
    backgroundColor: themeColors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 99,
    fontSize: 12,
    fontWeight: '800',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.border,
  },

  settingRowLast: {
    borderBottomWidth: 0,
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: themeColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingTitle: {
    color: themeColors.text,
    fontWeight: '800',
  },

  themeSelectorList: {
    marginTop: 14,
    gap: 12,
  },

  themeOption: {
    minHeight: 80,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  themeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themeOptionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  themeOptionPreviewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  themePreview: {
    width: 46,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themePreviewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  emptySavedCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  emptySavedEmoji: {
    fontSize: 42,
  },

  emptySavedTitle: {
    color: themeColors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },

  emptySavedText: {
    color: themeColors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  savedScroll: {
    marginHorizontal: -20,
  },

  savedScrollContent: {
    paddingHorizontal: 20,
  },

  recipeCard: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  recipeImage: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    backgroundColor: themeColors.bg,
  },

  recipePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    backgroundColor: themeColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipePlaceholderEmoji: {
    fontSize: 42,
  },

  recipeName: {
    color: themeColors.text,
    fontWeight: '800',
    marginTop: 10,
  },

  removeSaved: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'flex-end',
  },

  importModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
  },

  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  importIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importTitle: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  importSubTitle: {
    marginTop: 3,
    color: themeColors.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  importCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importStepBox: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },

  importStepText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  whatsAppButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  chooseFileButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 18,
    backgroundColor: themeColors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  chooseFileButtonText: {
    color: themeColors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },

  importNote: {
    marginTop: 12,
    color: themeColors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
