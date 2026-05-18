import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { searchMeals } from '../services/api';
import { useChildProfile } from '../context/ChildProfileContext';
import { useAiMealPlanGeneration } from '../context/AiMealPlanGenerationContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import FeatureGuideCoachmark, { FeatureGuideStep } from '../components/FeatureGuideCoachmark';

type Ingredient = {
  ingredientId?: number;
  mealId?: string;
  ingredientOrder?: number;
  ingredientName?: string;
  measure?: string;
  normalizedName?: string;
  gramsEstimated?: number;
  foodNameEn?: string;
  foodNameCn?: string;
  foodNameMs?: string;
  foodGroup?: string;
  energyKcal?: number;
  proteinG?: number;
  carbohydrateG?: number;
  fatG?: number;
  picUrl?: string;
};

type MealRecipe = {
  id?: number;
  idMeal: string;
  strMeal: string;
  strMealEn?: string | null;
  strMealCn?: string | null;
  strMealCN?: string | null;
  strMealZh?: string | null;
  strMealMs?: string | null;
  nameEn?: string | null;
  nameCn?: string | null;
  nameCN?: string | null;
  nameZh?: string | null;
  nameMs?: string | null;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strCategoryEn?: string | null;
  strCategoryCn?: string | null;
  strCategoryCN?: string | null;
  strCategoryZh?: string | null;
  strCategoryMs?: string | null;
  categoryEn?: string | null;
  categoryCn?: string | null;
  categoryCN?: string | null;
  categoryZh?: string | null;
  categoryMs?: string | null;
  strArea?: string | null;
  strAreaEn?: string | null;
  strAreaCn?: string | null;
  strAreaCN?: string | null;
  strAreaZh?: string | null;
  strAreaMs?: string | null;
  areaEn?: string | null;
  areaCn?: string | null;
  areaCN?: string | null;
  areaZh?: string | null;
  areaMs?: string | null;
  strInstructions?: string | null;
  strInstructionsEn?: string | null;
  strInstructionsCn?: string | null;
  strInstructionsCN?: string | null;
  strInstructionsZh?: string | null;
  strInstructionsMs?: string | null;
  instructionsEn?: string | null;
  instructionsCn?: string | null;
  instructionsCN?: string | null;
  instructionsZh?: string | null;
  instructionsMs?: string | null;
  strMealThumb?: string | null;
  mealIconEmoji?: string | null;
  mealIconName?: string | null;
  mealIconPrompt?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  totalEnergyKcal?: number;
  totalProteinG?: number;
  totalCarbohydrateG?: number;
  totalFatG?: number;
  ingredients?: Ingredient[];
  [key: string]: any;
};

type MealSlotKey = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealPlanForDay = Partial<Record<MealSlotKey, MealRecipe[]>>;
type ShoppingCategory = 'vegetables' | 'protein' | 'carbs' | 'others';

type ShoppingItem = {
  id: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  nameMs?: string;
  quantity: string;
  quantityCn?: string;
  quantityMs?: string;
  category: ShoppingCategory;
  source: string;
  sourceEn?: string;
  sourceCn?: string;
  sourceMs?: string;
  mealId: string;
  checked: boolean;
  picUrl?: string;
};

type CalendarNutritionStatus = 'tooMuch' | 'good' | 'tooLittle' | 'none';

const MEAL_PLANS_STORAGE_KEY = 'JOMHEALTHY_MEAL_PLANS_BY_OWNER_V1';
const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';
const SLOT_ORDER: MealSlotKey[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TARGETS = {
  carbs: 155,
  protein: 32,
  fat: 28,
};

const STATUS_COLORS: Record<CalendarNutritionStatus, string> = {
  tooMuch: '#FF6B6B',
  good: '#18C37E',
  tooLittle: '#FACC15',
  none: '#E5E7EB',
};

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value?: number) {
  return Math.round(safeNumber(value));
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = String(dateKey).split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const mondayBasedOffset = (day + 6) % 7;
  return addDays(date, -mondayBasedOffset);
}

function getScrollableDateStripDays(weekStartDate: Date) {
  return Array.from({ length: 21 }).map((_, index) => addDays(weekStartDate, index - 7));
}

function getCenteredSevenDays(selectedDate: Date) {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDays(selectedDate, offset));
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayBasedWeekDay = (firstDay.getDay() + 6) % 7;
  const startDate = addDays(firstDay, -mondayBasedWeekDay);
  return Array.from({ length: 42 }).map((_, index) => addDays(startDate, index));
}

function getMealPlanTotals(dayPlan: MealPlanForDay) {
  const meals = SLOT_ORDER.flatMap((slot) => dayPlan[slot] || []);

  return meals.reduce(
    (acc, meal) => {
      acc.carbs += safeNumber(meal.totalCarbohydrateG);
      acc.protein += safeNumber(meal.totalProteinG);
      acc.fat += safeNumber(meal.totalFatG);
      acc.calories += safeNumber(meal.totalEnergyKcal);
      acc.count += 1;
      return acc;
    },
    { carbs: 0, protein: 0, fat: 0, calories: 0, count: 0 }
  );
}

function getCalendarStatus(
  dayPlan: MealPlanForDay | undefined,
  targets: { carbs: number; protein: number; fat: number }
): { status: CalendarNutritionStatus; progress: number } {
  if (!dayPlan) return { status: 'none', progress: 0 };

  const totals = getMealPlanTotals(dayPlan);
  if (totals.count === 0) return { status: 'none', progress: 0 };

  const carbRatio = totals.carbs / Math.max(targets.carbs, 1);
  const proteinRatio = totals.protein / Math.max(targets.protein, 1);
  const fatRatio = totals.fat / Math.max(targets.fat, 1);
  const averageRatio = (carbRatio + proteinRatio + fatRatio) / 3;

  if (averageRatio > 1.15) return { status: 'tooMuch', progress: Math.min(averageRatio, 1) };
  if (averageRatio < 0.75) return { status: 'tooLittle', progress: Math.max(averageRatio, 0.18) };
  return { status: 'good', progress: Math.min(averageRatio, 1) };
}

function normalizeIngredientName(item: any) {
  return String(item.foodNameEn || item.ingredientName || item.normalizedName || 'Ingredient').trim();
}

function normalizeIngredientQuantity(item: any) {
  if (item.measure) return String(item.measure);
  if (item.gramsEstimated !== undefined && item.gramsEstimated !== null) return `${item.gramsEstimated}g`;
  return '';
}

function localizeMeasureText(value?: string | null, language = 'en') {
  const raw = String(value || '').trim();
  if (!raw || language === 'en') return raw;

  const unitLabels: Record<string, Record<string, string>> = {
    zh: {
      g: '克',
      gram: '克',
      grams: '克',
      kg: '公斤',
      kilogram: '公斤',
      kilograms: '公斤',
      ml: '毫升',
      milliliter: '毫升',
      milliliters: '毫升',
      millilitre: '毫升',
      millilitres: '毫升',
      l: '升',
      liter: '升',
      liters: '升',
      litre: '升',
      litres: '升',
    },
    ms: {
      g: 'gram',
      gram: 'gram',
      grams: 'gram',
      kg: 'kilogram',
      kilogram: 'kilogram',
      kilograms: 'kilogram',
      ml: 'mL',
      milliliter: 'mL',
      milliliters: 'mL',
      millilitre: 'mL',
      millilitres: 'mL',
      l: 'L',
      liter: 'L',
      liters: 'L',
      litre: 'L',
      litres: 'L',
    },
  };

  return raw.replace(
    /(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|grams?|ml|milliliters?|millilitres?|l|liters?|litres?)\b/gi,
    (_match, amount, unit) => `${amount}${unitLabels[language]?.[String(unit).toLowerCase()] || unit}`
  );
}

function formatGramValue(value?: number, language = 'en') {
  return localizeMeasureText(`${round(value)}g`, language);
}

function getSlotLabel(slot: MealSlotKey, language: string) {
  if (language === 'zh') {
    return slot === 'Breakfast' ? '早餐' : slot === 'Lunch' ? '午餐' : slot === 'Dinner' ? '晚餐' : '加餐';
  }

  if (language === 'ms') {
    return slot === 'Breakfast' ? 'Sarapan' : slot === 'Lunch' ? 'Makan Tengah Hari' : slot === 'Dinner' ? 'Makan Malam' : 'Snek';
  }

  return slot;
}

function classifyIngredientCategory(item: any): ShoppingCategory {
  const name = String(item.foodNameEn || item.ingredientName || item.normalizedName || '').toLowerCase();
  const group = String(item.foodGroup || '').toLowerCase();

  if (
    group.includes('vegetable') ||
    name.includes('vegetable') ||
    name.includes('spinach') ||
    name.includes('lettuce') ||
    name.includes('cucumber') ||
    name.includes('tomato') ||
    name.includes('onion') ||
    name.includes('carrot') ||
    name.includes('broccoli') ||
    name.includes('cabbage')
  ) return 'vegetables';

  if (
    group.includes('meat') ||
    group.includes('fish') ||
    group.includes('seafood') ||
    group.includes('egg') ||
    name.includes('egg') ||
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('fish') ||
    name.includes('tofu') ||
    name.includes('lentil') ||
    name.includes('bean') ||
    name.includes('prawn') ||
    name.includes('shrimp')
  ) return 'protein';

  if (
    group.includes('cereal') ||
    group.includes('grain') ||
    group.includes('fruit') ||
    name.includes('rice') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('noodle') ||
    name.includes('flour') ||
    name.includes('potato') ||
    name.includes('banana') ||
    name.includes('oat')
  ) return 'carbs';

  return 'others';
}

function isValidImageUrl(url?: string | null) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('chicken-rice.jpg')) return false;
  return lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp');
}

function isValidYoutubeUrl(url?: string | null) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example')) return false;
  return lower.includes('youtube.com/watch') || lower.includes('youtu.be/') || lower.includes('youtube.com/results?search_query=');
}

function guessMealEmoji(name?: string | null, category?: string | null) {
  const text = `${name || ''} ${category || ''}`.toLowerCase();

  if (text.includes('nasi lemak')) return '🍛';
  if (text.includes('fried rice')) return '🍛';
  if (text.includes('rice') || text.includes('nasi') || text.includes('biryani') || text.includes('porridge') || text.includes('congee')) return '🍚';
  if (text.includes('noodle') || text.includes('mee') || text.includes('laksa') || text.includes('ramen') || text.includes('udon') || text.includes('pasta') || text.includes('spaghetti')) return '🍜';
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
  if (text.includes('snack')) return '🍪';

  return '🍽️';
}

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

function cleanLocalizedValue(value: any) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return text.length > 0 ? text : '';
}

function pickLocalizedValue(
  language: string,
  enValue?: any,
  cnValue?: any,
  msValue?: any,
  fallback?: any
) {
  const lang = normalizeLanguageCode(language);

  if (lang === 'zh') {
    return cleanLocalizedValue(cnValue) || cleanLocalizedValue(enValue) || cleanLocalizedValue(msValue) || cleanLocalizedValue(fallback);
  }

  if (lang === 'ms') {
    return cleanLocalizedValue(msValue) || cleanLocalizedValue(enValue) || cleanLocalizedValue(cnValue) || cleanLocalizedValue(fallback);
  }

  return cleanLocalizedValue(enValue) || cleanLocalizedValue(fallback) || cleanLocalizedValue(cnValue) || cleanLocalizedValue(msValue);
}

function translateMealName(name: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const text = String(name || '').trim();

  if (!text || lang === 'en') return text;

  const replacements = lang === 'zh'
    ? [
        [/\bfried rice\b/gi, '炒饭'], [/\bchicken rice\b/gi, '鸡饭'], [/\bfried noodle(s)?\b/gi, '炒面'], [/\bnoodle(s)?\b/gi, '面'],
        [/\brice\b/gi, '米饭'], [/\bchicken\b/gi, '鸡肉'], [/\bbeef\b/gi, '牛肉'], [/\bfish\b/gi, '鱼'], [/\begg(s)?\b/gi, '鸡蛋'],
        [/\bvegetable(s)?\b/gi, '蔬菜'], [/\bsoup\b/gi, '汤'], [/\bporridge\b/gi, '粥'], [/\bsalad\b/gi, '沙拉'], [/\bsandwich\b/gi, '三明治'],
        [/\bbread\b/gi, '面包'], [/\bpasta\b/gi, '意面'], [/\bcurry\b/gi, '咖喱'], [/\bgrilled\b/gi, '烤'], [/\bsteamed\b/gi, '蒸'], [/\bbaked\b/gi, '烘烤'], [/\bstir fried\b/gi, '炒'], [/\bhealthy\b/gi, '健康'],
      ]
    : [
        [/\bfried rice\b/gi, 'nasi goreng'], [/\bchicken rice\b/gi, 'nasi ayam'], [/\bfried noodle(s)?\b/gi, 'mi goreng'], [/\bnoodle(s)?\b/gi, 'mi'],
        [/\brice\b/gi, 'nasi'], [/\bchicken\b/gi, 'ayam'], [/\bbeef\b/gi, 'daging lembu'], [/\bfish\b/gi, 'ikan'], [/\begg(s)?\b/gi, 'telur'],
        [/\bvegetable(s)?\b/gi, 'sayur-sayuran'], [/\bsoup\b/gi, 'sup'], [/\bporridge\b/gi, 'bubur'], [/\bsalad\b/gi, 'salad'], [/\bsandwich\b/gi, 'sandwic'],
        [/\bbread\b/gi, 'roti'], [/\bpasta\b/gi, 'pasta'], [/\bcurry\b/gi, 'kari'], [/\bgrilled\b/gi, 'panggang'], [/\bsteamed\b/gi, 'kukus'], [/\bbaked\b/gi, 'bakar'], [/\bstir fried\b/gi, 'tumis'], [/\bhealthy\b/gi, 'sihat'],
      ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), text).replace(/\s+/g, ' ').trim();
}

