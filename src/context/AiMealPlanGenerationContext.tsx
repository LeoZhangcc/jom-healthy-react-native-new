import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useChildProfile } from './ChildProfileContext';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { generateMealPlanByAi } from '../services/api';

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
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
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

type OpenAiMealPlanModalOptions = {
  startDate?: Date;
  defaultPrompt?: string;
  defaultDays?: number;
};

type AiMealPlanGenerationContextValue = {
  openAiMealPlanModal: (options?: OpenAiMealPlanModalOptions) => void;
  isGeneratingMealPlan: boolean;
  isMealPlanReady: boolean;
  lastGeneratedAt: number;
};

const AiMealPlanGenerationContext = createContext<AiMealPlanGenerationContextValue | null>(null);

const MEAL_PLANS_STORAGE_KEY = 'JOMHEALTHY_MEAL_PLANS_BY_OWNER_V1';
const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';
const SLOT_ORDER: MealSlotKey[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TARGETS = {
  carbs: 155,
  protein: 32,
  fat: 28,
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

function translateMealName(name: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const text = String(name || '').trim();

  if (!text || lang === 'en') return text;

  const replacements = lang === 'zh'
    ? [
        [/\bfried rice\b/gi, '炒饭'],
        [/\bchicken rice\b/gi, '鸡饭'],
        [/\bfried noodle(s)?\b/gi, '炒面'],
        [/\bnoodle(s)?\b/gi, '面'],
        [/\brice\b/gi, '米饭'],
        [/\bchicken\b/gi, '鸡肉'],
        [/\bbeef\b/gi, '牛肉'],
        [/\bfish\b/gi, '鱼'],
        [/\begg(s)?\b/gi, '鸡蛋'],
        [/\bvegetable(s)?\b/gi, '蔬菜'],
        [/\bsoup\b/gi, '汤'],
        [/\bporridge\b/gi, '粥'],
        [/\bsalad\b/gi, '沙拉'],
        [/\bsandwich\b/gi, '三明治'],
        [/\bbread\b/gi, '面包'],
        [/\bpasta\b/gi, '意面'],
        [/\bcurry\b/gi, '咖喱'],
        [/\bgrilled\b/gi, '烤'],
        [/\bsteamed\b/gi, '蒸'],
        [/\bbaked\b/gi, '烘烤'],
        [/\bstir fried\b/gi, '炒'],
        [/\bhealthy\b/gi, '健康'],
      ]
    : [
        [/\bfried rice\b/gi, 'nasi goreng'],
        [/\bchicken rice\b/gi, 'nasi ayam'],
        [/\bfried noodle(s)?\b/gi, 'mi goreng'],
        [/\bnoodle(s)?\b/gi, 'mi'],
        [/\brice\b/gi, 'nasi'],
        [/\bchicken\b/gi, 'ayam'],
        [/\bbeef\b/gi, 'daging lembu'],
        [/\bfish\b/gi, 'ikan'],
        [/\begg(s)?\b/gi, 'telur'],
        [/\bvegetable(s)?\b/gi, 'sayur-sayuran'],
        [/\bsoup\b/gi, 'sup'],
        [/\bporridge\b/gi, 'bubur'],
        [/\bsalad\b/gi, 'salad'],
        [/\bsandwich\b/gi, 'sandwic'],
        [/\bbread\b/gi, 'roti'],
        [/\bpasta\b/gi, 'pasta'],
        [/\bcurry\b/gi, 'kari'],
        [/\bgrilled\b/gi, 'panggang'],
        [/\bsteamed\b/gi, 'kukus'],
        [/\bbaked\b/gi, 'bakar'],
        [/\bstir fried\b/gi, 'tumis'],
        [/\bhealthy\b/gi, 'sihat'],
      ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), text).replace(/\s+/g, ' ').trim();
}

function buildMealLanguageInstruction(language: string) {
  const lang = normalizeLanguageCode(language);

  if (lang === 'zh') {
    return 'Return meal names, categories, ingredients and instructions in Simplified Chinese when possible, while keeping food identifiers accurate.';
  }

  if (lang === 'ms') {
    return 'Return meal names, categories, ingredients and instructions in Malay when possible, while keeping food identifiers accurate.';
  }

  return 'Return meal names, categories, ingredients and instructions in English.';
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
  const sourceName = meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.name || meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.nameEn || defaultMealEn;
  const sourceCategory = meal?.strCategory || meal?.category || defaultCategoryEn;
  const sourceArea = meal?.strArea || meal?.area || defaultAreaEn;

  const mealNameZh = meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || (sourceName === defaultMealEn ? defaultMealCn : translateMealName(sourceName, 'zh'));
  const mealNameMs = meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || meal?.nameMs || (sourceName === defaultMealEn ? defaultMealMs : translateMealName(sourceName, 'ms'));
  const categoryNameZh = meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || (sourceCategory === defaultCategoryEn ? defaultCategoryCn : translateMealName(sourceCategory, 'zh'));
  const categoryNameMs = meal?.strCategoryMs || meal?.categoryMs || (sourceCategory === defaultCategoryEn ? defaultCategoryMs : translateMealName(sourceCategory, 'ms'));
  const areaNameZh = meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || (sourceArea === defaultAreaEn ? defaultAreaCn : translateMealName(sourceArea, 'zh'));
  const areaNameMs = meal?.strAreaMs || meal?.areaMs || (sourceArea === defaultAreaEn ? defaultAreaMs : translateMealName(sourceArea, 'ms'));

  return {
    idMeal: meal?.idMeal || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strMeal: sourceName,
    strMealEn: meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.nameEn || meal?.name || sourceName,
    strMealCn: mealNameZh,
    strMealMs: mealNameMs,
    nameEn: meal?.nameEn || meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.name || sourceName,
    nameCn: meal?.nameCn || meal?.nameCN || meal?.nameZh || meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || mealNameZh,
    nameMs: meal?.nameMs || meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || mealNameMs,
    strCategory: sourceCategory,
    strCategoryEn: meal?.strCategoryEn || meal?.strCategory || meal?.categoryEn || meal?.category || sourceCategory,
    strCategoryCn: categoryNameZh,
    strCategoryMs: categoryNameMs,
    strArea: sourceArea,
    strAreaEn: meal?.strAreaEn || meal?.strArea || meal?.areaEn || meal?.area || sourceArea,
    strAreaCn: areaNameZh,
    strAreaMs: areaNameMs,
    strInstructions: meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || '',
    strInstructionsEn: meal?.strInstructionsEn || meal?.instructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || '',
    strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh || '',
    strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || meal?.methodMs || meal?.directionsMs || '',
    instructionsEn: meal?.instructionsEn || meal?.strInstructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || '',
    instructionsCn: meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh || '',
    instructionsMs: meal?.instructionsMs || meal?.strInstructionsMs || meal?.methodMs || meal?.directionsMs || '',
    strMealThumb: isValidImageUrl(rawImageUrl) ? rawImageUrl : null,
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
          foodNameEn: item.foodNameEn || item.name || item.ingredientName || '',
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

function extractGeneratedDayPlans(responseData: any, requestedDays: number): any[] {
  const data = responseData?.data || responseData || {};
  const directPlan = data?.plan || data?.mealPlan || data;

  const arrayCandidates = [
    data?.plans,
    data?.mealPlans,
    data?.days,
    directPlan?.plans,
    directPlan?.mealPlans,
    directPlan?.days,
    Array.isArray(directPlan) ? directPlan : null,
  ].find((value) => Array.isArray(value));

  if (Array.isArray(arrayCandidates)) {
    return arrayCandidates
      .map((item) => item?.plan || item?.mealPlan || item)
      .filter((item) => item && typeof item === 'object')
      .slice(0, requestedDays);
  }

  if (directPlan && typeof directPlan === 'object') {
    const dayEntries = Object.entries(directPlan)
      .filter(([key, value]) => {
        const normalizedKey = String(key || '').trim().toLowerCase();
        const looksLikeDayKey =
          /^day\s*\d+$/.test(normalizedKey) ||
          /^day_?\d+$/.test(normalizedKey) ||
          /^\d+$/.test(normalizedKey);

        return looksLikeDayKey && value && typeof value === 'object';
      })
      .sort(([left], [right]) => {
        const leftNumber = Number(String(left).match(/\d+/)?.[0] || 0);
        const rightNumber = Number(String(right).match(/\d+/)?.[0] || 0);
        return leftNumber - rightNumber;
      })
      .map(([, value]) => (value as any)?.plan || (value as any)?.mealPlan || value);

    if (dayEntries.length > 0) {
      return dayEntries.slice(0, requestedDays);
    }
  }

  return directPlan && typeof directPlan === 'object' ? [directPlan] : [];
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
    zh: { g: '克', gram: '克', grams: '克', kg: '公斤', kilogram: '公斤', kilograms: '公斤', ml: '毫升', milliliter: '毫升', milliliters: '毫升', millilitre: '毫升', millilitres: '毫升', l: '升', liter: '升', liters: '升', litre: '升', litres: '升' },
    ms: { g: 'gram', gram: 'gram', grams: 'gram', kg: 'kilogram', kilogram: 'kilogram', kilograms: 'kilogram', ml: 'mL', milliliter: 'mL', milliliters: 'mL', millilitre: 'mL', millilitres: 'mL', l: 'L', liter: 'L', liters: 'L', litre: 'L', litres: 'L' },
  };

  return raw.replace(
    /(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|grams?|ml|milliliters?|millilitres?|l|liters?|litres?)\b/gi,
    (_match, amount, unit) => `${amount}${unitLabels[language]?.[String(unit).toLowerCase()] || unit}`
  );
}

function getSlotLabel(slot: MealSlotKey, language: string) {
  if (language === 'zh') return slot === 'Breakfast' ? '早餐' : slot === 'Lunch' ? '午餐' : slot === 'Dinner' ? '晚餐' : '加餐';
  if (language === 'ms') return slot === 'Breakfast' ? 'Sarapan' : slot === 'Lunch' ? 'Makan Tengah Hari' : slot === 'Dinner' ? 'Makan Malam' : 'Snek';
  return slot;
}

function getMealNameByLanguage(meal: any, language: string) {
  if (language === 'zh') return meal?.strMealCn || meal?.nameCn || meal?.strMeal || 'Recipe';
  if (language === 'ms') return meal?.strMealMs || meal?.nameMs || meal?.strMeal || 'Recipe';
  return meal?.strMealEn || meal?.strMeal || meal?.name || 'Recipe';
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
  ) {
    return 'vegetables';
  }

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
  ) {
    return 'protein';
  }

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
  ) {
    return 'carbs';
  }

  return 'others';
}

