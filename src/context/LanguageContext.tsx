import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Platform, NativeModules } from 'react-native';

type Language = 'en' | 'zh' | 'ms';

function normalizeLanguageCode(language?: string | null) {
  const text = String(language || 'en').toLowerCase();

  if (text === 'zh' || text === 'cn' || text.startsWith('zh-') || text.includes('chinese')) {
    return 'zh';
  }

  if (text === 'ms' || text === 'my' || text.startsWith('ms-') || text.includes('malay')) {
    return 'ms';
  }

  return 'en';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    appName: 'JomHealthy',
    tagline: "Let's keep your child healthy today ✨",

    // Navigation
    home: 'Home',
    meal: 'Meal',
    shopping: 'Shopping',

    // Home Page
    searchPlaceholder: 'Search food (e.g. Nasi Lemak)',
    updateInfo: 'Update Info',
    checkHealth: "Check Health",
    quickBMI: 'Quick BMI & nutrition check',
    getStarted: 'Get started',
    growthOverview: 'Growth Overview',
    tapToView: 'Tap to view detailed growth chart',
    dailyTip: 'Daily Tip',
    tipMessage: 'Include colorful vegetables in every meal to ensure variety of nutrients.',
    healthInsights: 'Health Insights',
    balancedNutrition: 'Balanced Nutrition',
    balancedNutritionDesc: 'Learn about the 5 essential food groups for growing children',
    hydrationTips: 'Hydration Tips',
    hydrationDesc: 'How much water should your child drink daily?',
    activeLifestyle: 'Active Lifestyle',
    activeDesc: 'Simple activities to keep kids moving and healthy',
    yearsOld: 'years old',
    healthy: 'Healthy',
    lastCheck: 'Last check',
    daysAgo: 'days ago',
    habit: 'Habit',
    sports: 'Sport',
    report: 'Report',
    diet: 'Diet',
    readOriginal: 'Read Original',
    lowactive: 'Low Active',
    active: 'Active',
    activity: 'Activity',
    progress: 'Progress',
    mins: 'mins',

    // Meal Page
    mealPlan: 'Meal Plan',
    searchRecipes: 'Search recipes...',
    exploreRecipes: 'Or explore your own recipes',
    day: 'Day',
    days: 'Days',
    addToList: 'Add to List',
    replace: 'Replace',
    basedOnPreferences: "Based on your child's health condition and preferences",
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',

    // List Page
    shoppingList: 'Shopping List',
    itemsToBuy: 'items to buy',
    vegetables: 'Vegetables',
    protein: 'Protein',
    carbs: 'Carbs',
    nearbySupermarkets: 'Nearby Supermarkets',
    openNow: 'Open now',
    closed: 'Closed',

    // Profile Page
    profile: 'Profile',
    manageAccount: 'Manage your account and settings',
    manageChildren: 'Manage Children Profiles',
    childRegistered: 'child registered',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    importData: 'Import Data',
    notifications: 'Notifications',
    language: 'Language',

    // Language Modal
    selectLanguage: 'Select Language',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: 'Children Profiles',
    addNewChild: 'Add New Child',
    age: 'Age',
    edit: 'Edit',
    delete: 'Delete',

    // Add Child Modal
    addChild: 'Add Child',
    editChildProfile: 'Edit Child Profile',
    avatar: 'Avatar',
    random: 'Random',
    upload: 'Upload',
    nickname: 'Nickname',
    birthday: 'Birthday',
    selectProfile: 'Select Profile',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    gender: 'Gender',
    boy: 'Boy',
    girl: 'Girl',
    foodPreferences: 'Food Preferences',
    likedFoods: 'Liked Foods',
    dislikedFoods: 'Disliked Foods',
    allergies: 'Cannot Eat (Allergies)',
    saveChanges: 'Save Changes',
    deleteProfile: 'Delete Profile?',
    deleteConfirm: 'Are you sure you want to delete this profile? This action cannot be undone.',
    cancel: 'Cancel',

    // Health Check
    checkChildHealth: "Check Child's Health",
    ageYears: 'Age (years)',
    enterAge: 'Enter age',
    enterHeight: 'Enter height in cm',
    enterWeight: 'Enter weight in kg',
    calculateBMI: 'Calculate BMI',
    bmiResult: 'BMI Result',
    underweight: 'Underweight',
    normal: 'Normal',
    overweight: 'Overweight',
    saveRecommendations: 'Save & View Recommendations',
    bmiTip: "BMI calculation helps assess your child's healthy weight range. Consult a healthcare professional for personalized advice.",

    // Growth Page
    growth: 'Growth',
    heightTrend: 'Height Trend',
    weightTrend: 'Weight Trend',
    pastRecords: 'Past Records',
    chartNoData: 'Not enough data to plot chart',
    yourheight: 'Height',
    yourweight: 'Weight',
    yourbmi: 'BMI',
    optimal: 'Optimal',
    riskrange: 'Risk Range',
    yourchildbmi: 'BMI',
    recorded: 'Recorded',
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    manage: 'Manage',
    


    // Physical Activity Page
    logActivity: "Log Activity",
    minutes: "minutes",
    systemAdvice: "System Advice:",
    sysRecommended: "System Recommended",
    watchVideo: "Watch Video",
    tapToLog: "Tap to Log",
    todaysTotal: "Today's Total",
    dailyGoal: "Daily Goal",
    caloriesBurned: "Calories Burned",
    kcal: "kcal",
    logIt: "Log It",
    customizeDailyGoal: "Customize Daily Goal",
    setGoal: "Set Goal",
    min: "min",
    perDay: "/ day",
    logged: "Logged",
    clearAll: "Clear All",
    clearConfirmTitle: "Clear Records",
    clearConfirmMsg: "Are you sure you want to clear today's activity records?",
    generalLogDisclaimer: "Uses average MET for calorie estimation. For better accuracy, log specific activities below.",

    // Home Screen Cards
    hydration: 'Hydration',

    // Hydration Screen
    logHydration: 'Log Hydration',
    searchDrinks: 'Search or analyse drinks...',
    selectDrinkType: 'Select Drink Type',
    todayDrinkBreakdown: "Today's Drink Breakdown",
    hydrationHistory: 'Hydration History',
    needsMoreWater: 'Needs More Water',
    wellHydrated: '✓ Well Hydrated',
    of: 'of',
    completed: 'completed',
    goalAchieved: 'Goal achieved!',
    remaining: 'remaining',
    log: 'Log',
    addToLog: 'Add to Log',
    confirm: 'Confirm',
    stayHydrated: 'Stay Hydrated!',
    water: 'Water',
    milk: 'Milk',
    freshJuice: 'Fresh Juice',
    packagedJuice: 'Packaged Juice',
    other: 'Other',
    bestForHydration: 'Best for hydration',
    goodSourceOfCalcium: 'Good source of calcium',
    naturalHydration: 'Natural hydration',
    highSugarContent: 'High sugar content',
    howMuchDid: 'How much',
    drinkQuestion: 'did your child drink?',
    needsMore: 'needs',
    moreToReach: 'mL more to reach today\'s goal. Keep drinking water!',

    "juice": "Juice",
    "softDrink": "Soft Drink",
    "coffeeTea": "Coffee & Tea",
    "alcohol": "Alcohol",
    "ml": "mL",

    "nutritionalAnalysis": "Nutritional Analysis (per 100g)",
    "energy": "Energy",
    "carbohydrates": "Carbohydrates",
    "sugar": "Sugar",
    "highSugarAlert": "High Sugar Alert",
    "highSugarDescPart1": "This drink contains",
    "highSugarDescPart2": "g of sugar. Frequent consumption may exceed",
    "highSugarDescPart3": "'s recommended daily limits.",
    
  },
  zh: {
    // Header
    appName: 'JomHealthy',
    tagline: '让我们今天保持孩子的健康 ✨',

    // Navigation
    home: '主页',
    meal: '膳食',
    shopping: '购物',

    // Home Page
    searchPlaceholder: '搜索食物（例如椰浆饭）',
    updateInfo: '更新信息',
    checkHealth: '检查孩子的健康',
    quickBMI: '快速BMI和营养检查',
    getStarted: '开始',
    growthOverview: '成长概览',
    tapToView: '点击查看详细成长图表',
    dailyTip: '每日提示',
    tipMessage: '在每餐中加入丰富多彩的蔬菜，确保营养多样化。',
    healthInsights: '健康见解',
    balancedNutrition: '均衡营养',
    balancedNutritionDesc: '了解儿童成长所需的5种基本食物组',
    hydrationTips: '水分补充提示',
    hydrationDesc: '您的孩子每天应该喝多少水？',
    activeLifestyle: '积极生活方式',
    activeDesc: '简单的活动让孩子保持运动和健康',
    yearsOld: '岁',
    healthy: '健康',
    lastCheck: '上次检查',
    daysAgo: '天前',
    habit: '生活习惯',
    sports: '运动指南',
    report: '健康报告',
    diet: '饮食建议',
    readOriginal: '阅读原文',
    lowactive: '低活跃',
    active: '活跃',
    activity: '活动',
    progress: '进度',
    mins: '分钟',
    // Home Screen Cards
    hydration: '水分',

    // Hydration Screen
    logHydration: '记录水分',
    searchDrinks: '搜索或分析饮料...',
    selectDrinkType: '选择饮料种类',
    todayDrinkBreakdown: "今日饮品细分",
    hydrationHistory: '水分记录',
    needsMoreWater: '需要更多水分',
    wellHydrated: '✓ 水分充足',
    of: '/',
    dailyGoal: '每日目标',
    completed: '已完成',
    goalAchieved: '目标已达成！',
    remaining: '剩余',
    log: '记录',
    addToLog: '加入记录',
    confirm: '确认',
    stayHydrated: '保持水分！',
    water: '水',
    milk: '牛奶',
    freshJuice: '鲜果汁',
    packagedJuice: '包装果汁',
    other: '其他',
    bestForHydration: '最适合补充水分',
    goodSourceOfCalcium: '良好的钙来源',
    naturalHydration: '自然补水',
    highSugarContent: '高糖分',
    howMuchDid: '',
    drinkQuestion: '喝了多少？',
    needsMore: '还需要',
    moreToReach: '毫升 才能达到今天的目标。继续喝水吧！',

    "juice": "果汁",
    "softDrink": "汽水",
    "coffeeTea": "咖啡和茶",
    "alcohol": "酒精",
    "ml": "毫升",

    "nutritionalAnalysis": "营养分析 (每100克)",
    "energy": "能量",
    "carbohydrates": "碳水化合物",
    "sugar": "糖分",
    "protein": "蛋白质",
    "highSugarAlert": "高糖警告",
    "highSugarDescPart1": "这款饮料含有",
    "highSugarDescPart2": "克糖。频繁饮用可能超过",
    "highSugarDescPart3": "的每日建议限额。",

    
    // Meal Page
    mealPlan: '膳食计划',
    searchRecipes: '搜索食谱...',
    exploreRecipes: '或探索您自己的食谱',
    day: '天',
    days: '天',
    addToList: '添加到列表',
    replace: '替换',
    basedOnPreferences: '根据您孩子的健康状况和偏好',
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',

    // List Page
    shoppingList: '购物清单',
    itemsToBuy: '项待购买',
    vegetables: '蔬菜',
    carbs: '碳水化合物',
    nearbySupermarkets: '附近超市',
    openNow: '营业中',
    closed: '已关闭',

    // Profile Page
    profile: '个人资料',
    manageAccount: '管理您的账户和设置',
    manageChildren: '管理儿童资料',
    childRegistered: '个孩子已注册',
    dataManagement: '数据管理',
    exportData: '导出数据',
    importData: '导入数据',
    notifications: '通知',
    language: '语言',

    // Language Modal
    selectLanguage: '选择语言',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: '儿童资料',
    addNewChild: '添加新孩子',
    age: '年龄',
    edit: '编辑',
    delete: '删除',

    // Add Child Modal
    addChild: '添加孩子',
    editChildProfile: '编辑儿童资料',
    selectProfile: '选择档案',
    avatar: '头像',
    random: '随机',
    upload: '上传',
    nickname: '昵称',
    birthday: '生日',
    height: '身高（厘米）',
    weight: '体重（公斤）',
    gender: '性别',
    boy: '男孩',
    girl: '女孩',
    foodPreferences: '食物偏好',
    likedFoods: '喜欢的食物',
    dislikedFoods: '不喜欢的食物',
    allergies: '不能吃（过敏）',
    saveChanges: '保存更改',
    deleteProfile: '删除资料？',
    deleteConfirm: '您确定要删除此资料吗？此操作无法撤消。',
    cancel: '取消',

    // Health Check
    checkChildHealth: '检查孩子的健康',
    ageYears: '年龄（岁）',
    enterAge: '输入年龄',
    enterHeight: '输入身高（厘米）',
    enterWeight: '输入体重（公斤）',
    calculateBMI: '计算BMI',
    bmiResult: 'BMI结果',
    underweight: '体重不足',
    normal: '正常',
    overweight: '超重',
    saveRecommendations: '保存并查看建议',
    bmiTip: 'BMI计算有助于评估您孩子的健康体重范围。请咨询医疗专业人员以获得个性化建议。',

    // Growth Page
    growth: '成长',
    heightTrend: '身高趋势',
    weightTrend: '体重趋势',
    pastRecords: '过去记录',
    chartNoData: '图表数据不足',
    yourheight: '身高',
    yourweight: '体重',
    yourbmi: 'BMI',
    optimal: '最佳',
    riskrange: '风险范围',
    yourchildbmi: 'BMI',
    recorded: '记录',
    january: '一月',
    february: '二月',
    march: '三月',
    april: '四月',
    may: '五月',
    june: '六月',
    july: '七月',
    august: '八月',
    september: '九月',
    october: '十月',
    november: '十一月',
    december: '十二月',
    manage: '管理',

    // Physical Activity Page
    logActivity: "记录活动",
    minutes: "分钟",
    systemAdvice: "系统建议：",
    sysRecommended: "系统推荐",
    watchVideo: "观看视频",
    tapToLog: "点击记录",
    todaysTotal: "今日总计",
    caloriesBurned: "燃烧的卡路里",
    kcal: "千卡",
    logIt: "记录",
    customizeDailyGoal: "自定义每日目标",
    setGoal: "设定目标",
    min: "分钟",
    perDay: "/ 天",
    logged: "已记录",
    clearAll: "清除所有",
    clearConfirmTitle: "清除记录",
    clearConfirmMsg: "您确定要清除今天的活动记录吗？",
    generalLogDisclaimer: "使用平均MET进行卡路里估算。为了更准确，请记录具体活动。"

  },
  ms: {
    // Header
    appName: 'JomHealthy',
    tagline: 'Mari kekalkan kesihatan anak anda hari ini ✨',

    // Navigation
    home: 'Utama',
    meal: 'Makanan',
    shopping: 'Beli-belah',

    // Home Page
    searchPlaceholder: 'Cari makanan (cth. Nasi Lemak)',
    updateInfo: 'Kemas Kini Maklumat',
    checkHealth: 'Periksa Kesihatan Anak',
    quickBMI: 'Pemeriksaan BMI & pemakanan pantas',
    getStarted: 'Mulakan',
    growthOverview: 'Gambaran Pertumbuhan',
    tapToView: 'Ketik untuk lihat carta pertumbuhan terperinci',
    dailyTip: 'Petua Harian',
    tipMessage: 'Sertakan sayur-sayuran berwarna-warni dalam setiap hidangan untuk memastikan pelbagai nutrien.',
    healthInsights: 'Pandangan Kesihatan',
    balancedNutrition: 'Pemakanan Seimbang',
    balancedNutritionDesc: 'Ketahui tentang 5 kumpulan makanan penting untuk kanak-kanak yang sedang membesar',
    hydrationTips: 'Petua Hidrasi',
    hydrationDesc: 'Berapa banyak air yang perlu diminum oleh anak anda setiap hari?',
    activeLifestyle: 'Gaya Hidup Aktif',
    activeDesc: 'Aktiviti mudah untuk mengekalkan kanak-kanak bergerak dan sihat',
    yearsOld: 'tahun',
    healthy: 'Sihat',
    lastCheck: 'Pemeriksaan terakhir',
    daysAgo: 'hari lalu',
    habit: 'Kebiasaan',
    sports: 'Olahraga',
    report: 'Laporan',
    diet: 'Diet',
    readOriginal: 'Baca Asal',
    lowactive: 'Kurang Aktif',
    active: 'Aktif',
    activity: 'Aktiviti',
    progress: 'Progress',
    mins: 'mins',
    // Home Screen Cards
    hydration: 'Hidrasi',

    // Hydration Screen
    logHydration: 'Rekod Hidrasi',
    searchDrinks: 'Cari atau analisis minuman...',
    selectDrinkType: 'Pilih Jenis Minuman',
    todayDrinkBreakdown: "Pecahan Minuman Hari Ini",
    hydrationHistory: 'Sejarah Hidrasi',
    needsMoreWater: 'Perlu Lebih Air',
    wellHydrated: '✓ Hidrasi Baik',
    of: 'daripada',
    dailyGoal: 'sasaran harian',
    completed: 'selesai',
    goalAchieved: 'Sasaran dicapai!',
    remaining: 'baki',
    log: 'Rekod',
    addToLog: 'Tambah ke Rekod',
    confirm: 'Sahkan',
    stayHydrated: 'Kekal Hidrasi!',
    water: 'Air',
    milk: 'Susu',
    freshJuice: 'Jus Segar',
    packagedJuice: 'Jus Kotak',
    other: 'Lain-lain',
    bestForHydration: 'Terbaik untuk hidrasi',
    goodSourceOfCalcium: 'Sumber kalsium yang baik',
    naturalHydration: 'Hidrasi semula jadi',
    highSugarContent: 'Kandungan gula tinggi',
    howMuchDid: 'Berapa banyak',
    drinkQuestion: 'yang diminum oleh anak anda?',
    needsMore: 'perlu',
    moreToReach: 'mL lagi untuk mencapai sasaran hari ini. Terus minum air!',

    "nutritionalAnalysis": "Analisis Nutrisi (setiap 100g)",
    "energy": "Tenaga",
    "carbohydrates": "Karbohidrat",
    "sugar": "Gula",
    "protein": "Protein",
    "highSugarAlert": "Amaran Gula Tinggi",
    "highSugarDescPart1": "Minuman ini mengandungi",
    "highSugarDescPart2": "g gula. Pengambilan yang kerap mungkin melebihi had harian yang disyorkan untuk",
    "highSugarDescPart3": ".",

    "juice": "Jus",
    "softDrink": "Minuman Ringan",
    "coffeeTea": "Kopi & Teh",
    "alcohol": "Alkohol",
    "ml": "mL",

    // Meal Page
    mealPlan: 'Rancangan Makanan',
    searchRecipes: 'Cari resipi...',
    exploreRecipes: 'Atau terokai resipi anda sendiri',
    day: 'Hari',
    days: 'Hari',
    addToList: 'Tambah ke Senarai',
    replace: 'Ganti',
    basedOnPreferences: 'Berdasarkan keadaan kesihatan dan pilihan anak anda',
    breakfast: 'Sarapan',
    lunch: 'Makan Tengah Hari',
    dinner: 'Makan Malam',

    // List Page
    shoppingList: 'Senarai Belian',
    itemsToBuy: 'barang untuk dibeli',
    vegetables: 'Sayur-sayuran',
    carbs: 'Karbohidrat',
    nearbySupermarkets: 'Pasar Raya Berdekatan',
    openNow: 'Buka sekarang',
    closed: 'Tutup',

    // Profile Page
    profile: 'Profil',
    manageAccount: 'Urus akaun dan tetapan anda',
    manageChildren: 'Urus Profil Kanak-kanak',
    childRegistered: 'kanak-kanak didaftarkan',
    dataManagement: 'Pengurusan Data',
    exportData: 'Eksport Data',
    importData: 'Import Data',
    notifications: 'Pemberitahuan',
    language: 'Bahasa',

    // Language Modal
    selectLanguage: 'Pilih Bahasa',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: 'Profil Kanak-kanak',
    addNewChild: 'Tambah Kanak-kanak Baru',
    age: 'Umur',
    edit: 'Edit',
    delete: 'Padam',

    // Add Child Modal
    addChild: 'Tambah Kanak-kanak',
    editChildProfile: 'Edit Profil Kanak-kanak',
    avatar: 'Avatar',
    random: 'Rawak',
    upload: 'Muat Naik',
    nickname: 'Nama Panggilan',
    birthday: 'Hari Lahir',
    selectProfile: 'Pilih Profil',
    height: 'Tinggi (cm)',
    weight: 'Berat (kg)',
    gender: 'Jantina',
    boy: 'Lelaki',
    girl: 'Perempuan',
    foodPreferences: 'Keutamaan Makanan',
    likedFoods: 'Makanan yang Disukai',
    dislikedFoods: 'Makanan yang Tidak Disukai',
    allergies: 'Tidak Boleh Makan (Alahan)',
    saveChanges: 'Simpan Perubahan',
    deleteProfile: 'Padam Profil?',
    deleteConfirm: 'Adakah anda pasti mahu memadamkan profil ini? Tindakan ini tidak boleh dibuat asal.',
    cancel: 'Batal',

    // Health Check
    checkChildHealth: 'Periksa Kesihatan Anak',
    ageYears: 'Umur (tahun)',
    enterAge: 'Masukkan umur',
    enterHeight: 'Masukkan tinggi dalam cm',
    enterWeight: 'Masukkan berat dalam kg',
    calculateBMI: 'Kira BMI',
    bmiResult: 'Keputusan BMI',
    underweight: 'Kurang Berat',
    normal: 'Normal',
    overweight: 'Berat Berlebihan',
    saveRecommendations: 'Simpan & Lihat Cadangan',
    bmiTip: 'Pengiraan BMI membantu menilai julat berat sihat anak anda. Rujuk profesional penjagaan kesihatan untuk nasihat yang diperibadikan.',

    // Growth Page
    growth: 'Pertumbuhan',
    heightTrend: 'Trend Tinggi',
    weightTrend: 'Trend Berat',
    pastRecords: 'Rekod Lepas',
    chartNoData: 'Data tidak mencukupi untuk memaparkan carta',
    yourheight: 'Tinggi Anda',
    yourweight: 'Berat Anda',
    yourbmi: 'BMI Anda',
    optimal: 'Optimal',
    riskrange: 'Julat Risiko',
    yourchildbmi: 'BMI',
    recorded: 'Direkod',
    january: 'Januari',
    february: 'Februari',
    march: 'Mac',
    april: 'April',
    may: 'Mei',
    june: 'Jun',
    july: 'Julai',
    august: 'Ogos',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'Disember',
    manage: 'Urus',

    // Physical Activity Page
    logActivity: "Log Aktiviti",
    minutes: "minit",
    systemAdvice: "Nasihat Sistem:",
    sysRecommended: "Disyorkan Sistem",
    watchVideo: "Tonton Video",
    tapToLog: "Ketik untuk Log",
    todaysTotal: "Jumlah Hari Ini",
    caloriesBurned: "Kalori Terbakar",
    kcal: "kcal",
    logIt: "Log",
    customizeDailyGoal: "Sesuaikan Tujuan Harian",
    setGoal: "Tetapkan Tujuan",
    min: "min",
    perDay: "/ hari",
    logged: "Tercatat",
    clearAll: "Hapus Semua",
    clearConfirmTitle: "Hapus Rekod",
    clearConfirmMsg: "Apakah Anda yakin ingin menghapus semua rekod aktivitas hari ini?",
    generalLogDisclaimer: "Menggunakan MET rata-rata untuk estimasi kalori. Untuk akurasi lebih baik, catat aktivitas spesifik di bawah."
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'JOMHEALTHY_APP_LANGUAGE_V1';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && mounted) {
          const normalizedSaved = normalizeLanguageCode(saved);
          setLanguageState(normalizedSaved as Language);
          return;
        }

        // Use expo-localization securely since it's installed
        try {
          const locales = Localization.getLocales();
          if (locales && locales.length > 0) {
            const code = normalizeLanguageCode(locales[0].languageCode);
            if (mounted) setLanguageState(code as Language);
            return;
          }
        } catch (e) {
          if (__DEV__) console.log('expo-localization getLocales failed:', e);
        }

        // Fallback: React Native NativeModules Platform check
        try {
          let systemLocale = null;
          if (Platform.OS === 'ios') {
            systemLocale =
              NativeModules.SettingsManager?.settings?.AppleLocale ||
              NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
          } else if (Platform.OS === 'android') {
            systemLocale = NativeModules.I18nManager?.localeIdentifier;
          }

          if (systemLocale) {
            const code = normalizeLanguageCode(systemLocale);
            if (mounted) setLanguageState(code as Language);
            return;
          }
        } catch (e) {
          /* ignore */
        }

        // Fallback: Intl
        try {
          const intlLocale = (Intl as any)?.DateTimeFormat?.()?.resolvedOptions?.()?.locale;
          if (intlLocale) {
            const code = normalizeLanguageCode(String(intlLocale));
            if (mounted) setLanguageState(code as Language);
            return;
          }
        } catch (e) {
          /* ignore */
        }

        if (__DEV__) console.log('No device locale detected; using default language');
      } catch (e) {
        // ignore and keep default
        console.log('Language detect failed:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => {});
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}