function localizeEnglishMealText(text: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const value = String(text || '').trim();
  if (!value || lang === 'en') return value;

  const replacements = lang === 'zh'
    ? [
        [/\bai recommended meal\b/gi, 'AI 推荐餐食'],
        [/\bhealthy\b/gi, '健康'],
        [/\bbalanced\b/gi, '均衡'],
        [/\bgrilled\b/gi, '烤'],
        [/\bbaked\b/gi, '烘烤'],
        [/\bsteamed\b/gi, '蒸'],
        [/\bstir[-\s]?fried\b/gi, '炒'],
        [/\bfried\b/gi, '炒'],
        [/\bboiled\b/gi, '水煮'],
        [/\bwith\b/gi, '配'],
        [/\band\b/gi, '和'],
        [/\bchicken\b/gi, '鸡肉'],
        [/\bbeef\b/gi, '牛肉'],
        [/\bfish\b/gi, '鱼'],
        [/\bsalmon\b/gi, '三文鱼'],
        [/\btuna\b/gi, '金枪鱼'],
        [/\bshrimp\b/gi, '虾'],
        [/\bprawn\b/gi, '虾'],
        [/\begg(s)?\b/gi, '鸡蛋'],
        [/\btofu\b/gi, '豆腐'],
        [/\bbrown rice\b/gi, '糙米饭'],
        [/\brice\b/gi, '米饭'],
        [/\bnoodle(s)?\b/gi, '面'],
        [/\bpasta\b/gi, '意面'],
        [/\bbread\b/gi, '面包'],
        [/\boat(s)?\b/gi, '燕麦'],
        [/\bporridge\b/gi, '粥'],
        [/\bsoup\b/gi, '汤'],
        [/\bsalad\b/gi, '沙拉'],
        [/\bvegetable(s)?\b/gi, '蔬菜'],
        [/\bcarrot(s)?\b/gi, '胡萝卜'],
        [/\bbroccoli\b/gi, '西兰花'],
        [/\bspinach\b/gi, '菠菜'],
        [/\btomato(es)?\b/gi, '番茄'],
        [/\bpotato(es)?\b/gi, '土豆'],
        [/\bsweet potato(es)?\b/gi, '红薯'],
        [/\bfruit(s)?\b/gi, '水果'],
        [/\bbanana(s)?\b/gi, '香蕉'],
        [/\bapple(s)?\b/gi, '苹果'],
        [/\byogurt\b/gi, '酸奶'],
        [/\bmilk\b/gi, '牛奶'],
      ]
    : [
        [/\bai recommended meal\b/gi, 'hidangan cadangan AI'],
        [/\bhealthy\b/gi, 'sihat'],
        [/\bbalanced\b/gi, 'seimbang'],
        [/\bgrilled\b/gi, 'panggang'],
        [/\bbaked\b/gi, 'bakar'],
        [/\bsteamed\b/gi, 'kukus'],
        [/\bstir[-\s]?fried\b/gi, 'tumis'],
        [/\bfried\b/gi, 'goreng'],
        [/\bboiled\b/gi, 'rebus'],
        [/\bwith\b/gi, 'dengan'],
        [/\band\b/gi, 'dan'],
        [/\bchicken\b/gi, 'ayam'],
        [/\bbeef\b/gi, 'daging lembu'],
        [/\bfish\b/gi, 'ikan'],
        [/\bsalmon\b/gi, 'salmon'],
        [/\btuna\b/gi, 'tuna'],
        [/\bshrimp\b/gi, 'udang'],
        [/\bprawn\b/gi, 'udang'],
        [/\begg(s)?\b/gi, 'telur'],
        [/\btofu\b/gi, 'tauhu'],
        [/\bbrown rice\b/gi, 'nasi perang'],
        [/\brice\b/gi, 'nasi'],
        [/\bnoodle(s)?\b/gi, 'mi'],
        [/\bpasta\b/gi, 'pasta'],
        [/\bbread\b/gi, 'roti'],
        [/\boat(s)?\b/gi, 'oat'],
        [/\bporridge\b/gi, 'bubur'],
        [/\bsoup\b/gi, 'sup'],
        [/\bsalad\b/gi, 'salad'],
        [/\bvegetable(s)?\b/gi, 'sayur'],
        [/\bcarrot(s)?\b/gi, 'lobak merah'],
        [/\bbroccoli\b/gi, 'brokoli'],
        [/\bspinach\b/gi, 'bayam'],
        [/\btomato(es)?\b/gi, 'tomato'],
        [/\bpotato(es)?\b/gi, 'kentang'],
        [/\bsweet potato(es)?\b/gi, 'ubi keledek'],
        [/\bfruit(s)?\b/gi, 'buah'],
        [/\bbanana(s)?\b/gi, 'pisang'],
        [/\bapple(s)?\b/gi, 'epal'],
        [/\byogurt\b/gi, 'yogurt'],
        [/\bmilk\b/gi, 'susu'],
      ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), value).replace(/\s+/g, ' ').trim();
}

function getMealName(meal: any, language: string) {
  const localized = pickLocalizedValue(
    language,
    meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.nameEn || meal?.strMeal || meal?.name || meal?.mealName || meal?.recipeName || meal?.title,
    meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || meal?.nameCn || meal?.nameCN || meal?.nameZh,
    meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || meal?.nameMs,
    meal?.strMeal || meal?.name || 'Meal'
  );

  if (normalizeLanguageCode(language) === 'zh' || normalizeLanguageCode(language) === 'ms') {
    if (localized === (meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.nameEn || meal?.strMeal || meal?.name || meal?.mealName || meal?.recipeName || meal?.title)) {
      return localizeEnglishMealText(translateMealName(localized, language), language);
    }
  }

  return localizeEnglishMealText(localized, language);
}

function getMealCategory(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strCategoryEn || meal?.categoryEn || meal?.strCategory || meal?.category,
    meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh,
    meal?.strCategoryMs || meal?.categoryMs,
    fallback
  );
}

function getMealArea(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strAreaEn || meal?.areaEn || meal?.strArea || meal?.area,
    meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh,
    meal?.strAreaMs || meal?.areaMs,
    fallback
  );
}

function getMealInstructions(meal: any, language: string) {
  return pickLocalizedValue(
    language,
    meal?.strInstructionsEn || meal?.instructionsEn || meal?.strInstructions || meal?.instructions,
    meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh,
    meal?.strInstructionsMs || meal?.instructionsMs,
    meal?.strInstructions || meal?.instructions || ''
  );
}

function getIngredientNameByLanguage(item: any, language: string) {
  return pickLocalizedValue(
    language,
    item?.foodNameEn || item?.nameEn || item?.ingredientName || item?.name,
    item?.foodNameCn || item?.foodNameCN || item?.foodNameZh || item?.nameCn || item?.nameCN || item?.nameZh,
    item?.foodNameMs || item?.nameMs,
    normalizeIngredientName(item)
  );
}

function normalizeAiMeal(meal: any): MealRecipe {
  const rawImageUrl = meal?.strMealThumb || meal?.imageUrl || '';
  const rawYoutubeUrl = meal?.strYoutube || meal?.youtubeUrl || '';
  const defaultMealEn = 'AI Recommended Meal';
  const defaultMealCn = 'AI 推荐餐食';
  const defaultMealMs = 'Hidangan Cadangan AI';
  const defaultCategoryEn = 'AI Meal';
  const defaultCategoryCn = 'AI 餐食';
  const defaultCategoryMs = 'Hidangan AI';
  const defaultAreaEn = 'Healthy';
  const defaultAreaCn = '健康';
  const defaultAreaMs = 'Sihat';

  return {
    idMeal: meal?.idMeal || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strMeal: meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.name || defaultMealEn,
    strMealEn: meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.nameEn || meal?.name || defaultMealEn,
    strMealCn: meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || defaultMealCn,
    strMealMs: meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || meal?.nameMs || defaultMealMs,
    nameEn: meal?.nameEn || meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.name || defaultMealEn,
    nameCn: meal?.nameCn || meal?.nameCN || meal?.nameZh || meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || defaultMealCn,
    nameMs: meal?.nameMs || meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || defaultMealMs,
    strCategory: meal?.strCategory || meal?.strCategoryEn || meal?.category || defaultCategoryEn,
    strCategoryEn: meal?.strCategoryEn || meal?.strCategory || meal?.categoryEn || meal?.category || defaultCategoryEn,
    strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || defaultCategoryCn,
    strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || defaultCategoryMs,
    categoryEn: meal?.categoryEn || meal?.strCategoryEn || meal?.strCategory || meal?.category || defaultCategoryEn,
    categoryCn: meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || defaultCategoryCn,
    categoryMs: meal?.categoryMs || meal?.strCategoryMs || defaultCategoryMs,
    strArea: meal?.strArea || meal?.strAreaEn || meal?.area || defaultAreaEn,
    strAreaEn: meal?.strAreaEn || meal?.strArea || meal?.areaEn || meal?.area || defaultAreaEn,
    strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || defaultAreaCn,
    strAreaMs: meal?.strAreaMs || meal?.areaMs || defaultAreaMs,
    areaEn: meal?.areaEn || meal?.strAreaEn || meal?.strArea || meal?.area || defaultAreaEn,
    areaCn: meal?.areaCn || meal?.areaCN || meal?.areaZh || meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || defaultAreaCn,
    areaMs: meal?.areaMs || meal?.strAreaMs || defaultAreaMs,
    strInstructions: meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || meal?.strInstructionsEn || meal?.instructionsEn || '',
    strInstructionsEn: meal?.strInstructionsEn || meal?.instructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || '',
    strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh || '',
    strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || meal?.methodMs || meal?.directionsMs || '',
    instructionsEn: meal?.instructionsEn || meal?.strInstructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || '',
    instructionsCn: meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh || '',
    instructionsMs: meal?.instructionsMs || meal?.strInstructionsMs || meal?.methodMs || meal?.directionsMs || '',
    strMealThumb: isValidImageUrl(rawImageUrl) ? rawImageUrl : null,
    mealIconEmoji: meal?.mealIconEmoji || guessMealEmoji(meal?.strMeal || meal?.name, meal?.strCategory || meal?.category),
    mealIconName: meal?.mealIconName || null,
    mealIconPrompt: meal?.mealIconPrompt || null,
    strYoutube: isValidYoutubeUrl(rawYoutubeUrl) ? rawYoutubeUrl : null,
    totalEnergyKcal: safeNumber(meal?.totalEnergyKcal || meal?.calories),
    totalProteinG: safeNumber(meal?.totalProteinG || meal?.protein),
    totalCarbohydrateG: safeNumber(meal?.totalCarbohydrateG || meal?.carbs || meal?.carbohydrate),
    totalFatG: safeNumber(meal?.totalFatG || meal?.fat),
    ingredients: Array.isArray(meal?.ingredients)
      ? meal.ingredients.map((item: any, index: number) => ({
          ingredientId: item.ingredientId || index + 1,
          ingredientOrder: item.ingredientOrder || index + 1,
          ingredientName: item.ingredientName || item.name || item.foodNameEn || 'Ingredient',
          measure: item.measure || item.quantity || '',
          normalizedName: item.normalizedName || item.name || item.ingredientName || '',
          gramsEstimated: safeNumber(item.gramsEstimated || item.grams),
          foodNameEn: item.foodNameEn || item.nameEn || item.name || item.ingredientName || '',
          foodNameCn: item.foodNameCn || item.foodNameCN || item.foodNameZh || item.nameCn || item.nameCN || item.nameZh || '食材',
          foodNameMs: item.foodNameMs || item.nameMs || 'Bahan',
          foodGroup: item.foodGroup || 'others',
          energyKcal: safeNumber(item.energyKcal),
          proteinG: safeNumber(item.proteinG),
          carbohydrateG: safeNumber(item.carbohydrateG),
          fatG: safeNumber(item.fatG),
          picUrl: item.picUrl || '',
        }))
      : [],
  };
}


