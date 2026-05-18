import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, Header, Screen } from '../components/Common';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type NoticeSection = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export default function PrivacySafetyScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const sections: NoticeSection[] = [
    {
      key: 'health-disclaimer',
      icon: 'medkit-outline',
      title: getText('Health Disclaimer', '健康免责声明', 'Penafian Kesihatan'),
      body: getText(
        'JomHealthy provides general nutrition and meal-planning guidance only. It is not a medical diagnosis, treatment, or professional dietary consultation service. If a child has medical conditions, allergies, growth concerns, or special dietary needs, parents or guardians should consult a qualified healthcare professional or dietitian.',
        'JomHealthy 仅提供一般性的营养与膳食规划辅助信息，不构成医疗诊断、治疗建议或专业营养咨询。如果儿童存在疾病、过敏、成长发育疑虑或特殊饮食需求，家长或监护人应咨询合格医生或注册营养师。',
        'JomHealthy hanya menyediakan panduan umum berkaitan pemakanan dan perancangan makanan. Ia bukan perkhidmatan diagnosis perubatan, rawatan, atau konsultasi diet profesional. Jika kanak-kanak mempunyai keadaan kesihatan, alahan, kebimbangan pertumbuhan, atau keperluan diet khas, ibu bapa atau penjaga harus mendapatkan nasihat daripada profesional kesihatan atau pakar diet yang berkelayakan.'
      ),
    },
    {
      key: 'ai-review',
      icon: 'sparkles-outline',
      title: getText('AI Meal Plan Notice', 'AI 餐单说明', 'Notis Pelan Makanan AI'),
      body: getText(
        'AI-generated meal plans are suggestions created from user inputs and system rules. They may not always be fully suitable for every child. Users should review ingredients, allergens, portion sizes, and dietary restrictions before use.',
        'AI 生成的餐单是基于用户输入和系统规则产生的建议，不一定完全适合每一位儿童。使用前请检查食材、过敏原、份量以及饮食限制。',
        'Pelan makanan yang dijana oleh AI ialah cadangan berdasarkan input pengguna dan peraturan sistem. Ia mungkin tidak sentiasa sesuai sepenuhnya untuk setiap kanak-kanak. Pengguna perlu menyemak bahan, alergen, saiz hidangan dan sekatan diet sebelum digunakan.'
      ),
    },
    {
      key: 'local-storage',
      icon: 'phone-portrait-outline',
      title: getText('Child Data & Local Storage', '儿童数据与本地存储', 'Data Kanak-kanak & Storan Setempat'),
      body: getText(
        'Child profiles, saved recipes, shopping lists, and local app preferences are managed in device storage. When a feature requires nutrition calculation, AI meal-plan generation, food search, or map support, the app sends only the information needed for that request to the relevant service.',
        '儿童档案、已保存食谱、购物清单和本地偏好设置由设备本地存储管理。当营养计算、AI 餐单生成、食物搜索或地图功能需要处理请求时，App 只会向相应服务发送该功能所需的信息。',
        'Profil kanak-kanak, resipi tersimpan, senarai beli-belah dan tetapan aplikasi diuruskan dalam storan peranti. Apabila ciri memerlukan pengiraan nutrisi, penjanaan pelan makanan AI, carian makanan atau sokongan peta, aplikasi hanya menghantar maklumat yang diperlukan untuk permintaan tersebut kepada perkhidmatan berkaitan.'
      ),
    },
    {
      key: 'location',
      icon: 'location-outline',
      title: getText('Location Permission', '定位权限说明', 'Kebenaran Lokasi'),
      body: getText(
        'Location access is requested only when the user chooses to find nearby supermarkets. The location is used to search for relevant nearby stores and display map results.',
        '只有当用户主动选择“查找附近超市”时，App 才会请求定位权限。定位信息仅用于搜索附近商店并展示地图结果。',
        'Akses lokasi hanya diminta apabila pengguna memilih untuk mencari pasar raya berdekatan. Lokasi digunakan untuk mencari kedai berhampiran dan memaparkan hasil pada peta.'
      ),
    },
    {
      key: 'backup',
      icon: 'document-text-outline',
      title: getText('Export & Import Responsibility', '导出与导入责任提示', 'Tanggungjawab Eksport & Import'),
      body: getText(
        'Exported backup files are controlled by the user after they leave the app. Users should store and share these files carefully, especially if they contain child profile information.',
        '导出的备份文件一旦离开 App，将由用户自行管理。如果文件包含儿童档案信息，请谨慎保存和分享。',
        'Fail sandaran yang dieksport berada di bawah kawalan pengguna selepas keluar daripada aplikasi. Pengguna harus menyimpan dan berkongsi fail tersebut dengan berhati-hati, terutamanya jika ia mengandungi maklumat profil kanak-kanak.'
      ),
    },
    {
      key: 'external-services',
      icon: 'cloud-outline',
      title: getText('External Services & Data Sources', '外部服务与数据来源', 'Perkhidmatan Luaran & Sumber Data'),
      body: getText(
        'Some features rely on external data sources and services, such as food databases, recipe data, AI generation services, and map/location services. Availability, accuracy, and returned content may depend on those third-party services.',
        '部分功能依赖外部数据源和服务，例如食物数据库、食谱数据、AI 生成服务以及地图与定位服务。这些服务的可用性、准确性和返回内容可能会受到第三方服务影响。',
        'Sesetengah fungsi bergantung pada sumber data dan perkhidmatan luaran, seperti pangkalan data makanan, data resipi, perkhidmatan penjanaan AI, serta perkhidmatan peta dan lokasi. Ketersediaan, ketepatan dan kandungan yang dipulangkan mungkin bergantung pada perkhidmatan pihak ketiga tersebut.'
      ),
    },
  ];

  return (
    <Screen padded={false}>
      <Header
        title={getText('Privacy, Safety & Responsible Use', '隐私、安全与责任使用', 'Privasi, Keselamatan & Penggunaan Bertanggungjawab')}
        subtitle={getText('Know the product boundaries before use.', '使用前了解产品边界。', 'Fahami batasan produk sebelum digunakan.')}
        onBack={() => navigation.goBack()}
        icon="shield-checkmark-outline"
      />

      <View style={styles.body}>
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>
                {getText('Responsible nutrition support', '负责任的营养支持', 'Sokongan nutrisi yang bertanggungjawab')}
              </Text>
              <Text style={styles.heroSubtitle}>
                {getText(
                  'This page explains health guidance limits, AI review reminders, data handling, permissions, backups and third-party dependencies.',
                  '本页说明健康建议边界、AI 内容复核、数据处理、权限、备份与第三方服务依赖。',
                  'Halaman ini menerangkan had panduan kesihatan, semakan AI, pengendalian data, kebenaran, sandaran dan pergantungan perkhidmatan pihak ketiga.'
                )}
              </Text>
            </View>
          </View>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Ionicons name="heart-outline" size={13} color={theme.colors.primaryDark} />
              <Text style={styles.heroChipText}>{getText('Health guidance', '健康边界', 'Panduan kesihatan')}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="sparkles-outline" size={13} color={theme.colors.primaryDark} />
              <Text style={styles.heroChipText}>{getText('AI review', 'AI 复核', 'Semakan AI')}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="lock-closed-outline" size={13} color={theme.colors.primaryDark} />
              <Text style={styles.heroChipText}>{getText('Data care', '数据谨慎', 'Penjagaan data')}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.sectionList}>
          {sections.map((section) => (
            <Card key={section.key} style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name={section.icon} size={19} color={theme.colors.primaryDark} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function createStyles(themeColors: any) {
  return StyleSheet.create({
    body: {
      padding: 20,
      paddingBottom: 42,
      gap: 14,
    },
    heroCard: {
      borderRadius: 26,
      padding: 18,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      backgroundColor: themeColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    heroTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    heroTitle: {
      color: themeColors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '900',
    },
    heroSubtitle: {
      marginTop: 5,
      color: themeColors.muted,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
    },
    heroChipRow: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    heroChip: {
      minHeight: 30,
      borderRadius: 999,
      backgroundColor: themeColors.primaryLight,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    heroChipText: {
      color: themeColors.primaryDark,
      fontSize: 11,
      fontWeight: '900',
    },
    sectionList: {
      gap: 12,
    },
    sectionCard: {
      borderRadius: 24,
      padding: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: themeColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sectionTitle: {
      flex: 1,
      minWidth: 0,
      color: themeColors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '900',
    },
    sectionBody: {
      marginTop: 11,
      color: themeColors.muted,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: '600',
    },
  });
}