async function generateShoppingListByOwner(allMealPlans: Record<string, Record<string, MealPlanForDay>>) {
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
              const name = normalizeIngredientName(ingredient);
              const nameCn = ingredient.foodNameCn || ingredient.foodNameCN || ingredient.foodNameZh || ingredient.nameCn || '';
              const nameMs = ingredient.foodNameMs || ingredient.nameMs || '';
              const quantity = normalizeIngredientQuantity(ingredient);
              const quantityCn = localizeMeasureText(quantity, 'zh');
              const quantityMs = localizeMeasureText(quantity, 'ms');
              const category = classifyIngredientCategory(ingredient);
              const id = `${name.toLowerCase()}-${category}`.replace(/\s+/g, '-');
              const existing = mergedMap.get(id);
              const mealNameEn = getMealNameByLanguage(meal, 'en');
              const mealNameCn = getMealNameByLanguage(meal, 'zh');
              const mealNameMs = getMealNameByLanguage(meal, 'ms');
              const sourceEn = `${dateKey} · ${getSlotLabel(slot, 'en')}: ${mealNameEn}`;
              const sourceCn = `${dateKey} · ${getSlotLabel(slot, 'zh')}: ${mealNameCn}`;
              const sourceMs = `${dateKey} · ${getSlotLabel(slot, 'ms')}: ${mealNameMs}`;

              if (existing) {
                existing.quantity = [existing.quantity, quantity].filter(Boolean).join(' + ');
                existing.quantityCn = [existing.quantityCn, quantityCn].filter(Boolean).join(' + ');
                existing.quantityMs = [existing.quantityMs, quantityMs].filter(Boolean).join(' + ');
                existing.sourceEn = [existing.sourceEn, sourceEn].filter(Boolean).join(', ');
                existing.sourceCn = [existing.sourceCn, sourceCn].filter(Boolean).join(', ');
                existing.sourceMs = [existing.sourceMs, sourceMs].filter(Boolean).join(', ');
                if (!existing.source.includes(meal.strMeal)) {
                  existing.source += `, ${dateKey} · ${slot}: ${meal.strMeal}`;
                }
                return;
              }

              mergedMap.set(id, {
                id,
                name,
                nameEn: name,
                nameCn,
                nameMs,
                quantity,
                quantityCn,
                quantityMs,
                category,
                source: `${dateKey} · ${slot}: ${meal.strMeal}`,
                sourceEn,
                sourceCn,
                sourceMs,
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

export function AiMealPlanGenerationProvider({
  children,
  onViewMeal,
  currentRouteName,
}: {
  children: ReactNode;
  onViewMeal?: () => void;
  currentRouteName?: string;
}) {
  const { activeChild, getOwnerKey, nutritionNeeds } = useChildProfile();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [days, setDays] = useState(1);
  const [startDate, setStartDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState(0);

  const openAiMealPlanModal = (options?: OpenAiMealPlanModalOptions) => {
    setPrompt(options?.defaultPrompt || '');
    setDays(options?.defaultDays || 1);
    setStartDate(options?.startDate || new Date());
    setError('');
    setShowModal(true);
  };

  const generateMealPlan = async () => {
    if (generating) return;

    setShowModal(false);
    setGenerating(true);
    setReady(false);
    setError('');

    const ownerKey = getOwnerKey ? getOwnerKey() : activeChild?.id ? `child-${activeChild.id}` : 'guest';
    const targets = {
      carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
      protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
      fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
    };

    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      const allMealPlans: Record<string, Record<string, MealPlanForDay>> = normalizeMealPlansByOwner(raw ? JSON.parse(raw) : {});
      const ownerPlans = allMealPlans[ownerKey] || {};

      const result = await generateMealPlanByAi({
        childName: activeChild?.nickname || 'Guest',
        age: activeChild?.age || 7,
        gender: activeChild?.gender || 'boy',
        heightCm: activeChild?.height || 120,
        weightKg: activeChild?.weight || 20,
        allergies: activeChild?.allergies || [],
        restrictions: activeChild?.restrictions || {},
        targetCarbs: targets.carbs,
        targetProtein: targets.protein,
        targetFat: targets.fat,
        days,
        language: normalizeLanguageCode(language),
        mealPreference: prompt.trim()
          ? `${prompt.trim()}. Generate ${days} varied day${days > 1 ? 's' : ''} in one response. ${buildMealLanguageInstruction(language)}`
          : `Recommend by child profile. Generate ${days} varied day${days > 1 ? 's' : ''} in one response. ${buildMealLanguageInstruction(language)}`,
      });

      if (!result.ok) {
        throw new Error(result.message || 'Failed to generate meal plan.');
      }

      const generatedPlans = extractGeneratedDayPlans(result.data, days);

      if (generatedPlans.length < days) {
        throw new Error(
          `The backend returned ${generatedPlans.length} day${generatedPlans.length === 1 ? '' : 's'}, but ${days} day${days === 1 ? '' : 's'} were requested. Update the backend to return all requested days in one response.`
        );
      }

      generatedPlans.slice(0, days).forEach((plan, index) => {
        const targetDate = addDays(startDate, index);
        const dateKey = formatDateKey(targetDate);
        const nextDayPlan = normalizeDayPlan(plan);

        const hasAnyMeal = SLOT_ORDER.some((slot) => (nextDayPlan[slot]?.length || 0) > 0);
        if (!hasAnyMeal) {
          throw new Error(`AI did not return a valid meal plan for day ${index + 1}.`);
        }

        ownerPlans[dateKey] = nextDayPlan;
      });

      allMealPlans[ownerKey] = ownerPlans;
      await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(allMealPlans));
      await generateShoppingListByOwner(allMealPlans);

      setLastGeneratedAt(Date.now());

      if (currentRouteName === 'Meal') {
        setReady(false);
      } else {
        setReady(true);
      }
    } catch (err: any) {
      console.log('Global AI meal plan failed:', err);
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };


  const hideFloating = () => {
    const wasReady = ready;
    setReady(false);
    setError('');

    if (wasReady) {
      onViewMeal?.();
    }
  };

  useEffect(() => {
    if (ready && currentRouteName === 'Meal') {
      setReady(false);
      setError('');
    }
  }, [ready, currentRouteName]);

  const value = useMemo(
    () => ({
      openAiMealPlanModal,
      isGeneratingMealPlan: generating,
      isMealPlanReady: ready,
      lastGeneratedAt,
    }),
    [generating, ready, lastGeneratedAt]
  );

  const showFloating = generating || ready || !!error;

  return (
    <AiMealPlanGenerationContext.Provider value={value}>
      <View style={styles.rootWrap}>
        {children}

        {showFloating && (
          <Pressable
            style={[
              styles.floatingButton,
              ready && styles.floatingButtonReady,
              !!error && styles.floatingButtonError,
            ]}
            onPress={() => {
              if (generating) return;
              hideFloating();
            }}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name={ready ? 'checkmark-circle' : 'warning'} size={18} color="#FFFFFF" />
            )}

            <Text style={styles.floatingButtonText} numberOfLines={1}>
              {generating
                ? getText(
                    'Generating your meal plan...',
                    '正在生成你的膳食计划...',
                    'Sedang menjana pelan makanan anda...'
                  )
                : ready
                  ? getText(
                      'AI meal plan is ready. Tap to view.',
                      'AI 膳食计划已准备好，点击查看。',
                      'Pelan makanan AI sudah siap. Ketik untuk lihat.'
                    )
                  : getText(
                      'Generation failed. Tap to dismiss.',
                      '生成失败，点击关闭。',
                      'Penjanaan gagal. Ketik untuk tutup.'
                    )}
            </Text>
          </Pressable>
        )}

        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{getText('AI Meal Plan', 'AI 膳食计划', 'Pelan Makanan AI')}</Text>
                  <Text style={styles.modalSubtitle}>
                    {getText(
                      'Generate meals and shopping list automatically',
                      '自动生成餐食和购物清单',
                      'Jana hidangan dan senarai belian secara automatik'
                    )}
                  </Text>
                </View>

                <Pressable style={styles.modalClose} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.promptBox}>
                <Ionicons name="fast-food-outline" size={18} color={theme.colors.primaryDark} />
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={getText(
                    'What do you want to eat? e.g. chicken rice',
                    '想吃什么？例如鸡饭',
                    'Apa yang anda mahu makan? cth. nasi ayam'
                  )}
                  placeholderTextColor="#94A3B8"
                  style={styles.promptInput}
                  multiline
                />
                {prompt.length > 0 && (
                  <Pressable onPress={() => setPrompt('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              <Text style={styles.modalHint}>
                {getText(
                  'Leave blank to recommend by child profile.',
                  '留空将根据儿童资料推荐。',
                  'Biarkan kosong untuk cadangan berdasarkan profil kanak-kanak.'
                )}
              </Text>

              <View style={styles.modalSafetyNote}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.modalSafetyNoteText}>
                  {getText(
                    'AI meal plans support daily planning only. Review allergens, portion sizes and suitability before use.',
                    'AI 膳食计划仅用于日常规划辅助。使用前请检查过敏原、份量与适用性。',
                    'Pelan makanan AI hanya menyokong perancangan harian. Semak alergen, saiz hidangan dan kesesuaian sebelum digunakan.'
                  )}
                </Text>
              </View>

              <View style={styles.daySelectorRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, days === day && styles.dayChipActive]}
                    onPress={() => setDays(day)}
                  >
                    <Text style={[styles.dayChipText, days === day && styles.dayChipTextActive]}>{day}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.generateButton} onPress={generateMealPlan}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                  {getText(
                    `Generate ${days} Day${days > 1 ? 's' : ''} Meal Plan`,
                    `生成 ${days} 天膳食计划`,
                    `Jana Pelan Makanan ${days} Hari`
                  )}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AiMealPlanGenerationContext.Provider>
  );
}

export function useAiMealPlanGeneration() {
  const context = useContext(AiMealPlanGenerationContext);

  if (!context) {
    throw new Error('useAiMealPlanGeneration must be used inside AiMealPlanGenerationProvider');
  }

  return context;
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  rootWrap: {
    flex: 1,
  },

  floatingButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    minHeight: 50,
    borderRadius: 22,
    backgroundColor: themeColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 20,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  floatingButtonReady: {
    backgroundColor: themeColors.success,
  },

  floatingButtonError: {
    backgroundColor: themeColors.danger,
  },

  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    flexShrink: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: themeColors.card,
    borderRadius: 28,
    padding: 18,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: themeColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    color: themeColors.text,
    fontSize: 19,
    fontWeight: '900',
  },

  modalSubtitle: {
    marginTop: 3,
    color: themeColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptBox: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  promptInput: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
    maxHeight: 90,
  },

  modalHint: {
    marginTop: 8,
    color: themeColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  modalSafetyNote: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: themeColors.primaryLight,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  modalSafetyNoteText: {
    flex: 1,
    minWidth: 0,
    color: themeColors.primaryDark,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '800',
  },

  daySelectorRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },

  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: themeColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayChipActive: {
    backgroundColor: themeColors.primaryDark,
  },

  dayChipText: {
    color: themeColors.muted,
    fontSize: 14,
    fontWeight: '900',
  },

  dayChipTextActive: {
    color: '#FFFFFF',
  },

  generateButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 20,
    backgroundColor: themeColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