function normalizeSlotMeals(value: any): MealRecipe[] {
  if (!value) return [];

  const rawMeals = Array.isArray(value) ? value : [value];

  return rawMeals
    .filter(Boolean)
    .map((meal) => normalizeAiMeal(meal));
}

function normalizeDayPlan(dayPlan: any): MealPlanForDay {
  const normalized: MealPlanForDay = {};

  if (!dayPlan || typeof dayPlan !== 'object') {
    return normalized;
  }

  const breakfastMeals = normalizeSlotMeals(dayPlan.Breakfast || dayPlan.breakfast);
  const lunchMeals = normalizeSlotMeals(dayPlan.Lunch || dayPlan.lunch);
  const dinnerMeals = normalizeSlotMeals(dayPlan.Dinner || dayPlan.dinner);
  const snackMeals = normalizeSlotMeals(dayPlan.Snack || dayPlan.snack);

  if (breakfastMeals.length > 0) normalized.Breakfast = breakfastMeals;
  if (lunchMeals.length > 0) normalized.Lunch = lunchMeals;
  if (dinnerMeals.length > 0) normalized.Dinner = dinnerMeals;
  if (snackMeals.length > 0) normalized.Snack = snackMeals;

  return normalized;
}

function cloneMealPlanForCopy(dayPlan: MealPlanForDay): MealPlanForDay {
  try {
    return normalizeDayPlan(JSON.parse(JSON.stringify(dayPlan || {})));
  } catch {
    return normalizeDayPlan(dayPlan || {});
  }
}

function normalizeMealPlansByOwner(raw: any): Record<string, Record<string, MealPlanForDay>> {
  const normalized: Record<string, Record<string, MealPlanForDay>> = {};

  if (!raw || typeof raw !== 'object') {
    return normalized;
  }

  Object.entries(raw).forEach(([ownerKey, ownerPlans]) => {
    if (!ownerPlans || typeof ownerPlans !== 'object') {
      return;
    }

    normalized[ownerKey] = {};

    Object.entries(ownerPlans as Record<string, any>).forEach(([dateKey, dayPlan]) => {
      normalized[ownerKey][dateKey] = normalizeDayPlan(dayPlan);
    });
  });

  return normalized;
}

async function generateShoppingListByOwner(
  allMealPlans: Record<string, Record<string, MealPlanForDay>>
) {
  try {
    const oldRaw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    const oldByOwner: Record<string, ShoppingItem[]> = oldRaw ? JSON.parse(oldRaw) : {};
    const nextByOwner: Record<string, ShoppingItem[]> = {};
    const todayKey = formatDateKey(new Date());

    Object.entries(allMealPlans).forEach(([ownerKey, mealPlans]) => {
      const oldItems = oldByOwner[ownerKey] || [];
      const checkedMap = new Map<string, boolean>();
      oldItems.forEach((item) => checkedMap.set(item.id, item.checked));
      const mergedMap = new Map<string, ShoppingItem>();

      Object.entries(mealPlans).forEach(([dateKey, dayPlan]) => {
        if (dateKey < todayKey) return;

        SLOT_ORDER.forEach((slot) => {
          const slotMeals = dayPlan?.[slot] || [];

          slotMeals.forEach((meal) => {
            if (!meal || !Array.isArray(meal.ingredients)) return;

            meal.ingredients.forEach((ingredient: any) => {
              const nameEn = getIngredientNameByLanguage(ingredient, 'en');
              const nameCn = getIngredientNameByLanguage(ingredient, 'zh');
              const nameMs = getIngredientNameByLanguage(ingredient, 'ms');
              const name = nameEn;
              const quantity = normalizeIngredientQuantity(ingredient);
              const quantityCn = localizeMeasureText(quantity, 'zh');
              const quantityMs = localizeMeasureText(quantity, 'ms');
              const category = classifyIngredientCategory(ingredient);
              const id = `${name.toLowerCase()}-${category}`.replace(/\s+/g, '-');
              const existing = mergedMap.get(id);
              const mealNameEn = getMealName(meal, 'en');
              const mealNameCn = getMealName(meal, 'zh');
              const mealNameMs = getMealName(meal, 'ms');
              const localizedSourceEn = `${dateKey} · ${getSlotLabel(slot, 'en')}: ${mealNameEn}`;
              const localizedSourceCn = `${dateKey} · ${getSlotLabel(slot, 'zh')}: ${mealNameCn}`;
              const localizedSourceMs = `${dateKey} · ${getSlotLabel(slot, 'ms')}: ${mealNameMs}`;
              const sourceEn = `${dateKey} · ${slot}: ${mealNameEn}`;
              const sourceCn = `${dateKey} · ${slot}: ${mealNameCn}`;
              const sourceMs = `${dateKey} · ${slot}: ${mealNameMs}`;

              if (existing) {
                existing.quantity = [existing.quantity, quantity].filter(Boolean).join(' + ');
                existing.quantityCn = [existing.quantityCn, quantityCn].filter(Boolean).join(' + ');
                existing.quantityMs = [existing.quantityMs, quantityMs].filter(Boolean).join(' + ');
                if (!existing.source.includes(mealNameEn)) {
                  existing.source += `, ${localizedSourceEn}`;
                  existing.sourceEn = [existing.sourceEn, localizedSourceEn].filter(Boolean).join(', ');
                  existing.sourceCn = [existing.sourceCn, localizedSourceCn].filter(Boolean).join(', ');
                  existing.sourceMs = [existing.sourceMs, localizedSourceMs].filter(Boolean).join(', ');
                }
                return;
              }

              mergedMap.set(id, {
                id,
                name,
                nameEn,
                nameCn,
                nameMs,
                quantity,
                quantityCn,
                quantityMs,
                category,
                source: localizedSourceEn,
                sourceEn: localizedSourceEn,
                sourceCn: localizedSourceCn,
                sourceMs: localizedSourceMs,
                mealId: meal.idMeal,
                checked: checkedMap.get(id) || false,
                picUrl: ingredient.picUrl || '',
              });
            });
          });
        });
      });

      nextByOwner[ownerKey] = Array.from(mergedMap.values());
    });

    await AsyncStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(nextByOwner));
  } catch (error) {
    console.log('Generate shopping list failed:', error);
  }
}

function useMealStyles() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  return { styles, theme };
}

function NutritionRing({ value, target, color, label, language }: { value: number; target: number; color: string; label: string; language: string }) {
  const { styles } = useMealStyles();
  const size = 86;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(value / safeTarget, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.ringBlock}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle stroke="#E5E7EB" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
          <Circle
            stroke={color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValueText}>{formatGramValue(value, language)}</Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringTarget}>/{formatGramValue(target, language)}</Text>
    </View>
  );
}

function CalendarDateCell({
  date,
  isCurrentMonth,
  isSelected,
  isToday,
  status,
  progress,
  isCopySource,
  isCopyTarget,
  onPress,
  onLongPress,
  onPressOut,
  setCellRef,
  onLayout,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  status: CalendarNutritionStatus;
  progress: number;
  isCopySource?: boolean;
  isCopyTarget?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: (event: any) => void;
  setCellRef?: (node: any) => void;
  onLayout?: () => void;
}) {
  const { styles } = useMealStyles();
  const hasStatus = status !== 'none';
  const statusColor = STATUS_COLORS[status];
  const size = 38;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(progress, 1));

  return (
    <Pressable
      ref={setCellRef as any}
      style={styles.calendarCell}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      onLayout={onLayout}
      delayLongPress={420}
    >
      <View style={[styles.calendarDateWrap, isCopySource && styles.calendarDateWrapCopySource, isCopyTarget && styles.calendarDateWrapCopyTarget]}>
        {hasStatus && !isSelected ? (
          <>
            <Svg width={size} height={size} style={styles.calendarRingSvg}>
              <Circle stroke="#F1F5F9" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
              <Circle
                stroke={statusColor}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <View style={styles.calendarRingNumber}>
              <Text style={[styles.calendarDateText, !isCurrentMonth && styles.calendarDateMuted, isToday && styles.calendarDateTodayText]}>
                {date.getDate()}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.calendarDateCircle, isToday && styles.calendarDateToday, isSelected && styles.calendarDateSelected]}>
            <Text
              style={[
                styles.calendarDateText,
                !isCurrentMonth && styles.calendarDateMuted,
                isToday && styles.calendarDateTodayText,
                isSelected && styles.calendarDateTextSelected,
              ]}
            >
              {date.getDate()}
            </Text>
          </View>
        )}
        {hasStatus && <View style={[styles.calendarNutritionDot, { backgroundColor: statusColor }]} />}
      </View>
    </Pressable>
  );
}

function MealEditorialHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();
  const { styles, theme } = useMealStyles();

  return (
    <View
      style={[
        styles.mealEditorialHeader,
        { paddingTop: Math.max(insets.top, 24) + 12 },
      ]}
    >
      <View style={styles.mealHeaderBubbleLarge} />
      <View style={styles.mealHeaderBubbleSmall} />
      <View style={styles.mealHeaderBubbleOutline} />

      <View style={styles.mealHeaderTitleRow}>
        <View style={styles.mealHeaderTitleWrap}>
          <Text style={styles.mealHeaderTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.mealHeaderSubtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.mealHeaderIconCircle}>
          <Ionicons name="restaurant-outline" size={22} color={theme.colors.primaryDark} />
        </View>
      </View>
    </View>
  );
}

export default function MealScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const { themeName, theme } = useTheme();
  const { styles } = useMealStyles();
  const recipeSearchGuideRef = useRef<View>(null);
  const dateGuideRef = useRef<View>(null);
  const generatePlanGuideRef = useRef<View>(null);
  const savedRecipeGuideRef = useRef<View>(null);
  const mealScrollRef = useRef<ScrollView>(null);
  const mealContentRef = useRef<View>(null);
  const mealContentYRef = useRef(0);
  const { openAiMealPlanModal, isGeneratingMealPlan, lastGeneratedAt } = useAiMealPlanGeneration();
  const { activeChild, getOwnerKey, nutritionNeeds, savedRecipes = [] } = useChildProfile();
  const ownerKey = getOwnerKey();
  const today = useMemo(() => new Date(), []);
  const locale = normalizeLanguageCode(language) === 'zh' ? 'zh-CN' : normalizeLanguageCode(language) === 'ms' ? 'ms-MY' : 'en-US';

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const { height: viewportHeight } = useWindowDimensions();
  // Card container: padded by 16 left/right (content) + 14 left/right (dateContainer) = 60 total horizontal padding
  // Available width = SCREEN_WIDTH - 60
  // We want to fit exactly 7 cards. The gap is 6 (6 gaps = 36 total). So total width = 7 * cardWidth + 36.
  // cardWidth = (SCREEN_WIDTH - 60 - 36) / 7
  const cardWidth = Math.max(38, Math.floor((SCREEN_WIDTH - 60 - 36) / 7));
  const snapInterval = cardWidth + 6;

  const getText = (en: string, zh: string, ms: string) => {
    const lang = normalizeLanguageCode(language);
    if (lang === 'zh') return zh;
    if (lang === 'ms') return ms;
    return en;
  };

  const getSlotLabel = (slot: MealSlotKey) => {
    const labels: Record<MealSlotKey, string> = {
      Breakfast: getText('Breakfast', '早餐', 'Sarapan'),
      Lunch: getText('Lunch', '午餐', 'Makan Tengah Hari'),
      Dinner: getText('Dinner', '晚餐', 'Makan Malam'),
      Snack: getText('Snack', '加餐', 'Snek'),
    };
    return labels[slot];
  };

  const dateStripRef = useRef<ScrollView>(null);
  const dateCardRefs = useRef<Record<string, any>>({});
  const dateCardLayoutsRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const [selectedDate, setSelectedDate] = useState(today);
  const [dateStripStart, setDateStripStart] = useState(getWeekStart(today));
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<MealRecipe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allMealPlans, setAllMealPlans] = useState<Record<string, Record<string, MealPlanForDay>>>({});
  const [mealPlansLoaded, setMealPlansLoaded] = useState(false);
  const [copySourceKey, setCopySourceKey] = useState<string | null>(null);
  const [copyTargetKeys, setCopyTargetKeys] = useState<string[]>([]);
  const [mealToAdd, setMealToAdd] = useState<MealRecipe | null>(null);
  const [showMealSlotPicker, setShowMealSlotPicker] = useState(false);
  const [showSavedRecipePicker, setShowSavedRecipePicker] = useState(false);

  const selectedKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(today);
  const mealPlans = allMealPlans[ownerKey] || {};
  const selectedDayPlan: MealPlanForDay = mealPlans[selectedKey] || {};

  const currentTargets = {
    carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
    protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
    fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
  };

  const dateTabs = useMemo(() => getScrollableDateStripDays(dateStripStart), [dateStripStart]);
  const calendarDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7));
    return weeks;
  }, [calendarDays]);

  const totals = useMemo(() => getMealPlanTotals(selectedDayPlan), [selectedDayPlan]);
  const hasMealsForSelectedDay = SLOT_ORDER.some((slot) => (selectedDayPlan[slot]?.length || 0) > 0);

  const setDateCardRef = useCallback((dateKey: string, node: any) => {
    if (node) {
      dateCardRefs.current[dateKey] = node;
    } else {
      delete dateCardRefs.current[dateKey];
      delete dateCardLayoutsRef.current[dateKey];
    }
  }, []);

  const measureDateCard = useCallback((dateKey: string) => {
    requestAnimationFrame(() => {
      const node = dateCardRefs.current[dateKey];

      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((x: number, y: number, width: number, height: number) => {
          dateCardLayoutsRef.current[dateKey] = { x, y, width, height };
        });
      }
    });
  }, []);

  const findDateKeyFromScreenPoint = useCallback((pageX?: number, pageY?: number) => {
    if (pageX === undefined || pageY === undefined) return null;

    const entries = Object.entries(dateCardLayoutsRef.current);
    const matched = entries.find(([, rect]) => (
      pageX >= rect.x &&
      pageX <= rect.x + rect.width &&
      pageY >= rect.y &&
      pageY <= rect.y + rect.height
    ));

    return matched?.[0] || null;
  }, []);

  const formatCopyDateLabel = useCallback((dateKey: string) => {
    return parseDateKey(dateKey).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [locale]);

  const handleMealGuideStepChange = useCallback((step: FeatureGuideStep) => {
    const anchor = step.anchorRef.current;
    const content = mealContentRef.current;

    if (
      !anchor ||
      !content ||
      typeof anchor.measureInWindow !== 'function' ||
      typeof anchor.measureLayout !== 'function'
    ) {
      return 120;
    }

    anchor.measureInWindow((_x, screenY, _width, height) => {
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
        content,
        (_x, y) => {
          mealScrollRef.current?.scrollTo({
            y: Math.max(mealContentYRef.current + y - viewportHeight * 0.32, 0),
            animated: true,
          });
        },
        () => {
          if (step.key === 'recipe-search') {
            mealScrollRef.current?.scrollTo({ y: 0, animated: true });
          }
        }
      );
    });

    return 520;
  }, [viewportHeight]);

  const loadStoredMealPlans = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAllMealPlans(normalizeMealPlansByOwner(parsed));
      } else {
        setAllMealPlans({});
      }
    } catch (error) {
      console.log('Load meal plans failed:', error);
      setAllMealPlans({});
    } finally {
      setMealPlansLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStoredMealPlans();
    }, [loadStoredMealPlans])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      const now = new Date();
      setSelectedDate(now);
      setDateStripStart(getWeekStart(now));
      setCalendarMonth(now);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { width } = Dimensions.get('window');
      const diffTime = selectedDate.getTime() - dateStripStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const index = 7 + diffDays;
      // Center the selected day
      const targetX = (index * snapInterval) + (snapInterval / 2) - (width / 2) + 30; // compensate for screen padding
      dateStripRef.current?.scrollTo({ x: Math.max(0, targetX), animated: false });
    }, 80);

    return () => clearTimeout(timer);
  }, [dateStripStart]);

  useEffect(() => {
    if (lastGeneratedAt > 0) {
      loadStoredMealPlans();
    }
  }, [lastGeneratedAt, loadStoredMealPlans]);

  useEffect(() => {
    if (!mealPlansLoaded) return;
    const saveMealPlans = async () => {
      try {
        const normalizedPlans = normalizeMealPlansByOwner(allMealPlans);
        await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(normalizedPlans));
        await generateShoppingListByOwner(normalizedPlans);
      } catch (error) {
        console.log('Save meal plans failed:', error);
      }
    };
    saveMealPlans();
  }, [allMealPlans, mealPlansLoaded]);

  useEffect(() => {
    const query = keyword.trim();
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
      setShowSuggestions(true);
      const result = await searchMeals(query);
      if (!result.ok) {
        setSuggestions([]);
        setSearchError(result.message);
        setSearchLoading(false);
        return;
      }
      const list = Array.isArray(result.data?.data) ? result.data.data : [];
      setSuggestions(list.slice(0, 8));
      setSearchLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  const updateCurrentOwnerMealPlans = (
    updater: (prev: Record<string, MealPlanForDay>) => Record<string, MealPlanForDay>
  ) => {
    setAllMealPlans((prev) => {
      const currentOwnerPlans = prev[ownerKey] || {};
      return { ...prev, [ownerKey]: updater(currentOwnerPlans) };
    });
  };

  const dayHasMealPlan = useCallback((dateKey: string) => {
    const dayPlan = mealPlans[dateKey];
    return SLOT_ORDER.some((slot) => (dayPlan?.[slot]?.length || 0) > 0);
  }, [mealPlans]);

  const startCopyMealPlan = useCallback((date: Date) => {
    const sourceKey = formatDateKey(date);

    if (!dayHasMealPlan(sourceKey)) {
      Alert.alert(
        getText('No Meal Plan', '没有膳食计划', 'Tiada Pelan Makanan'),
        getText('This date does not have a meal plan to copy.', '这个日期没有可以复制的膳食计划。', 'Tarikh ini tiada pelan makanan untuk disalin.')
      );
      return;
    }

    setCopySourceKey(sourceKey);
    setCopyTargetKeys([]);
  }, [dayHasMealPlan]);

  const cancelCopyMealPlan = useCallback(() => {
    setCopySourceKey(null);
    setCopyTargetKeys([]);
  }, []);

  const toggleCopyTargetDate = useCallback((date: Date) => {
    if (!copySourceKey) return;

    const targetKey = formatDateKey(date);

    if (targetKey === copySourceKey) {
      return;
    }

    setCopyTargetKeys((prev) => (
      prev.includes(targetKey)
        ? prev.filter((item) => item !== targetKey)
        : [...prev, targetKey]
    ));
  }, [copySourceKey]);

  const addCopyTargetByKey = useCallback((targetKey: string) => {
    if (!copySourceKey || targetKey === copySourceKey) return;

    setCopyTargetKeys((prev) => (
      prev.includes(targetKey) ? prev : [...prev, targetKey]
    ));
  }, [copySourceKey]);

  const confirmCopyMealPlanToTargets = useCallback((targetKeys: string[] = copyTargetKeys, closeCalendarAfterCopy = false) => {
    if (!copySourceKey) return;

    const uniqueTargets = Array.from(new Set(targetKeys)).filter((key) => key && key !== copySourceKey);

    if (uniqueTargets.length === 0) {
      Alert.alert(
        getText('Choose target dates', '请选择目标日期', 'Pilih tarikh sasaran'),
        getText('Select one or more dates to copy this meal plan to.', '请选择一个或多个要复制到的日期。', 'Pilih satu atau lebih tarikh untuk menyalin pelan makanan ini.')
      );
      return;
    }

    const sourcePlan = mealPlans[copySourceKey];

    if (!SLOT_ORDER.some((slot) => (sourcePlan?.[slot]?.length || 0) > 0)) {
      Alert.alert(
        getText('No Meal Plan', '没有膳食计划', 'Tiada Pelan Makanan'),
        getText('The source date does not have a meal plan to copy.', '来源日期没有可以复制的膳食计划。', 'Tarikh sumber tiada pelan makanan untuk disalin.')
      );
      cancelCopyMealPlan();
      return;
    }

    const sourceLabel = formatCopyDateLabel(copySourceKey);
    const targetLabels = uniqueTargets.map(formatCopyDateLabel).join(', ');
    const overwriteCount = uniqueTargets.filter(dayHasMealPlan).length;

    Alert.alert(
      getText('Copy Meal Plan', '复制膳食计划', 'Salin Pelan Makanan'),
      overwriteCount > 0
        ? getText(
            `Copy meal plan from ${sourceLabel} to ${uniqueTargets.length} selected date(s): ${targetLabels}? ${overwriteCount} target date(s) already have a plan and will be replaced.`,
            `要将 ${sourceLabel} 的膳食计划复制到已选择的 ${uniqueTargets.length} 个日期吗：${targetLabels}？其中 ${overwriteCount} 个日期已有计划，会被替换。`,
            `Salin pelan makanan dari ${sourceLabel} ke ${uniqueTargets.length} tarikh dipilih: ${targetLabels}? ${overwriteCount} tarikh sasaran sudah ada pelan dan akan digantikan.`
          )
        : getText(
            `Copy meal plan from ${sourceLabel} to ${uniqueTargets.length} selected date(s): ${targetLabels}?`,
            `要将 ${sourceLabel} 的膳食计划复制到已选择的 ${uniqueTargets.length} 个日期吗：${targetLabels}？`,
            `Salin pelan makanan dari ${sourceLabel} ke ${uniqueTargets.length} tarikh dipilih: ${targetLabels}?`
          ),
      [
        {
          text: getText('Cancel', '取消', 'Batal'),
          style: 'cancel',
        },
        {
          text: getText('Confirm', '确认', 'Sahkan'),
          onPress: () => {
            updateCurrentOwnerMealPlans((prev) => {
              const source = prev[copySourceKey] || sourcePlan;
              const next = { ...prev };

              uniqueTargets.forEach((targetKey) => {
                next[targetKey] = cloneMealPlanForCopy(source);
              });

              return next;
            });

            const lastTargetDate = parseDateKey(uniqueTargets[uniqueTargets.length - 1]);
            setSelectedDate(lastTargetDate);
            setDateStripStart(getWeekStart(lastTargetDate));
            setCalendarMonth(lastTargetDate);

            if (closeCalendarAfterCopy) {
              setShowCalendar(false);
            }

            cancelCopyMealPlan();
          },
        },
      ]
    );
  }, [cancelCopyMealPlan, copySourceKey, copyTargetKeys, dayHasMealPlan, formatCopyDateLabel, mealPlans]);

  const handleDatePress = useCallback((date: Date, closeCalendarAfterCopy = false) => {
    if (copySourceKey) {
      toggleCopyTargetDate(date);
      return;
    }

    if (closeCalendarAfterCopy) {
      setSelectedDate(date);
      setDateStripStart(getWeekStart(date));
      setCalendarMonth(date);
      setShowCalendar(false);
      return;
    }

    setSelectedDate(date);
  }, [copySourceKey, toggleCopyTargetDate]);

  const handleCopyPressOut = useCallback((sourceKey: string, event: any) => {
    if (copySourceKey !== sourceKey) return;

    const targetKey = findDateKeyFromScreenPoint(event?.nativeEvent?.pageX, event?.nativeEvent?.pageY);

    if (!targetKey || targetKey === sourceKey) return;

    addCopyTargetByKey(targetKey);
  }, [addCopyTargetByKey, copySourceKey, findDateKeyFromScreenPoint]);

  const closeMealSlotPicker = () => {
    setShowMealSlotPicker(false);
    setMealToAdd(null);
  };

  const addMealToPlan = (meal: MealRecipe) => {
    setMealToAdd(normalizeAiMeal(meal));
    setShowMealSlotPicker(true);
  };

  const closeSavedRecipePicker = () => {
    setShowSavedRecipePicker(false);
  };

  const getSavedRecipeMeal = (savedRecipe: any): MealRecipe => {
    return normalizeAiMeal(savedRecipe?.meal || savedRecipe);
  };

  const addSavedRecipeToPlan = (savedRecipe: any) => {
    const meal = getSavedRecipeMeal(savedRecipe);
    closeSavedRecipePicker();
    setTimeout(() => addMealToPlan(meal), 120);
  };

  const openSavedRecipeDetail = (savedRecipe: any) => {
    const meal = getSavedRecipeMeal(savedRecipe);
    closeSavedRecipePicker();
    navigation.navigate('RecipeDetail', { meal });
  };

  const addMealToSelectedSlot = (slot: MealSlotKey) => {
    if (!mealToAdd) return;

    updateCurrentOwnerMealPlans((prev) => {
      const current = prev[selectedKey] || {};
      const currentSlotMeals = current[slot] || [];

      return {
        ...prev,
        [selectedKey]: {
          ...current,
          [slot]: [...currentSlotMeals, mealToAdd],
        },
      };
    });

    closeMealSlotPicker();
    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
  };

  const deleteMealFromPlan = (slot: MealSlotKey, mealIndex: number) => {
    updateCurrentOwnerMealPlans((prev) => {
      const current = { ...(prev[selectedKey] || {}) };
      const slotMeals = [...(current[slot] || [])];

      slotMeals.splice(mealIndex, 1);

      if (slotMeals.length > 0) {
        current[slot] = slotMeals;
      } else {
        delete current[slot];
      }

      return { ...prev, [selectedKey]: current };
    });
  };

  const replaceMealInSlot = (slot: MealSlotKey, mealIndex: number, meal: MealRecipe) => {
    const normalizedMeal = normalizeAiMeal(meal);

    updateCurrentOwnerMealPlans((prev) => {
      const current = prev[selectedKey] || {};
      const slotMeals = [...(current[slot] || [])];

      if (!slotMeals[mealIndex]) return prev;

      slotMeals[mealIndex] = normalizedMeal;

      return {
        ...prev,
        [selectedKey]: {
          ...current,
          [slot]: slotMeals,
        },
      };
    });

    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
  };

  const clearSelectedDayPlan = () => {
    const hasMeals = SLOT_ORDER.some((slot) => (selectedDayPlan[slot]?.length || 0) > 0);

    if (!hasMeals) {
      Alert.alert(getText('No Meals', '没有餐食', 'Tiada Hidangan'), getText('There are no meals to clear for this date.', '这个日期没有可以清空的餐食。', 'Tiada hidangan untuk dikosongkan pada tarikh ini.'));
      return;
    }

    Alert.alert(getText('Clear Meal Plan', '清空膳食计划', 'Kosongkan Pelan Makanan'), getText('Remove all meals for the selected date?', '要删除所选日期的所有餐食吗？', 'Buang semua hidangan untuk tarikh yang dipilih?'), [
      { text: getText('Cancel', '取消', 'Batal'), style: 'cancel' },
      {
        text: getText('Clear All', '全部清空', 'Kosongkan Semua'),
        style: 'destructive',
        onPress: () => {
          updateCurrentOwnerMealPlans((prev) => ({ ...prev, [selectedKey]: {} }));
        },
      },
    ]);
  };

  const openRecipeDetail = (
    meal: MealRecipe,
    mealPlanEditContext?: {
      ownerKey: string;
      dateKey: string;
      slot: MealSlotKey;
      mealIndex: number;
    }
  ) => {
    navigation.navigate('RecipeDetail', {
      meal: normalizeAiMeal(meal),
      ...(mealPlanEditContext ? { mealPlanEditContext } : {}),
    });
  };

  const openYoutube = async (url?: string | null) => {
    if (!url) {
      Alert.alert(getText('No Tutorial', '没有教程', 'Tiada Tutorial'), getText('This recipe does not have a tutorial link.', '这个食谱没有教程链接。', 'Resipi ini tiada pautan tutorial.'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert(getText('Cannot Open Link', '无法打开链接', 'Tidak Dapat Buka Pautan'), getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.'));
    } catch (error) {
      console.log('Open tutorial failed:', error);
      Alert.alert(getText('Error', '错误', 'Ralat'), getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.'));
    }
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);
    setDateStripStart(getWeekStart(date));
    setCalendarMonth(date);
    setShowCalendar(false);
  };

  const goToday = () => {
    const nextToday = new Date();
    setSelectedDate(nextToday);
    setDateStripStart(getWeekStart(nextToday));
    setCalendarMonth(nextToday);
    setShowCalendar(false);
  };

  const renderSuggestion = (meal: MealRecipe) => (
    <View key={meal.idMeal} style={styles.suggestionItem}>
      <Pressable style={styles.suggestionMain} onPress={() => openRecipeDetail(meal)}>
        {meal.strMealThumb ? (
          <Image source={{ uri: meal.strMealThumb }} style={styles.suggestionImage} />
        ) : (
          <View style={styles.suggestionImageFallback}><Text style={styles.fallbackEmoji}>{meal.mealIconEmoji || guessMealEmoji(getMealName(meal, language), getMealCategory(meal, language, ''))}</Text></View>
        )}
        <View style={styles.suggestionContent}>
          <Text style={styles.suggestionTitle} numberOfLines={2}>{getMealName(meal, language)}</Text>
          <Text style={styles.suggestionMeta}>{getMealCategory(meal, language, getText('Recipe', '食谱', 'Resipi'))} · {getMealArea(meal, language, getText('Meal', '餐食', 'Hidangan'))}</Text>
          <Text style={styles.suggestionNutrition}>
            {round(meal.totalEnergyKcal)} kcal · {getText('Protein', '蛋白质', 'Protein')} {formatGramValue(meal.totalProteinG, language)} · {getText('Carbs', '碳水', 'Karbo')} {formatGramValue(meal.totalCarbohydrateG, language)} · {getText('Fat', '脂肪', 'Lemak')} {formatGramValue(meal.totalFatG, language)}
          </Text>
        </View>
      </Pressable>
      <View style={styles.suggestionActions}>
        <Pressable style={[styles.suggestionButton, styles.suggestionViewButton]} onPress={() => openRecipeDetail(meal)}>
          <Ionicons name="book-outline" size={15} color="#3BA76D" />
          <Text style={[styles.suggestionButtonText, { color: '#3BA76D' }]}>{getText('View', '查看', 'Lihat')}</Text>
        </Pressable>
        <Pressable style={[styles.suggestionButton, styles.suggestionWatchButton]} onPress={() => openYoutube(meal.strYoutube)}>
          <Ionicons name="logo-youtube" size={15} color="#FF3B30" />
          <Text style={[styles.suggestionButtonText, { color: '#FF3B30' }]}>{getText('Watch', '观看', 'Tonton')}</Text>
        </Pressable>
        <Pressable style={styles.suggestionAddButton} onPress={() => addMealToPlan(meal)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.suggestionAddText}>{getText('Add to meal', '加入餐次', 'Tambah ke hidangan')}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMealCard = (slot: MealSlotKey, meal: MealRecipe, mealIndex: number) => (
    <View key={`${slot}-${meal.idMeal}-${mealIndex}`} style={styles.mealCardBlock}>
      <View style={styles.mealItemHeaderRow}>
        <View style={styles.mealItemBadge}>
          <Text style={styles.mealItemBadgeText}>
            {getText('Meal', '餐食', 'Hidangan')} {mealIndex + 1}
          </Text>
        </View>

        <Pressable style={styles.smallIconButton} onPress={() => deleteMealFromPlan(slot, mealIndex)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>

      <View style={styles.mealCard}>
        {meal.strMealThumb ? (
          <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
        ) : (
          <View style={styles.mealImageFallback}><Text style={styles.fallbackEmoji}>{meal.mealIconEmoji || guessMealEmoji(getMealName(meal, language), getMealCategory(meal, language, ''))}</Text></View>
        )}
        <View style={styles.mealContent}>
          <Text style={styles.mealTitle} numberOfLines={2}>{getMealName(meal, language)}</Text>
          <View style={styles.macroTagRow}>
            <View style={[styles.macroTag, styles.macroCarb]}><Text style={[styles.macroTagText, { color: '#F97316' }]}>{formatGramValue(meal.totalCarbohydrateG, language)} {getText('carbs', '碳水', 'karbo')}</Text></View>
            <View style={[styles.macroTag, styles.macroProtein]}><Text style={[styles.macroTagText, { color: '#2563EB' }]}>{formatGramValue(meal.totalProteinG, language)} {getText('protein', '蛋白质', 'protein')}</Text></View>
            <View style={[styles.macroTag, styles.macroFat]}><Text style={[styles.macroTagText, { color: '#16A34A' }]}>{formatGramValue(meal.totalFatG, language)} {getText('fat', '脂肪', 'lemak')}</Text></View>
          </View>
          <View style={styles.mealButtonRow}>
            <Pressable
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => openRecipeDetail(meal, {
                ownerKey,
                dateKey: selectedKey,
                slot,
                mealIndex,
              })}
            >
              <Ionicons name="book-outline" size={16} color="#3BA76D" />
              <Text style={[styles.actionButtonText, { color: '#3BA76D' }]} numberOfLines={1}>{getText('View', '查看', 'Lihat')}</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.watchButton]} onPress={() => openYoutube(meal.strYoutube)}>
              <Ionicons name="logo-youtube" size={16} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]} numberOfLines={1}>{getText('Watch', '观看', 'Tonton')}</Text>
            </Pressable>
          </View>
          {suggestions.length > 0 && (
            <Pressable
              style={styles.replaceLink}
              onPress={() => {
                const candidate = suggestions.find((item) => item.idMeal !== meal.idMeal);
                if (candidate) replaceMealInSlot(slot, mealIndex, candidate);
                else Alert.alert(getText('No Alternative', '没有替代食谱', 'Tiada Alternatif'), getText('Search another recipe to replace this one.', '请搜索另一个食谱来替换。', 'Cari resipi lain untuk menggantikannya.'));
              }}
            >
              <Ionicons name="swap-horizontal" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.replaceLinkText}>{getText('Replace meal', '替换餐食', 'Ganti Hidangan')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const renderMealSlotSection = (slot: MealSlotKey, meals: MealRecipe[]) => (
    <View key={slot} style={styles.mealSection}>
      <View style={styles.mealSectionHeader}>
        <View>
          <Text style={styles.mealSectionTitle}>{getSlotLabel(slot)}</Text>
          <Text style={styles.mealSectionSub}>
            {getText(
              `${meals.length} meal${meals.length === 1 ? '' : 's'}`,
              `${meals.length} 餐`,
              `${meals.length} hidangan`
            )}
          </Text>
        </View>
      </View>

      {meals.map((meal, mealIndex) => renderMealCard(slot, meal, mealIndex))}
    </View>
  );

  return (
    <Screen padded={false} scrollRef={mealScrollRef}>
      {themeName === 'green' ? (
        <MealEditorialHeader
          title={getText('Meal Plan', '膳食计划', 'Pelan Makanan')}
          subtitle={activeChild ? `${activeChild.nickname}${getText("'s meal plan", '的膳食计划', ' punya pelan makanan')}` : getText('Guest meal plan', '访客膳食计划', 'Pelan makanan tetamu')}
        />
      ) : (
        <Header
          title={getText('Meal Plan', '膳食计划', 'Pelan Makanan')}
          subtitle={activeChild ? `${activeChild.nickname}${getText("'s meal plan", '的膳食计划', ' punya pelan makanan')}` : getText('Guest meal plan', '访客膳食计划', 'Pelan makanan tetamu')}
          icon="restaurant"
        />
      )}

      <View
        ref={mealContentRef}
        collapsable={false}
        style={styles.content}
        onLayout={(event) => {
          mealContentYRef.current = event.nativeEvent.layout.y;
        }}
      >
        <View
          ref={recipeSearchGuideRef}
          collapsable={false}
        >
          <View style={styles.searchOuterCard}>
            <View style={styles.searchInnerCard}>
            <Ionicons name="search" size={20} color="#63B987" />
            <TextInput
              value={keyword}
              onChangeText={(text) => { setKeyword(text); setShowSuggestions(true); }}
              placeholder={getText('Search recipes...', '搜索食谱...', 'Cari resipi...')}
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <Pressable style={styles.searchClear} onPress={() => { setKeyword(''); setSuggestions([]); setSearchError(''); setShowSuggestions(false); }}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {keyword.trim().length > 0 && showSuggestions && (
            <View style={styles.suggestionBox}>
              {searchLoading ? (
                <View style={styles.suggestionStatus}>
                  <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                  <Text style={styles.suggestionStatusText}>{getText('Searching recipes...', '正在搜索食谱...', 'Mencari resipi...')}</Text>
                </View>
              ) : searchError ? (
                <View style={styles.suggestionStatus}>
                  <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                  <Text style={styles.suggestionErrorText}>{searchError}</Text>
                </View>
              ) : suggestions.length > 0 ? (
                suggestions.map(renderSuggestion)
              ) : (
                <View style={styles.suggestionStatus}><Text style={styles.suggestionStatusText}>{getText('No matching recipes found', '没有找到匹配的食谱', 'Tiada resipi sepadan ditemui')}</Text></View>
              )}
            </View>
          )}
          </View>
        </View>

        <View
          ref={dateGuideRef}
          collapsable={false}
        >
          <View style={styles.dateContainer}>
          <View style={styles.dateTopRow}>
            <View>
              <Text style={styles.dateTitle}>{selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.dateSubtitle}>{getText('Swipe left or right to choose dates', '左右滑动选择日期', 'Leret kiri atau kanan untuk pilih tarikh')}</Text>
            </View>
            <View style={styles.dateActionRow}>
              <Pressable style={styles.calendarButton} onPress={() => setShowCalendar(true)}>
                <Ionicons name="calendar-outline" size={17} color={theme.colors.primaryDark} />
                <Text style={styles.calendarButtonText}>{getText('Calendar', '日历', 'Kalendar')}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={dateStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableDateRow}
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="center"
          >
            {dateTabs.map((date) => {
              const key = formatDateKey(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const statusInfo = getCalendarStatus(mealPlans[key], currentTargets);
              const hasPlanStatus = statusInfo.status !== 'none';
              const fillColor = hasPlanStatus ? STATUS_COLORS[statusInfo.status] : undefined;
              const isCopyTarget = copyTargetKeys.includes(key);
              const activeText = isSelected || hasPlanStatus || isCopyTarget;

              return (
                <Pressable
                  key={key}
                  ref={(node) => setDateCardRef(key, node)}
                  onLayout={() => measureDateCard(key)}
                  style={[
                    styles.dateCard,
                    { width: cardWidth },
                    hasPlanStatus && { backgroundColor: fillColor },
                    isSelected && !hasPlanStatus && styles.dateCardActive,
                    isSelected && hasPlanStatus && styles.dateCardSelectedWithPlan,
                    copySourceKey === key && styles.dateCardCopySource,
                    copyTargetKeys.includes(key) && styles.dateCardCopyTarget,
                  ]}
                  onPress={() => handleDatePress(date)}
                  onLongPress={() => startCopyMealPlan(date)}
                  onPressOut={(event) => handleCopyPressOut(key, event)}
                  delayLongPress={420}
                >
                  <Text style={[styles.dateDay, activeText && styles.dateTextActive]}>
                    {date.toLocaleDateString(locale, { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dateNumber, activeText && styles.dateTextActive]}>{date.getDate()}</Text>
                  {isToday && <Text style={[styles.dateToday, activeText && styles.dateTodayActive]}>{getText('Today', '今天', 'Hari Ini')}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.dateLegendRow}>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.tooMuch }]} /><Text style={styles.dateLegendText}>{getText('Too much', '吃多了', 'Terlalu Banyak')}</Text></View>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.good }]} /><Text style={styles.dateLegendText}>{getText('Good', '正常', 'Baik')}</Text></View>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.tooLittle }]} /><Text style={styles.dateLegendText}>{getText('Too little', '吃少了', 'Terlalu Sedikit')}</Text></View>
          </View>

          {copySourceKey && (
            <View style={styles.copyModeBanner}>
              <Ionicons name="copy-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.copyModeText}>
                {getText(
                  `Copying ${formatCopyDateLabel(copySourceKey)}. Tap multiple target dates, then confirm. Selected: ${copyTargetKeys.length}`,
                  `正在复制 ${formatCopyDateLabel(copySourceKey)}，可点选多个目标日期后确认。已选：${copyTargetKeys.length}`,
                  `Sedang menyalin ${formatCopyDateLabel(copySourceKey)}. Ketik beberapa tarikh sasaran, kemudian sahkan. Dipilih: ${copyTargetKeys.length}`
                )}
              </Text>
              <Pressable
                style={[styles.copyConfirmButton, copyTargetKeys.length === 0 && styles.copyConfirmButtonDisabled]}
                onPress={() => confirmCopyMealPlanToTargets(copyTargetKeys, false)}
              >
                <Text style={styles.copyConfirmText}>{getText('Confirm', '确认', 'Sahkan')}</Text>
              </Pressable>
              <Pressable style={styles.copyCancelButton} onPress={cancelCopyMealPlan}>
                <Text style={styles.copyCancelText}>{getText('Cancel', '取消', 'Batal')}</Text>
              </Pressable>
            </View>
          )}
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeaderRow}>
            <View>
              <Text style={styles.nutritionTitle}>{getText("Today's Nutrition", '今日营养', 'Nutrisi Hari Ini')}</Text>
              <Text style={styles.nutritionSubtitle}>{activeChild ? getText('Targets loaded from child profile', '目标来自儿童档案', 'Sasaran daripada profil kanak-kanak') : getText('Guest default targets', '访客默认目标', 'Sasaran lalai tetamu')}</Text>
            </View>
            <Text style={styles.nutritionProgressText}>{getText('Progress', '进度', 'Kemajuan')}</Text>
          </View>
          <View style={styles.ringRow}>
            <NutritionRing label={getText('Carbs', '碳水', 'Karbo')} value={totals.carbs} target={currentTargets.carbs} color="#F39B5F" language={language} />
            <NutritionRing label={getText('Protein', '蛋白质', 'Protein')} value={totals.protein} target={currentTargets.protein} color="#72C3E6" language={language} />
            <NutritionRing label={getText('Fat', '脂肪', 'Lemak')} value={totals.fat} target={currentTargets.fat} color="#56B277" language={language} />
          </View>
        </View>

        <View style={styles.planWrapper}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>{getText('Meal Plan', '膳食计划', 'Pelan Makanan')}</Text>

            <View style={styles.planHeaderActions}>
              <View
                ref={savedRecipeGuideRef}
                collapsable={false}
              >
                <Pressable style={styles.savedRecipeButton} onPress={() => setShowSavedRecipePicker(true)}>
                  <Ionicons name="bookmark-outline" size={15} color={theme.colors.primaryDark} />
                  <Text style={styles.savedRecipeButtonText}>{getText('Saved Recipes', '收藏食谱', 'Resipi Tersimpan')}</Text>
                </Pressable>
              </View>

              <Pressable style={styles.clearPlanButton} onPress={clearSelectedDayPlan}>
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={styles.clearPlanButtonText}>{getText('Clear All', '全部清空', 'Kosongkan Semua')}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.planShoppingText}>☑ {getText('View ingredients in Shopping', '在购物清单查看食材', 'Lihat bahan di Shopping')}</Text>
          <View style={styles.preferenceBanner}><Text style={styles.preferenceBannerText}>✓ {getText('Meals adapted to preferences', '餐食已根据偏好调整', 'Hidangan disesuaikan dengan pilihan')}</Text></View>

          {isGeneratingMealPlan ? (
            <View style={styles.generatingCard}>
              <ActivityIndicator size="large" color={theme.colors.primaryDark} />
              <Text style={styles.generatingTitle}>{getText('Generating your meal plan...', '正在生成你的膳食计划...', 'Sedang menjana pelan makanan anda...')}</Text>
              <Text style={styles.generatingText}>{getText('AI is choosing suitable recipes based on the child profile, nutrition targets and your food preference.', 'AI 正在根据儿童档案、营养目标和食物偏好选择合适的食谱。', 'AI sedang memilih resipi yang sesuai berdasarkan profil kanak-kanak, sasaran nutrisi dan pilihan makanan anda.')}</Text>
            </View>
          ) : hasMealsForSelectedDay ? (
            SLOT_ORDER
              .filter((slot) => (selectedDayPlan[slot]?.length || 0) > 0)
              .map((slot) => renderMealSlotSection(slot, selectedDayPlan[slot] as MealRecipe[]))
          ) : (
            <View style={styles.emptyMealPlanCard}>
              <Text style={styles.emptyMealPlanEmoji}>🍽️</Text>
              <Text style={styles.emptyMealPlanTitle}>{getText('No meals added yet', '还没有添加餐食', 'Belum ada hidangan')}</Text>
              <Text style={styles.emptyMealPlanText}>{getText('Tap the button below to generate an AI meal plan, or search recipes above.', '点击下面按钮生成 AI 膳食计划，或在上方搜索食谱。', 'Ketik butang di bawah untuk menjana pelan makanan AI, atau cari resipi di atas.')}</Text>
              <View
                ref={generatePlanGuideRef}
                collapsable={false}
              >
                <Pressable style={styles.generatePlanButton} onPress={() => openAiMealPlanModal({ startDate: selectedDate })}>
                  <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                  <Text style={styles.generatePlanButtonText}>{getText('Generate Meal Plan', '生成膳食计划', 'Jana Pelan Makanan')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <FeatureGuideCoachmark
        guideKey="meal_plan_core"
        enabled={!showCalendar && !showMealSlotPicker && !showSavedRecipePicker}
        onStepChange={handleMealGuideStepChange}
        steps={([
          {
            key: 'recipe-search',
            anchorRef: recipeSearchGuideRef,
            icon: 'search-outline',
            placement: 'bottom',
            title: getText('Search recipes when you need a specific dish', '需要具体菜品时先搜索食谱', 'Cari resipi apabila anda perlukan hidangan tertentu'),
            description: getText(
              'Use this search when you already have an idea in mind. You can view the recipe, watch a tutorial or add it to a meal slot.',
              '当你已经有想吃的菜时，从这里搜索。搜索结果可查看详情、观看教学，或直接加入餐次。',
              'Gunakan carian ini apabila anda sudah ada idea hidangan. Anda boleh lihat resipi, tonton tutorial atau tambah ke slot makanan.'
            ),
          },
          {
            key: 'date-strip',
            anchorRef: dateGuideRef,
            icon: 'calendar-outline',
            placement: 'bottom',
            title: getText('Meal plans are organized by date', '膳食计划按日期管理', 'Pelan makanan disusun mengikut tarikh'),
            description: getText(
              'Swipe across days, open the calendar and manage the plan for the date that matters right now.',
              '左右滑动日期，或打开日历，专门管理你当前要安排的那一天。',
              'Leret antara hari atau buka kalendar untuk mengurus pelan pada tarikh yang anda perlukan.'
            ),
          },
          !hasMealsForSelectedDay
            ? {
                key: 'generate-plan',
                anchorRef: generatePlanGuideRef,
                icon: 'sparkles-outline',
                placement: 'top',
                title: getText('No plan yet? Generate one from the current date', '还没有计划？从当前日期直接生成', 'Belum ada pelan? Jana terus daripada tarikh semasa'),
                description: getText(
                  'This button creates an AI meal plan for the selected day or date range. It is useful when starting from a blank page.',
                  '这个按钮会从当前日期生成 AI 膳食计划，适合你还没有安排任何餐食的时候。',
                  'Butang ini menjana pelan makanan AI untuk tarikh atau julat yang dipilih apabila anda bermula dari kosong.'
                ),
              }
            : null,
          {
            key: 'copy-meal-plan',
            anchorRef: dateGuideRef,
            icon: 'copy-outline',
            placement: 'bottom',
            title: getText('Long-press a date to copy a meal plan', '长按日期即可复制膳食计划', 'Tekan lama tarikh untuk menyalin pelan makanan'),
            description: getText(
              'After one day is planned, long-press that date in the date strip or calendar, then choose one or more target dates to reuse it.',
              '当某一天已经安排好餐食后，长按日期条或日历里的日期，再选择一个或多个目标日期，就能快速复用这份计划。',
              'Selepas satu hari dirancang, tekan lama tarikh pada jalur tarikh atau kalendar, kemudian pilih satu atau lebih tarikh sasaran untuk menggunakannya semula.'
            ),
          },
        ].filter(Boolean) as FeatureGuideStep[]).sort((a, b) => {
          const order: Record<string, number> = {
            'recipe-search': 1,
            'date-strip': 2,
            'copy-meal-plan': 3,
            'saved-recipes': 4,
            'generate-plan': 4,
          };

          return (order[a.key] || 99) - (order[b.key] || 99);
        })}
      />

      <Modal visible={showSavedRecipePicker} transparent animationType="fade" onRequestClose={closeSavedRecipePicker}>
        <Pressable style={styles.savedRecipeBackdrop} onPress={closeSavedRecipePicker}>
          <Pressable style={styles.savedRecipeModalCard} onPress={() => {}}>
            <View style={styles.savedRecipeModalHeader}>
              <View style={styles.savedRecipeModalIcon}>
                <Ionicons name="bookmark" size={20} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.savedRecipeModalTitle}>
                  {getText('Add from Saved Recipes', '从收藏食谱添加', 'Tambah daripada Resipi Tersimpan')}
                </Text>
                <Text style={styles.savedRecipeModalSubtitle}>
                  {getText(
                    'Choose a saved recipe first, then select Breakfast, Lunch, Dinner or Snack.',
                    '先选择一个收藏的食谱，再选择加入早餐、午餐、晚餐或加餐。',
                    'Pilih resipi tersimpan dahulu, kemudian pilih Sarapan, Makan Tengah Hari, Makan Malam atau Snek.'
                  )}
                </Text>
              </View>

              <Pressable style={styles.savedRecipeModalClose} onPress={closeSavedRecipePicker}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {savedRecipes.length > 0 ? (
              <ScrollView
                style={styles.savedRecipeListScroll}
                contentContainerStyle={styles.savedRecipeListContent}
                showsVerticalScrollIndicator={false}
              >
                {savedRecipes.map((savedRecipe: any, index: number) => {
                  const recipe = getSavedRecipeMeal(savedRecipe);
                  const savedKey = String(savedRecipe?.id || recipe.idMeal || `saved-${index}`);

                  return (
                    <View key={savedKey} style={styles.savedRecipeItemCard}>
                      <Pressable style={styles.savedRecipeMain} onPress={() => openSavedRecipeDetail(savedRecipe)}>
                        {recipe.strMealThumb ? (
                          <Image source={{ uri: recipe.strMealThumb }} style={styles.savedRecipeImage} />
                        ) : (
                          <View style={styles.savedRecipeImageFallback}>
                            <Text style={styles.savedRecipeEmoji}>
                              {recipe.mealIconEmoji || guessMealEmoji(getMealName(recipe, language), getMealCategory(recipe, language, ''))}
                            </Text>
                          </View>
                        )}

                        <View style={styles.savedRecipeInfo}>
                          <Text style={styles.savedRecipeName} numberOfLines={2}>{getMealName(recipe, language)}</Text>
                          <Text style={styles.savedRecipeMeta} numberOfLines={1}>
                            {getMealCategory(recipe, language, getText('Recipe', '食谱', 'Resipi'))}
                            {getMealArea(recipe, language, '') ? ` · ${getMealArea(recipe, language, '')}` : ''}
                          </Text>
                          <Text style={styles.savedRecipeNutrition} numberOfLines={1}>
                            {round(recipe.totalEnergyKcal)} kcal · {getText('Protein', '蛋白质', 'Protein')} {formatGramValue(recipe.totalProteinG, language)}
                          </Text>
                        </View>
                      </Pressable>

                      <View style={styles.savedRecipeActions}>
                        <Pressable style={styles.savedRecipeViewButton} onPress={() => openSavedRecipeDetail(savedRecipe)}>
                          <Ionicons name="book-outline" size={15} color="#3BA76D" />
                          <Text style={styles.savedRecipeViewButtonText}>{getText('View', '查看', 'Lihat')}</Text>
                        </Pressable>

                        <Pressable style={styles.savedRecipeAddButton} onPress={() => addSavedRecipeToPlan(savedRecipe)}>
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.savedRecipeAddButtonText}>{getText('Add to Meal Plan', '加入膳食计划', 'Tambah ke Pelan Makanan')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.savedRecipeEmptyState}>
                <Text style={styles.savedRecipeEmptyEmoji}>🔖</Text>
                <Text style={styles.savedRecipeEmptyTitle}>
                  {getText('No saved recipes yet', '还没有收藏食谱', 'Belum ada resipi tersimpan')}
                </Text>
                <Text style={styles.savedRecipeEmptyText}>
                  {getText(
                    'Open a recipe and tap Save Recipe. It will appear here for quick meal-plan adding.',
                    '打开食谱后点击“收藏食谱”，之后就可以在这里快速加入膳食计划。',
                    'Buka resipi dan tekan Simpan Resipi. Resipi itu akan muncul di sini untuk ditambah dengan cepat.'
                  )}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showMealSlotPicker} transparent animationType="fade" onRequestClose={closeMealSlotPicker}>
        <Pressable style={styles.mealSlotPickerBackdrop} onPress={closeMealSlotPicker}>
          <Pressable style={styles.mealSlotPickerCard} onPress={() => {}}>
            <View style={styles.mealSlotPickerHeader}>
              <View style={styles.mealSlotPickerIcon}>
                <Ionicons name="restaurant-outline" size={20} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.mealSlotPickerTitle}>
                  {getText('Choose a meal time', '选择加入哪一餐', 'Pilih waktu hidangan')}
                </Text>
                <Text style={styles.mealSlotPickerSubtitle}>
                  {getText(
                    'You can add multiple recipes to the same meal time.',
                    '同一个餐次可以加入多个食谱。',
                    'Anda boleh menambah beberapa resipi pada waktu hidangan yang sama.'
                  )}
                </Text>
              </View>

              <Pressable style={styles.mealSlotPickerClose} onPress={closeMealSlotPicker}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {mealToAdd && (
              <View style={styles.mealSlotPickerPreview}>
                {mealToAdd.strMealThumb ? (
                  <Image source={{ uri: mealToAdd.strMealThumb }} style={styles.mealSlotPickerPreviewImage} />
                ) : (
                  <View style={styles.mealSlotPickerPreviewFallback}>
                    <Text style={styles.mealSlotPickerPreviewEmoji}>
                      {mealToAdd.mealIconEmoji || guessMealEmoji(getMealName(mealToAdd, language), getMealCategory(mealToAdd, language, ''))}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.mealSlotPickerPreviewTitle} numberOfLines={2}>
                    {getMealName(mealToAdd, language)}
                  </Text>
                  <Text style={styles.mealSlotPickerPreviewMeta}>
                    {round(mealToAdd.totalEnergyKcal)} kcal · {getText('Selected date', '所选日期', 'Tarikh dipilih')}: {selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.mealSlotPickerOptions}>
              {SLOT_ORDER.map((slot) => {
                const count = selectedDayPlan[slot]?.length || 0;
                return (
                  <Pressable key={slot} style={styles.mealSlotPickerOption} onPress={() => addMealToSelectedSlot(slot)}>
                    <View style={styles.mealSlotPickerOptionLeft}>
                      <View style={styles.mealSlotPickerOptionIconWrap}>
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primaryDark} />
                      </View>
                      <View>
                        <Text style={styles.mealSlotPickerOptionTitle}>{getSlotLabel(slot)}</Text>
                        <Text style={styles.mealSlotPickerOptionSub}>
                          {getText(
                            count === 0 ? 'No recipes yet' : `${count} recipe${count === 1 ? '' : 's'} already added`,
                            count === 0 ? '还没有食谱' : `已有 ${count} 个食谱`,
                            count === 0 ? 'Belum ada resipi' : `${count} resipi sudah ditambah`
                          )}
                        </Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <View style={styles.calendarHero}>
              <View>
                <Text style={styles.calendarHeroLabel}>{getText('Select date', '选择日期', 'Pilih tarikh')}</Text>
                <Text style={styles.calendarHeroTitle}>{calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</Text>
              </View>
              <Pressable style={styles.calendarCloseButton} onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.primaryDark} />
              </Pressable>
              <Pressable style={styles.calendarTodayButton} onPress={goToday}>
                <Ionicons name="sunny-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.calendarTodayText}>{getText('Today', '今天', 'Hari Ini')}</Text>
              </Pressable>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.primaryDark} />
              </Pressable>
            </View>

            {copySourceKey && (
              <View style={styles.calendarCopyBanner}>
                <Ionicons name="copy-outline" size={15} color={theme.colors.primaryDark} />
                <Text style={styles.calendarCopyText}>
                  {getText(
                    `Copying ${formatCopyDateLabel(copySourceKey)}. Tap multiple dates. Selected: ${copyTargetKeys.length}`,
                    `正在复制 ${formatCopyDateLabel(copySourceKey)}，可点选多个日期。已选：${copyTargetKeys.length}`,
                    `Sedang menyalin ${formatCopyDateLabel(copySourceKey)}. Ketik beberapa tarikh. Dipilih: ${copyTargetKeys.length}`
                  )}
                </Text>
                <Pressable
                  style={[styles.calendarCopyConfirmButton, copyTargetKeys.length === 0 && styles.copyConfirmButtonDisabled]}
                  onPress={() => confirmCopyMealPlanToTargets(copyTargetKeys, true)}
                >
                  <Text style={styles.calendarCopyConfirmText}>{getText('Confirm', '确认', 'Sahkan')}</Text>
                </Pressable>
                <Pressable onPress={cancelCopyMealPlan}>
                  <Text style={styles.calendarCopyCancelText}>{getText('Cancel', '取消', 'Batal')}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.weekRow}>
              {[getText('Mon', '周一', 'Isn'), getText('Tue', '周二', 'Sel'), getText('Wed', '周三', 'Rab'), getText('Thu', '周四', 'Kha'), getText('Fri', '周五', 'Jum'), getText('Sat', '周六', 'Sab'), getText('Sun', '周日', 'Aha')].map((day) => <Text key={day} style={styles.weekText}>{day}</Text>)}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                  {week.map((date) => {
                    const key = formatDateKey(date);
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    const statusInfo = getCalendarStatus(mealPlans[key], currentTargets);
                    return (
                      <CalendarDateCell
                        key={key}
                        date={date}
                        isCurrentMonth={isCurrentMonth}
                        isSelected={isSelected}
                        isToday={isToday}
                        status={statusInfo.status}
                        progress={statusInfo.progress}
                        isCopySource={copySourceKey === key}
                        isCopyTarget={copyTargetKeys.includes(key)}
                        setCellRef={(node) => setDateCardRef(key, node)}
                        onLayout={() => measureDateCard(key)}
                        onPress={() => handleDatePress(date, true)}
                        onLongPress={() => startCopyMealPlan(date)}
                        onPressOut={(event) => handleCopyPressOut(key, event)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.calendarFooter}>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.tooMuch }]} /><Text style={styles.calendarLegendText}>{getText('Too much', '吃多了', 'Terlalu Banyak')}</Text></View>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.good }]} /><Text style={styles.calendarLegendText}>{getText('Good', '正常', 'Baik')}</Text></View>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.tooLittle }]} /><Text style={styles.calendarLegendText}>{getText('Too little', '吃少了', 'Terlalu Sedikit')}</Text></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </Screen>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  mealEditorialHeader: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: themeColors.primaryLight,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  mealHeaderBubbleLarge: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.40)',
    right: -60,
    top: -66,
  },
  mealHeaderBubbleSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.26)',
    left: -44,
    bottom: -64,
  },
  mealHeaderBubbleOutline: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(38,122,77,0.16)',
    right: 26,
    bottom: -28,
  },
  mealHeaderTitleRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mealHeaderTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  mealHeaderTitle: {
    color: themeColors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  mealHeaderSubtitle: {
    marginTop: 4,
    color: themeColors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  mealHeaderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  content: { padding: 16, paddingBottom: 120, gap: 16 },
  searchOuterCard: { backgroundColor: themeColors.card, borderRadius: 28, padding: 14, shadowColor: themeColors.shadow, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  searchInnerCard: { minHeight: 48, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: themeColors.text, fontSize: 15 },
  searchClear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  suggestionBox: { marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: themeColors.card },
  suggestionStatus: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionStatusText: { color: themeColors.muted, fontWeight: '700' },
  suggestionErrorText: { flex: 1, color: '#B91C1C', fontWeight: '700' },
  suggestionItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  suggestionMain: { flexDirection: 'row', gap: 12 },
  suggestionImage: { width: 66, height: 66, borderRadius: 16, backgroundColor: themeColors.border },
  suggestionImageFallback: { width: 66, height: 66, borderRadius: 16, backgroundColor: themeColors.border, alignItems: 'center', justifyContent: 'center' },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '900', color: themeColors.text, lineHeight: 20 },
  suggestionMeta: { marginTop: 3, color: themeColors.muted, fontSize: 12 },
  suggestionNutrition: { marginTop: 6, color: themeColors.primaryDark, fontWeight: '700', fontSize: 12, lineHeight: 17 },
  suggestionActions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  suggestionButton: { flex: 1, height: 38, borderRadius: 999, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: themeColors.card },
  suggestionViewButton: { borderColor: '#3BA76D' },
  suggestionWatchButton: { borderColor: '#FF3B30' },
  suggestionButtonText: { fontSize: 12, fontWeight: '800' },
  suggestionAddButton: { flex: 1, height: 38, borderRadius: 999, backgroundColor: themeColors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  suggestionAddText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  dateContainer: { backgroundColor: themeColors.card, borderRadius: 28, padding: 14, shadowColor: themeColors.shadow, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  dateTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateTitle: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  dateSubtitle: { marginTop: 2, fontSize: 12, color: themeColors.muted, fontWeight: '600' },
  dateActionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  calendarButton: { height: 36, borderRadius: 18, backgroundColor: themeColors.primaryLight, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  calendarButtonText: { color: themeColors.primaryDark, fontWeight: '900', fontSize: 12 },
  fixedDateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  scrollableDateRow: { gap: 6, paddingRight: 6 },
  dateCard: { minHeight: 78, borderRadius: 15, backgroundColor: '#F7F7F5', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  dateCardActive: { backgroundColor: '#57B56E' },
  dateCardSelectedWithPlan: { borderWidth: 2, borderColor: '#0F172A' },
  dateDay: { fontSize: 11, fontWeight: '800', color: '#1F3B5A' },
  dateNumber: { marginTop: 4, fontSize: 21, lineHeight: 24, fontWeight: '900', color: themeColors.text },
  dateTextActive: { color: '#FFFFFF' },
  dateToday: { marginTop: 3, fontSize: 9, fontWeight: '800', color: '#57B56E' },
  dateTodayActive: { color: '#FFFFFF' },
  dateLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12 },
  dateLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateLegendDot: { width: 8, height: 8, borderRadius: 4 },
  dateLegendText: { fontSize: 11, color: themeColors.muted, fontWeight: '700' },
  nutritionCard: { backgroundColor: themeColors.card, borderRadius: 28, padding: 18, shadowColor: themeColors.shadow, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  nutritionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutritionTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  nutritionSubtitle: { marginTop: 3, color: themeColors.muted, fontSize: 12, fontWeight: '600' },
  nutritionProgressText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  ringRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around' },
  ringBlock: { alignItems: 'center', flex: 1 },
  ringWrap: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringValueText: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  ringLabel: { marginTop: 6, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  ringTarget: { marginTop: 2, fontSize: 12, color: themeColors.muted, fontWeight: '600' },
  planWrapper: { backgroundColor: themeColors.card, borderRadius: 28, padding: 18, shadowColor: themeColors.shadow, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  planHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  planHeaderActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 1, minWidth: 0, flexWrap: 'wrap' },
  savedRecipeButton: { height: 34, maxWidth: 124, borderRadius: 17, backgroundColor: themeColors.primaryLight, borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 1, overflow: 'hidden' },
  savedRecipeButtonText: { color: themeColors.primaryDark, fontSize: 11, lineHeight: 13, fontWeight: '900', flexShrink: 1, minWidth: 0 },
  planTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: '#111827' },
  clearPlanButton: { height: 34, maxWidth: 118, borderRadius: 17, backgroundColor: '#FEF2F2', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 1, overflow: 'hidden' },
  clearPlanButtonText: { color: '#EF4444', fontSize: 11, lineHeight: 13, fontWeight: '900', flexShrink: 1, minWidth: 0 },
  aiHint: { marginTop: 3, fontSize: 12, color: themeColors.muted, fontWeight: '700' },
  refreshButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.card },
  refreshButtonGenerating: { backgroundColor: themeColors.primaryLight, borderColor: '#BBF7D0' },
  preferenceBox: { marginTop: 14, minHeight: 48, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  preferenceInput: { flex: 1, color: themeColors.text, fontSize: 14 },
  planShoppingText: { marginTop: 10, color: '#4EA96B', fontSize: 14, fontWeight: '600' },
  preferenceBanner: { marginTop: 14, backgroundColor: '#E7F4EA', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 },
  preferenceBannerText: { color: '#2E8B57', fontWeight: '700', fontSize: 14 },
  generatingCard: { marginTop: 18, borderRadius: 22, backgroundColor: themeColors.surfaceAlt, padding: 26, alignItems: 'center' },
  generatingTitle: { marginTop: 14, fontSize: 17, fontWeight: '900', color: '#1F2937' },
  generatingText: { marginTop: 8, color: themeColors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
  generatePlanButton: { marginTop: 18, height: 44, borderRadius: 18, backgroundColor: themeColors.primaryDark, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  generatePlanButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  generateErrorText: { marginTop: 12, color: '#B91C1C', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyMealPlanCard: { marginTop: 18, borderRadius: 22, backgroundColor: themeColors.surfaceAlt, padding: 24, alignItems: 'center' },
  emptyMealPlanEmoji: { fontSize: 40 },
  emptyMealPlanTitle: { marginTop: 10, fontSize: 16, fontWeight: '900', color: '#1F2937' },
  emptyMealPlanText: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  mealSection: { marginTop: 18 },
  mealSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealCardBlock: { marginTop: 12 },
  mealItemHeaderRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealItemBadge: { minHeight: 28, borderRadius: 14, backgroundColor: themeColors.primaryLight, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  mealItemBadgeText: { color: themeColors.primaryDark, fontSize: 12, fontWeight: '900' },
  mealSectionTitle: { fontSize: 16, fontWeight: '900', color: themeColors.text },
  mealSectionSub: { marginTop: 2, fontSize: 13, color: themeColors.muted },
  smallIconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  mealCard: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: themeColors.card, padding: 14, flexDirection: 'row', gap: 12 },
  mealImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: themeColors.border },
  mealImageFallback: { width: 80, height: 80, borderRadius: 16, backgroundColor: themeColors.border, alignItems: 'center', justifyContent: 'center' },
  fallbackEmoji: { fontSize: 30 },
  mealContent: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '900', color: themeColors.text, lineHeight: 22 },
  macroTagRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  macroCarb: { backgroundColor: '#FFF1E8' },
  macroProtein: { backgroundColor: '#EEF4FF' },
  macroFat: { backgroundColor: '#EAF8EE' },
  macroTagText: { fontSize: 12, fontWeight: '700' },
  mealButtonRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 42, borderRadius: 999, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: themeColors.card, paddingHorizontal: 8 },
  viewButton: { borderColor: '#3BA76D' },
  watchButton: { borderColor: '#FF3B30' },
  actionButtonText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  replaceLink: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  replaceLinkText: { color: themeColors.primaryDark, fontSize: 13, fontWeight: '700' },
  aiModalOverlay: { flex: 1, backgroundColor: themeColors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  aiModalCard: { width: '100%', maxWidth: 420, backgroundColor: themeColors.card, borderRadius: 28, padding: 18 },
  aiModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiModalIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: themeColors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  aiModalTitle: { color: themeColors.text, fontSize: 18, fontWeight: '900' },
  aiModalSubtitle: { marginTop: 3, color: themeColors.muted, fontSize: 12, fontWeight: '600' },
  aiModalClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: themeColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  aiModalLabel: { marginTop: 16, marginBottom: 8, color: themeColors.text, fontSize: 13, fontWeight: '900' },
  aiPromptBox: { minHeight: 52, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiPromptInput: { flex: 1, color: themeColors.text, fontSize: 14, maxHeight: 90 },
  aiMealPlanHint: { marginTop: 8, color: themeColors.muted, fontSize: 12, fontWeight: '700' },
  daySelectorRow: { flexDirection: 'row', gap: 8 },
  dayChip: { flex: 1, height: 38, borderRadius: 14, backgroundColor: themeColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: themeColors.primaryDark },
  dayChipText: { color: themeColors.muted, fontSize: 14, fontWeight: '900' },
  dayChipTextActive: { color: '#FFFFFF' },
  generateHomeButton: { marginTop: 16, height: 48, borderRadius: 18, backgroundColor: themeColors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateHomeButtonLoading: { opacity: 0.85 },
  generateHomeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  aiMealPlanError: { marginTop: 10, color: '#B91C1C', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  savedRecipeBackdrop: { flex: 1, backgroundColor: themeColors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  savedRecipeModalCard: { width: '100%', maxWidth: 440, maxHeight: '84%', backgroundColor: themeColors.card, borderRadius: 28, padding: 18, shadowColor: themeColors.shadow, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  savedRecipeModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  savedRecipeModalIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: themeColors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  savedRecipeModalTitle: { color: themeColors.text, fontSize: 18, fontWeight: '900', lineHeight: 24 },
  savedRecipeModalSubtitle: { marginTop: 4, color: themeColors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  savedRecipeModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  savedRecipeListScroll: { flexGrow: 0 },
  savedRecipeListContent: { gap: 12, paddingBottom: 4 },
  savedRecipeItemCard: { borderRadius: 20, backgroundColor: themeColors.surfaceAlt, borderWidth: 1, borderColor: themeColors.border, padding: 12 },
  savedRecipeMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedRecipeImage: { width: 62, height: 62, borderRadius: 17, backgroundColor: themeColors.border },
  savedRecipeImageFallback: { width: 62, height: 62, borderRadius: 17, backgroundColor: themeColors.border, alignItems: 'center', justifyContent: 'center' },
  savedRecipeEmoji: { fontSize: 28 },
  savedRecipeInfo: { flex: 1 },
  savedRecipeName: { color: themeColors.text, fontSize: 15, fontWeight: '900', lineHeight: 21 },
  savedRecipeMeta: { marginTop: 3, color: themeColors.muted, fontSize: 12, fontWeight: '700' },
  savedRecipeNutrition: { marginTop: 4, color: themeColors.primaryDark, fontSize: 12, fontWeight: '800' },
  savedRecipeActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  savedRecipeViewButton: { minHeight: 38, borderRadius: 16, borderWidth: 1, borderColor: '#3BA76D', backgroundColor: themeColors.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savedRecipeViewButtonText: { color: '#3BA76D', fontSize: 12, fontWeight: '900' },
  savedRecipeAddButton: { flex: 1, minHeight: 38, borderRadius: 16, backgroundColor: themeColors.primaryDark, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savedRecipeAddButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', flexShrink: 1 },
  savedRecipeEmptyState: { minHeight: 220, borderRadius: 22, backgroundColor: themeColors.surfaceAlt, borderWidth: 1, borderColor: themeColors.border, padding: 22, alignItems: 'center', justifyContent: 'center' },
  savedRecipeEmptyEmoji: { fontSize: 42 },
  savedRecipeEmptyTitle: { marginTop: 12, color: themeColors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  savedRecipeEmptyText: { marginTop: 8, color: themeColors.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },

  mealSlotPickerBackdrop: { flex: 1, backgroundColor: themeColors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mealSlotPickerCard: { width: '100%', maxWidth: 430, backgroundColor: themeColors.card, borderRadius: 28, padding: 18, shadowColor: themeColors.shadow, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  mealSlotPickerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mealSlotPickerIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: themeColors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  mealSlotPickerTitle: { color: themeColors.text, fontSize: 18, fontWeight: '900', lineHeight: 24 },
  mealSlotPickerSubtitle: { marginTop: 4, color: themeColors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  mealSlotPickerClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  mealSlotPickerPreview: { marginTop: 16, borderRadius: 18, backgroundColor: themeColors.surfaceAlt, borderWidth: 1, borderColor: themeColors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealSlotPickerPreviewImage: { width: 58, height: 58, borderRadius: 16, backgroundColor: themeColors.border },
  mealSlotPickerPreviewFallback: { width: 58, height: 58, borderRadius: 16, backgroundColor: themeColors.border, alignItems: 'center', justifyContent: 'center' },
  mealSlotPickerPreviewEmoji: { fontSize: 28 },
  mealSlotPickerPreviewTitle: { color: themeColors.text, fontSize: 15, fontWeight: '900', lineHeight: 21 },
  mealSlotPickerPreviewMeta: { marginTop: 4, color: themeColors.muted, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  mealSlotPickerOptions: { marginTop: 16, gap: 10 },
  mealSlotPickerOption: { minHeight: 62, borderRadius: 18, borderWidth: 1, borderColor: themeColors.border, backgroundColor: themeColors.card, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealSlotPickerOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mealSlotPickerOptionIconWrap: { width: 38, height: 38, borderRadius: 14, backgroundColor: themeColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  mealSlotPickerOptionTitle: { color: themeColors.text, fontSize: 15, fontWeight: '900' },
  mealSlotPickerOptionSub: { marginTop: 3, color: themeColors.muted, fontSize: 12, fontWeight: '700' },

  calendarBackdrop: { flex: 1, backgroundColor: themeColors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  calendarModal: { width: '100%', maxWidth: 392, backgroundColor: themeColors.card, borderRadius: 30, overflow: 'hidden', shadowColor: themeColors.shadow, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  calendarHero: { backgroundColor: themeColors.primaryDark, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarHeroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  calendarHeroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  calendarCloseButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  calendarMonthRow: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  calendarTodayButton: { height: 40, borderRadius: 20, backgroundColor: themeColors.primaryLight, borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarTodayText: { color: themeColors.primaryDark, fontSize: 13, fontWeight: '900' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  weekText: { flex: 1, color: themeColors.muted, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  calendarGrid: { paddingHorizontal: 14, paddingBottom: 10 },
  calendarWeekRow: { flexDirection: 'row', width: '100%', height: 48 },
  calendarCell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  calendarDateWrap: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  calendarRingSvg: { position: 'absolute' },
  calendarRingNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calendarDateCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calendarDateToday: { borderWidth: 1.8, borderColor: themeColors.primaryDark, backgroundColor: themeColors.card },
  calendarDateSelected: { backgroundColor: themeColors.primaryDark, borderWidth: 0 },
  calendarDateText: { color: themeColors.text, fontSize: 14, fontWeight: '800' },
  calendarDateMuted: { color: '#CBD5E1' },
  calendarDateTodayText: { color: themeColors.primaryDark, fontWeight: '900' },
  calendarDateTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  calendarNutritionDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  calendarFooter: { borderTopWidth: 1, borderTopColor: themeColors.border, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  calendarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarLegendStatusDot: { width: 10, height: 10, borderRadius: 5 },
  calendarLegendText: { color: themeColors.muted, fontSize: 12, fontWeight: '700' },
  dateCardCopySource: { borderWidth: 2, borderColor: '#0F172A', transform: [{ scale: 1.03 }] },
  dateCardCopyTarget: { borderWidth: 2, borderColor: themeColors.primaryDark, backgroundColor: '#22C55E' },
  copyModeBanner: { marginTop: 12, borderRadius: 18, backgroundColor: themeColors.primaryLight, borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyModeText: { flex: 1, color: themeColors.primaryDark, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  copyConfirmButton: { minHeight: 28, borderRadius: 14, backgroundColor: themeColors.primaryDark, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  copyConfirmButtonDisabled: { opacity: 0.45 },
  copyConfirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  copyCancelButton: { minHeight: 28, borderRadius: 14, backgroundColor: themeColors.card, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  copyCancelText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
  calendarDateWrapCopySource: { borderRadius: 21, backgroundColor: themeColors.primaryLight, borderWidth: 2, borderColor: themeColors.primaryDark },
  calendarDateWrapCopyTarget: { borderRadius: 21, backgroundColor: '#DCFCE7', borderWidth: 2, borderColor: '#22C55E' },
  calendarCopyBanner: { marginHorizontal: 18, marginBottom: 8, borderRadius: 16, backgroundColor: themeColors.primaryLight, borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  calendarCopyText: { flex: 1, color: themeColors.primaryDark, fontSize: 11, fontWeight: '800', lineHeight: 16 },
  calendarCopyConfirmButton: { minHeight: 26, borderRadius: 13, backgroundColor: themeColors.primaryDark, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  calendarCopyConfirmText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  calendarCopyCancelText: { color: '#EF4444', fontSize: 11, fontWeight: '900' },

});
