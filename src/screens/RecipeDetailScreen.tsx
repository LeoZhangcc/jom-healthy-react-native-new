import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type Ingredient = {
  ingredientId?: number;
  mealId?: string;
  ingredientOrder?: number;
  ingredientName?: string;
  name?: string;
  measure?: string;
  quantity?: string;
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
  energyKcalPer100g?: number;
  proteinGPer100g?: number;
  carbohydrateGPer100g?: number;
  fatGPer100g?: number;
  category?: string;
  picUrl?: string;
};

type MealRecipe = {
  id?: string | number;
  idMeal?: string | number;
  strMeal?: string;
  strMealEn?: string | null;
  strMealCn?: string | null;
  strMealCN?: string | null;
  strMealZh?: string | null;
  strMealMs?: string | null;
  name?: string;
  nameEn?: string | null;
  nameCn?: string | null;
  nameCN?: string | null;
  nameZh?: string | null;
  nameMs?: string | null;
  type?: string;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strCategoryEn?: string | null;
  strCategoryCn?: string | null;
  strCategoryCN?: string | null;
  strCategoryZh?: string | null;
  strCategoryMs?: string | null;
  category?: string | null;
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
  area?: string | null;
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
  instructions?: string | null;
  instructionsEn?: string | null;
  instructionsCn?: string | null;
  instructionsCN?: string | null;
  instructionsZh?: string | null;
  instructionsMs?: string | null;
  steps?: string[];
  stepsEn?: string[];
  stepsCn?: string[];
  stepsCN?: string[];
  stepsZh?: string[];
  stepsMs?: string[];
  strMealThumb?: string | null;
  imageUrl?: string | null;
  mealIconEmoji?: string | null;
  mealIconName?: string | null;
  mealIconPrompt?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  youtubeUrl?: string | null;
  strSource?: string | null;
  totalEnergyKcal?: number;
  calories?: number;
  totalProteinG?: number;
  protein?: number;
  totalCarbohydrateG?: number;
  carbs?: number;
  totalFatG?: number;
  fat?: number;
  ingredients?: Ingredient[];
  [key: string]: any;
};

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value?: number) {
  return Math.round(safeNumber(value));
}

function isValidImageUrl(url?: string | null) {
  if (!url) return false;

  const lower = url.toLowerCase();

  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('chicken-rice.jpg')) return false;

  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp')
  );
}

function isValidYoutubeUrl(url?: string | null) {
  if (!url) return false;

  const lower = url.toLowerCase();

  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example')) return false;

  return (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be/') ||
    lower.includes('youtube.com/results?search_query=')
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
  if (text.includes('snack')) return '🍪';

  return '🍽️';
}

function getFoodGroupColor(group?: string | null) {
  const text = String(group || '').toLowerCase();

  if (text.includes('protein') || text.includes('meat') || text.includes('fish') || text.includes('egg')) {
    return '#2563EB';
  }

  if (text.includes('vegetable') || text.includes('fruit')) {
    return '#16A34A';
  }

  if (text.includes('carb') || text.includes('grain') || text.includes('rice') || text.includes('bread')) {
    return '#F97316';
  }

  return '#64748B';
}

function splitInstructions(value?: string | null, steps?: string[]) {
  // Regex to strip step markers at the beginning of a string.
  // Handles: "Step 1", "1", "1.", "1)", "Title:\n"
  const markerRegex = /^(?:\*\*|)[\s]*(?:(?:step|langkah|步骤)\s*\d+[:.)-]?|\d+[:.)-]?)(?:\*\*|)[\s]*|.*(?::|：)\s*\n/i;

  if (Array.isArray(steps) && steps.length > 0) {
    return steps
      .filter(Boolean)
      .map((item) => String(item).replace(markerRegex, '').trim())
      .filter(Boolean);
  }

  if (!value) return [];

  const text = String(value).trim();
  
  // Try to split by explicit markers like "Step 1", "1", "1.", "2)", etc. at the start of lines,
  // OR a short title ending with a colon that acts as a step heading.
  const splitRegex = /(?:\n|^)(?:\*\*|)[\s]*(?:(?:step|langkah|步骤)\s*\d+[:.)-]?|\d+[:.)-]?)\s*(?:\*\*|)[\s]*|(?:\n|^)[^\n:：]{1,40}(?::|：)[\s]*\n/i;
  
  if (splitRegex.test(text)) {
    let parts = text.split(splitRegex);
    
    // Some engines include the split match if there are capture groups, but we don't have capturing groups.
    // However, if the text STARTS with the split pattern, the first element is empty.
    let validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
    
    // Optionally ignore a leading "Instructions:" or "Directions:" title if it gets isolated
    if (validParts.length > 0) {
      if (validParts.length > 1 && /^(instructions|directions|method|做法|arahan)[:\s]*$/i.test(validParts[0])) {
         validParts.shift();
      }
      return validParts;
    }
  }

  // Fallback to splitting by paragraphs (newlines)
  const normalized = text
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map((item) => item.replace(markerRegex, '').trim())
    .filter((item) => item.length > 0);

  if (normalized.length > 0) return normalized;

  return [text.replace(markerRegex, '').trim()];
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
        [/\bbrown rice\b/gi, '糙米饭'],
        [/\brice\b/gi, '米饭'],
        [/\bchicken\b/gi, '鸡肉'],
        [/\bbeef\b/gi, '牛肉'],
        [/\bfish\b/gi, '鱼'],
        [/\bsalmon\b/gi, '三文鱼'],
        [/\btuna\b/gi, '金枪鱼'],
        [/\bshrimp\b/gi, '虾'],
        [/\bprawn\b/gi, '虾'],
        [/\begg(s)?\b/gi, '鸡蛋'],
        [/\btofu\b/gi, '豆腐'],
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
        [/\bbrown rice\b/gi, 'nasi perang'],
        [/\brice\b/gi, 'nasi'],
        [/\bchicken\b/gi, 'ayam'],
        [/\bbeef\b/gi, 'daging lembu'],
        [/\bfish\b/gi, 'ikan'],
        [/\bsalmon\b/gi, 'salmon'],
        [/\btuna\b/gi, 'tuna'],
        [/\bshrimp\b/gi, 'udang'],
        [/\bprawn\b/gi, 'udang'],
        [/\begg(s)?\b/gi, 'telur'],
        [/\btofu\b/gi, 'tauhu'],
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

function localizeEnglishInstructions(text: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const value = String(text || '').trim();
  if (!value || lang === 'en') return value;

  const replacements = lang === 'zh'
    ? [
        [/\bpreheat\b/gi, '预热'],
        [/\bheat\b/gi, '加热'],
        [/\badd\b/gi, '加入'],
        [/\bmix\b/gi, '混合'],
        [/\bstir\b/gi, '搅拌'],
        [/\bcook\b/gi, '烹煮'],
        [/\bboil\b/gi, '煮沸'],
        [/\bsimmer\b/gi, '小火煮'],
        [/\bsteam\b/gi, '蒸'],
        [/\bgrill\b/gi, '烤'],
        [/\bbake\b/gi, '烘烤'],
        [/\bfry\b/gi, '炒'],
        [/\bserve\b/gi, '盛出'],
        [/\buntil\b/gi, '直到'],
        [/\bminutes?\b/gi, '分钟'],
        [/\bseason\b/gi, '调味'],
      ]
    : [
        [/\bpreheat\b/gi, 'panaskan dahulu'],
        [/\bheat\b/gi, 'panaskan'],
        [/\badd\b/gi, 'masukkan'],
        [/\bmix\b/gi, 'campurkan'],
        [/\bstir\b/gi, 'kacau'],
        [/\bcook\b/gi, 'masak'],
        [/\bboil\b/gi, 'rebus'],
        [/\bsimmer\b/gi, 'reneh'],
        [/\bsteam\b/gi, 'kukus'],
        [/\bgrill\b/gi, 'panggang'],
        [/\bbake\b/gi, 'bakar'],
        [/\bfry\b/gi, 'goreng'],
        [/\bserve\b/gi, 'hidangkan'],
        [/\buntil\b/gi, 'sehingga'],
        [/\bminutes?\b/gi, 'minit'],
        [/\bseason\b/gi, 'perasakan'],
      ];

  return localizeEnglishMealText(
    replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), value),
    language
  );
}

function getLocalizedMealName(meal: any, language: string, fallback: string) {
  const localized = pickLocalizedValue(
    language,
    meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.nameEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.name,
    meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || meal?.nameCn || meal?.nameCN || meal?.nameZh,
    meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || meal?.nameMs,
    fallback
  );

  if (normalizeLanguageCode(language) === 'zh' || normalizeLanguageCode(language) === 'ms') {
    const sourceName = meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.nameEn || meal?.strMeal || meal?.mealName || meal?.recipeName || meal?.title || meal?.name || fallback;
    if (localized === sourceName) {
      return localizeEnglishMealText(translateMealName(localized, language), language);
    }
  }

  return localizeEnglishMealText(localized, language);
}

function getLocalizedMealCategory(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strCategoryEn || meal?.categoryEn || meal?.strCategory || meal?.category || meal?.type,
    meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh,
    meal?.strCategoryMs || meal?.categoryMs,
    fallback
  );
}

function getLocalizedMealArea(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strAreaEn || meal?.areaEn || meal?.strArea || meal?.area,
    meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh,
    meal?.strAreaMs || meal?.areaMs,
    fallback
  );
}

function getLocalizedInstructions(meal: any, language: string) {
  const lang = normalizeLanguageCode(language);
  const localized = pickLocalizedValue(
    language,
    meal?.strInstructionsEn || meal?.instructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions,
    meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh,
    meal?.strInstructionsMs || meal?.instructionsMs || meal?.methodMs || meal?.directionsMs,
    meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || ''
  );

  const hasExplicitLocalized =
    lang === 'zh'
      ? cleanLocalizedValue(meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh)
      : lang === 'ms'
      ? cleanLocalizedValue(meal?.strInstructionsMs || meal?.instructionsMs || meal?.methodMs || meal?.directionsMs)
      : true;

  return hasExplicitLocalized ? localized : localizeEnglishInstructions(localized, language);
}

function getLocalizedSteps(meal: any, language: string) {
  const lang = normalizeLanguageCode(language);
  if (lang === 'zh') {
    return meal?.stepsCn || meal?.stepsCN || meal?.stepsZh || undefined;
  }

  if (lang === 'ms') {
    return meal?.stepsMs || undefined;
  }

  return meal?.stepsEn || meal?.steps || undefined;
}

function normalizeMealType(category?: string | null, type?: string | null) {
  const text = `${category || ''} ${type || ''}`.toLowerCase();

  if (text.includes('breakfast')) return 'breakfast';
  if (text.includes('lunch')) return 'lunch';
  if (text.includes('dinner')) return 'dinner';
  if (text.includes('snack')) return 'snack';

  return 'lunch';
}


type MealSlotKey = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

type MealPlanEditContext = {
  ownerKey?: string;
  dateKey?: string;
  slot?: MealSlotKey;
  mealIndex?: number;
};

const MEAL_PLANS_STORAGE_KEY = 'JOMHEALTHY_MEAL_PLANS_BY_OWNER_V1';

function roundToTwo(value: number) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function formatGramMeasure(grams: number) {
  const safeGrams = Math.max(0, roundToTwo(grams));
  const formatted = safeGrams
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');

  return `${formatted}g`;
}

function shouldHideIngredientMeasure(measure?: string | null) {
  const text = String(measure || '').trim().toLowerCase();
  if (!text) return false;
  if (/^\d+(?:\.\d+)?$/.test(text)) return true;

  return /^(?:\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?\s*)?(?:g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|millilitre|millilitres|kl|kiloliter|kiloliters|kilolitre|kilolitres)$/i.test(text);
}

function localizeIngredientMeasureText(value?: string | null, language = 'en') {
  const raw = String(value || '').trim();
  if (!raw || language === 'en') return raw;

  const units: Record<string, Record<string, string>> = {
    zh: {
      g: '克', gram: '克', grams: '克',
      kg: '公斤', kilogram: '公斤', kilograms: '公斤',
      ml: '毫升', milliliter: '毫升', milliliters: '毫升', millilitre: '毫升', millilitres: '毫升',
      l: '升', liter: '升', liters: '升', litre: '升', litres: '升',
      lb: '磅', lbs: '磅', pound: '磅', pounds: '磅',
      oz: '盎司', ounce: '盎司', ounces: '盎司',
      cup: '杯', cups: '杯',
      tablespoon: '汤匙', tablespoons: '汤匙', tbsp: '汤匙', tblsp: '汤匙', tbls: '汤匙', tbs: '汤匙',
      teaspoon: '茶匙', teaspoons: '茶匙', tsp: '茶匙',
      pint: '品脱', pints: '品脱', quart: '夸脱', quarts: '夸脱', qt: '夸脱',
      clove: '瓣', cloves: '瓣', bulb: '头', bulbs: '头', bunch: '把', bunches: '把',
      handful: '把', handfull: '把', handfuls: '把', handfulls: '把',
      head: '颗', heads: '颗', slice: '片', slices: '片', sprig: '枝', sprigs: '枝',
      stalk: '根', stalks: '根', leaf: '片叶', leaves: '片叶',
      can: '罐', cans: '罐', tin: '罐', tins: '罐',
      packet: '包', packets: '包', package: '包', packages: '包', pack: '包', packs: '包',
      bag: '袋', bags: '袋', bottle: '瓶', bottles: '瓶', jar: '罐', jars: '罐',
      pot: '盒', pots: '盒', knob: '小块', knobs: '小块', pinch: '撮', pinches: '撮',
      dash: '少许', splash: '少许', drizzle: '淋少许', drop: '滴', drops: '滴',
      scoop: '勺', scoops: '勺', shot: '小杯', shots: '小杯', part: '份', parts: '份',
      pod: '荚', pods: '荚', fillet: '片', fillets: '片', rasher: '片', rashers: '片',
      tail: '尾', tails: '尾', floret: '小朵', florets: '小朵', piece: '块', pieces: '块',
      inch: '英寸', cm: '厘米',
    },
    ms: {
      g: 'gram', gram: 'gram', grams: 'gram',
      kg: 'kilogram', kilogram: 'kilogram', kilograms: 'kilogram',
      ml: 'mL', milliliter: 'mL', milliliters: 'mL', millilitre: 'mL', millilitres: 'mL',
      l: 'L', liter: 'L', liters: 'L', litre: 'L', litres: 'L',
      lb: 'paun', lbs: 'paun', pound: 'paun', pounds: 'paun',
      oz: 'auns', ounce: 'auns', ounces: 'auns',
      cup: 'cawan', cups: 'cawan',
      tablespoon: 'sudu besar', tablespoons: 'sudu besar', tbsp: 'sudu besar', tblsp: 'sudu besar', tbls: 'sudu besar', tbs: 'sudu besar',
      teaspoon: 'sudu kecil', teaspoons: 'sudu kecil', tsp: 'sudu kecil',
      pint: 'pain', pints: 'pain', quart: 'kuart', quarts: 'kuart', qt: 'kuart',
      clove: 'ulas', cloves: 'ulas', bulb: 'labu', bulbs: 'labu', bunch: 'ikat', bunches: 'ikat',
      handful: 'genggam', handfull: 'genggam', handfuls: 'genggam', handfulls: 'genggam',
      head: 'biji', heads: 'biji', slice: 'keping', slices: 'keping', sprig: 'tangkai', sprigs: 'tangkai',
      stalk: 'batang', stalks: 'batang', leaf: 'helai daun', leaves: 'helai daun',
      can: 'tin', cans: 'tin', tin: 'tin', tins: 'tin',
      packet: 'paket', packets: 'paket', package: 'paket', packages: 'paket', pack: 'paket', packs: 'paket',
      bag: 'beg', bags: 'beg', bottle: 'botol', bottles: 'botol', jar: 'balang', jars: 'balang',
      pot: 'bekas', pots: 'bekas', knob: 'ketul kecil', knobs: 'ketul kecil', pinch: 'secubit', pinches: 'secubit',
      dash: 'sedikit', splash: 'sedikit', drizzle: 'renjis', drop: 'titik', drops: 'titik',
      scoop: 'skop', scoops: 'skop', shot: 'shot', shots: 'shot', part: 'bahagian', parts: 'bahagian',
      pod: 'lenggai', pods: 'lenggai', fillet: 'filet', fillets: 'filet', rasher: 'keping', rashers: 'keping',
      tail: 'ekor', tails: 'ekor', floret: 'kuntum kecil', florets: 'kuntum kecil', piece: 'ketul', pieces: 'ketul',
      inch: 'inci', cm: 'cm',
    },
  };

  const phrases: Record<string, Array<[RegExp, string]>> = {
    zh: [
      [/\bas required\b/gi, '按需'], [/\bto serve\b/gi, '上桌用'], [/\bfor brushing\b/gi, '刷表面用'],
      [/\bfor frying\b/gi, '煎炸用'], [/\bfor greasing\b/gi, '抹油用'], [/\bfor cooking\b/gi, '烹调用'],
      [/\bgarnish with\b/gi, '用来装饰'], [/\bgarnish\b/gi, '装饰用'], [/\bdusting\b/gi, '撒少许'],
      [/\bto taste\b/gi, '按口味'], [/\bsoaked overnight\b/gi, '浸泡过夜'], [/\bboiling\b/gi, '沸腾的'],
      [/\bwarm\b/gi, '温热的'], [/\bhot\b/gi, '热的'], [/\bboneless skinless\b/gi, '去骨去皮'],
      [/\bboneless\b/gi, '去骨'], [/\bskinless\b/gi, '去皮'], [/\bskinned\b/gi, '去皮'], [/\bskinnless\b/gi, '去皮'],
      [/\bpeeled and chopped\b/gi, '去皮切碎'], [/\bpeeled and sliced\b/gi, '去皮切片'], [/\bpeeled and crushed\b/gi, '去皮压碎'],
      [/\bpeeled crushed\b/gi, '去皮压碎'], [/\bpeeled\b/gi, '去皮'], [/\bfinely chopped\b/gi, '切细碎'],
      [/\broughly chopped\b/gi, '粗切'], [/\bchopped\b/gi, '切碎'], [/\bfinely diced\b/gi, '切小丁'], [/\bdiced\b/gi, '切丁'],
      [/\bfinely sliced\b/gi, '切薄片'], [/\bthinly sliced\b/gi, '切薄片'], [/\bsliced thinly\b/gi, '切薄片'], [/\bsliced\b/gi, '切片'],
      [/\bminced\b/gi, '剁碎'], [/\bcrushed\b/gi, '压碎'], [/\bgrated zest\b/gi, '磨碎外皮'], [/\bgrated\b/gi, '磨碎'],
      [/\bshredded\b/gi, '切丝'], [/\bshaved\b/gi, '刨片'], [/\bhalved\b/gi, '切半'], [/\bquartered\b/gi, '切四瓣'],
      [/\bcut into\b/gi, '切成'], [/\bcut\b/gi, '切'], [/\btrimmed\b/gi, '修整'], [/\brinsed and patted dry\b/gi, '冲洗并拍干'],
      [/\brinsed\b/gi, '冲洗'], [/\bpatted dry\b/gi, '拍干'], [/\bbeaten\b/gi, '打散'], [/\bseperated\b|\bseparated\b/gi, '分离'],
      [/\bground\b/gi, '磨粉'], [/\bpounded\b/gi, '拍扁'], [/\bbashed\b/gi, '敲碎'], [/\bmashed\b/gi, '压成泥'],
      [/\bcrumbled\b/gi, '掰碎'], [/\btorn\b/gi, '撕开'], [/\bdeseeded\b|\bseeded\b/gi, '去籽'],
      [/\bfresh\b/gi, '新鲜'], [/\bdried\b/gi, '干'], [/\blarge\b/gi, '大'], [/\bmedium\b/gi, '中等'], [/\bsmall\b/gi, '小'],
      [/\bthin\b/gi, '薄'], [/\bthick\b/gi, '厚'], [/\bwhole\b/gi, '整个'], [/\bhalf\b/gi, '半个'], [/\braw\b/gi, '生'],
      [/\bfine\b/gi, '细'], [/\bred\b/gi, '红色'],
    ],
    ms: [
      [/\bas required\b/gi, 'mengikut keperluan'], [/\bto serve\b/gi, 'untuk dihidang'], [/\bfor brushing\b/gi, 'untuk disapu'],
      [/\bfor frying\b/gi, 'untuk menggoreng'], [/\bfor greasing\b/gi, 'untuk melengser'], [/\bfor cooking\b/gi, 'untuk memasak'],
      [/\bgarnish with\b/gi, 'hias dengan'], [/\bgarnish\b/gi, 'hiasan'], [/\bdusting\b/gi, 'tabur sedikit'],
      [/\bto taste\b/gi, 'ikut rasa'], [/\bsoaked overnight\b/gi, 'direndam semalaman'], [/\bboiling\b/gi, 'mendidih'],
      [/\bwarm\b/gi, 'suam'], [/\bhot\b/gi, 'panas'], [/\bboneless skinless\b/gi, 'tanpa tulang dan kulit'],
      [/\bboneless\b/gi, 'tanpa tulang'], [/\bskinless\b/gi, 'tanpa kulit'], [/\bskinned\b/gi, 'dibuang kulit'], [/\bskinnless\b/gi, 'tanpa kulit'],
      [/\bpeeled and chopped\b/gi, 'dikupas dan dicincang'], [/\bpeeled and sliced\b/gi, 'dikupas dan dihiris'], [/\bpeeled and crushed\b/gi, 'dikupas dan dihancurkan'],
      [/\bpeeled crushed\b/gi, 'dikupas dan dihancurkan'], [/\bpeeled\b/gi, 'dikupas'], [/\bfinely chopped\b/gi, 'dicincang halus'],
      [/\broughly chopped\b/gi, 'dicincang kasar'], [/\bchopped\b/gi, 'dicincang'], [/\bfinely diced\b/gi, 'dipotong dadu halus'], [/\bdiced\b/gi, 'dipotong dadu'],
      [/\bfinely sliced\b/gi, 'dihiris halus'], [/\bthinly sliced\b/gi, 'dihiris nipis'], [/\bsliced thinly\b/gi, 'dihiris nipis'], [/\bsliced\b/gi, 'dihiris'],
      [/\bminced\b/gi, 'dicincang lumat'], [/\bcrushed\b/gi, 'dihancurkan'], [/\bgrated zest\b/gi, 'kulit diparut'], [/\bgrated\b/gi, 'diparut'],
      [/\bshredded\b/gi, 'dicarik'], [/\bshaved\b/gi, 'diserut'], [/\bhalved\b/gi, 'dibelah dua'], [/\bquartered\b/gi, 'dibelah empat'],
      [/\bcut into\b/gi, 'dipotong menjadi'], [/\bcut\b/gi, 'dipotong'], [/\btrimmed\b/gi, 'dirapikan'], [/\brinsed and patted dry\b/gi, 'dibilas dan ditepuk kering'],
      [/\brinsed\b/gi, 'dibilas'], [/\bpatted dry\b/gi, 'ditepuk kering'], [/\bbeaten\b/gi, 'dipukul'], [/\bseperated\b|\bseparated\b/gi, 'diasingkan'],
      [/\bground\b/gi, 'dikisar'], [/\bpounded\b/gi, 'ditumbuk'], [/\bbashed\b/gi, 'diketuk'], [/\bmashed\b/gi, 'dilenyek'],
      [/\bcrumbled\b/gi, 'dihancurkan kasar'], [/\btorn\b/gi, 'dikoyak'], [/\bdeseeded\b|\bseeded\b/gi, 'dibuang biji'],
      [/\bfresh\b/gi, 'segar'], [/\bdried\b/gi, 'kering'], [/\blarge\b/gi, 'besar'], [/\bmedium\b/gi, 'sederhana'], [/\bsmall\b/gi, 'kecil'],
      [/\bthin\b/gi, 'nipis'], [/\bthick\b/gi, 'tebal'], [/\bwhole\b/gi, 'utuh'], [/\bhalf\b/gi, 'separuh'], [/\braw\b/gi, 'mentah'],
      [/\bfine\b/gi, 'halus'], [/\bred\b/gi, 'merah'],
    ],
  };

  let localized = raw
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/–/g, '-');

  localized = localized.replace(
    /(\d+(?:[.,]\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)?\s*(kg|kilograms?|g|grams?|ml|milliliters?|millilitres?|l|liters?|litres?|lbs?|pounds?|oz|ounces?|cups?|tablespoons?|tbsp|tblsp|tbls|tbs|teaspoons?|tsp|pints?|quarts?|qt|cloves?|bulbs?|bunch(?:es)?|handfuls?|handfulls?|heads?|slices?|sprigs?|stalks?|leaves|leaf|cans?|tins?|packets?|packages?|packs?|bags?|bottles?|jars?|pots?|knobs?|pinches?|dash|splash|drizzle|drops?|scoops?|shots?|parts?|pods?|fillets?|rashers?|tails?|florets?|pieces?|inch|cm)\b/gi,
    (_match, amount = '', unit) => `${amount}${amount ? ' ' : ''}${units[language]?.[String(unit).toLowerCase()] || unit}`
  );

  phrases[language]?.forEach(([pattern, replacement]) => {
    localized = localized.replace(pattern, replacement);
  });

  return localized.replace(/\s+/g, ' ').trim();
}

function formatLocalizedGramValue(value?: number, language = 'en') {
  return localizeIngredientMeasureText(`${round(value)}g`, language);
}

function getIngredientPer100gNutrition(item: Ingredient) {
  const grams = safeNumber(item.gramsEstimated);

  const derive = (explicitPer100g: any, actualAmount: any) => {
    const explicit = safeNumber(explicitPer100g);
    if (explicit > 0) return explicit;

    const actual = safeNumber(actualAmount);
    if (grams > 0) {
      return actual * 100 / grams;
    }

    return actual;
  };

  return {
    energyKcal: derive(item.energyKcalPer100g, item.energyKcal),
    proteinG: derive(item.proteinGPer100g, item.proteinG),
    carbohydrateG: derive(item.carbohydrateGPer100g, item.carbohydrateG),
    fatG: derive(item.fatGPer100g, item.fatG),
  };
}

function recalculateIngredientForWeight(item: Ingredient, grams: number): Ingredient {
  const safeGrams = Math.max(0, safeNumber(grams));
  const per100g = getIngredientPer100gNutrition(item);

  return {
    ...item,
    gramsEstimated: safeGrams,
    measure: formatGramMeasure(safeGrams),
    energyKcalPer100g: roundToTwo(per100g.energyKcal),
    proteinGPer100g: roundToTwo(per100g.proteinG),
    carbohydrateGPer100g: roundToTwo(per100g.carbohydrateG),
    fatGPer100g: roundToTwo(per100g.fatG),
    energyKcal: roundToTwo(per100g.energyKcal * safeGrams / 100),
    proteinG: roundToTwo(per100g.proteinG * safeGrams / 100),
    carbohydrateG: roundToTwo(per100g.carbohydrateG * safeGrams / 100),
    fatG: roundToTwo(per100g.fatG * safeGrams / 100),
  };
}

function getNutritionTotalsFromIngredients(ingredients: Ingredient[]) {
  return ingredients.reduce(
    (acc, ingredient) => {
      acc.calories += safeNumber(ingredient.energyKcal);
      acc.protein += safeNumber(ingredient.proteinG);
      acc.carbs += safeNumber(ingredient.carbohydrateG);
      acc.fat += safeNumber(ingredient.fatG);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export default function RecipeDetailScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const childProfile = useChildProfile() as any;

  const {
    addSavedRecipe,
    removeSavedRecipe,
    isRecipeSaved,
  } = childProfile;

  const meal = route.params?.meal as MealRecipe | undefined;
  const mealPlanEditContext = route.params?.mealPlanEditContext as MealPlanEditContext | undefined;

  const getText = (en: string, zh: string, ms: string) => {
    const lang = normalizeLanguageCode(language);
    if (lang === 'zh') return zh;
    if (lang === 'ms') return ms;
    return en;
  };

  const mealName = getLocalizedMealName(meal, language, getText('Recipe', '食谱', 'Resipi'));
  const mealNameEn = getLocalizedMealName(meal, 'en', mealName);
  const mealNameCn = getLocalizedMealName(meal, 'zh', mealNameEn);
  const mealNameMs = getLocalizedMealName(meal, 'ms', mealNameEn);
  const mealId = String(meal?.idMeal || meal?.id || mealNameEn || mealName);
  const category = getLocalizedMealCategory(meal, language, getText('Recipe', '食谱', 'Resipi'));
  const categoryEn = getLocalizedMealCategory(meal, 'en', category);
  const categoryCn = getLocalizedMealCategory(meal, 'zh', categoryEn);
  const categoryMs = getLocalizedMealCategory(meal, 'ms', categoryEn);
  const area = getLocalizedMealArea(meal, language, '');
  const areaEn = getLocalizedMealArea(meal, 'en', area);
  const areaCn = getLocalizedMealArea(meal, 'zh', areaEn);
  const areaMs = getLocalizedMealArea(meal, 'ms', areaEn);
  const instructionsText = getLocalizedInstructions(meal, language);
  const instructionsEn = getLocalizedInstructions(meal, 'en');
  const instructionsCn = getLocalizedInstructions(meal, 'zh');
  const instructionsMs = getLocalizedInstructions(meal, 'ms');
  const imageUrl = isValidImageUrl(meal?.strMealThumb || meal?.imageUrl) ? String(meal?.strMealThumb || meal?.imageUrl) : '';
  const youtubeUrl = isValidYoutubeUrl(meal?.strYoutube || meal?.youtubeUrl) ? String(meal?.strYoutube || meal?.youtubeUrl) : '';
  const mealEmoji = meal?.mealIconEmoji || guessMealEmoji(mealName, category);

  const localizedSteps = useMemo(() => getLocalizedSteps(meal, language), [meal, language]);
  const instructions = useMemo(
    () => splitInstructions(instructionsText, localizedSteps),
    [instructionsText, localizedSteps]
  );

  const [localIngredients, setLocalIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (Array.isArray(meal?.ingredients)) {
      const parsed = meal.ingredients
        .filter((item: Ingredient) => safeNumber(item.gramsEstimated) > 0)
        .sort((a: Ingredient, b: Ingredient) => safeNumber(b.gramsEstimated) - safeNumber(a.gramsEstimated));
      setLocalIngredients(parsed);
    }
  }, [meal?.ingredients]);

  const localNutrition = useMemo(() => {
    if (!meal || !Array.isArray(meal.ingredients)) {
      return {
        calories: safeNumber(meal?.totalEnergyKcal || meal?.calories),
        protein: safeNumber(meal?.totalProteinG || meal?.protein),
        carbs: safeNumber(meal?.totalCarbohydrateG || meal?.carbs),
        fat: safeNumber(meal?.totalFatG || meal?.fat),
      };
    }

    return getNutritionTotalsFromIngredients(localIngredients);
  }, [localIngredients, meal]);

  const saveableMeal = useMemo(() => {
    return {
      ...(meal || {}),
      id: mealId,
      idMeal: mealId,
      name: mealName,
      nameEn: mealNameEn,
      nameCn: mealNameCn,
      nameMs: mealNameMs,
      strMeal: meal?.strMeal || mealNameEn,
      strMealEn: meal?.strMealEn || meal?.mealNameEn || meal?.recipeNameEn || meal?.titleEn || meal?.strMeal || mealNameEn,
      strMealCn: meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.mealNameCn || meal?.mealNameCN || meal?.mealNameZh || meal?.recipeNameCn || meal?.recipeNameCN || meal?.recipeNameZh || meal?.titleCn || meal?.titleCN || meal?.titleZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || mealNameCn,
      strMealMs: meal?.strMealMs || meal?.mealNameMs || meal?.recipeNameMs || meal?.titleMs || meal?.nameMs || mealNameMs,
      strCategory: meal?.strCategory || categoryEn,
      strCategoryEn: meal?.strCategoryEn || meal?.strCategory || categoryEn,
      strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || categoryCn,
      strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || categoryMs,
      strArea: meal?.strArea || meal?.strAreaEn || areaEn,
      strAreaEn: meal?.strAreaEn || meal?.strArea || areaEn,
      strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || areaCn,
      strAreaMs: meal?.strAreaMs || meal?.areaMs || areaMs,
      strInstructions: meal?.strInstructions || meal?.instructions || meal?.method || meal?.directions || meal?.strInstructionsEn || instructionsEn,
      strInstructionsEn: meal?.strInstructionsEn || meal?.instructionsEn || meal?.methodEn || meal?.directionsEn || meal?.strInstructions || meal?.instructions || instructionsEn,
      strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.methodCn || meal?.methodCN || meal?.methodZh || meal?.directionsCn || meal?.directionsCN || meal?.directionsZh || instructionsCn,
      strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || meal?.methodMs || meal?.directionsMs || instructionsMs,
      type: normalizeMealType(categoryEn, meal?.type),
      imageUrl: imageUrl || undefined,
      strMealThumb: imageUrl || meal?.strMealThumb || '',
      mealIconEmoji: mealEmoji,
      ingredients: localIngredients,
      calories: localNutrition.calories,
      carbs: localNutrition.carbs,
      protein: localNutrition.protein,
      fat: localNutrition.fat,
      totalCarbohydrateG: localNutrition.carbs,
      totalProteinG: localNutrition.protein,
      totalFatG: localNutrition.fat,
      totalEnergyKcal: localNutrition.calories,
    };
  }, [meal, mealId, mealName, mealNameEn, mealNameCn, mealNameMs, categoryEn, categoryCn, categoryMs, areaEn, areaCn, areaMs, instructionsEn, instructionsCn, instructionsMs, imageUrl, mealEmoji, localIngredients, localNutrition]);

  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [ingredientDetailModalVisible, setIngredientDetailModalVisible] = useState(false);
  const [editWeightValue, setEditWeightValue] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const closeIngredientEditor = () => {
    setIngredientDetailModalVisible(false);
    setSearchQuery('');
    setDebouncedQuery('');
    setSuggestions([]);
    setIsSearching(false);
  };

  const handleWeightInputChange = (value: string) => {
    const normalized = String(value || '').replace(/,/g, '.');
    const digitsAndDotOnly = normalized.replace(/[^0-9.]/g, '');
    const firstDotIndex = digitsAndDotOnly.indexOf('.');

    const sanitized =
      firstDotIndex === -1
        ? digitsAndDotOnly
        : digitsAndDotOnly.slice(0, firstDotIndex + 1) +
          digitsAndDotOnly.slice(firstDotIndex + 1).replace(/\./g, '');

    setEditWeightValue(sanitized);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const fetchSuggestions = async () => {
      if (!ingredientDetailModalVisible || !debouncedQuery.trim()) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const response = await fetch(
          `https://jom-healthy-java.onrender.com/food/getFoodNutrition?name=${encodeURIComponent(debouncedQuery)}`,
          {
            method: 'POST',
            headers: { Accept: 'application/json' },
          }
        );

        if (response.ok) {
          const payload = await response.json();

          if (!cancelled) {
            setSuggestions(Array.isArray(payload.data) ? payload.data : []);
          }
        } else if (!cancelled) {
          setSuggestions([]);
        }
      } catch (err) {
        console.log('Search replacement food failed:', err);

        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, ingredientDetailModalVisible]);


  const saved = typeof isRecipeSaved === 'function' ? isRecipeSaved(saveableMeal.id) : false;

  const getIngredientName = (item: Ingredient) => {
    return pickLocalizedValue(
      language,
      item.foodNameEn || item.name || item.ingredientName,
      item.foodNameCn || (item as any).foodNameCN || (item as any).foodNameZh,
      item.foodNameMs,
      getText('Ingredient', '食材', 'Bahan')
    );
  };

  const getIngredientMeasure = (item: Ingredient) => {
    if (item.measure) return String(item.measure).trim();
    if (item.quantity) return String(item.quantity).trim();
    return '';
  };


  const buildUpdatedMealForStorage = useCallback((ingredients: Ingredient[]) => {
    const totals = getNutritionTotalsFromIngredients(ingredients);

    return {
      ...(meal || {}),
      ingredients,
      calories: roundToTwo(totals.calories),
      carbs: roundToTwo(totals.carbs),
      protein: roundToTwo(totals.protein),
      fat: roundToTwo(totals.fat),
      totalEnergyKcal: roundToTwo(totals.calories),
      totalCarbohydrateG: roundToTwo(totals.carbs),
      totalProteinG: roundToTwo(totals.protein),
      totalFatG: roundToTwo(totals.fat),
    };
  }, [meal]);

  const persistMealPlanNutritionUpdate = useCallback(async (updatedMeal: MealRecipe) => {
    const context = mealPlanEditContext;

    if (!context?.ownerKey || !context?.dateKey || !context?.slot) {
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const ownerPlans = parsed?.[context.ownerKey];
      const dayPlan = ownerPlans?.[context.dateKey];
      const slotMeals = Array.isArray(dayPlan?.[context.slot]) ? [...dayPlan[context.slot]] : [];

      if (slotMeals.length === 0) {
        return;
      }

      let targetIndex = Number.isInteger(context.mealIndex) ? Number(context.mealIndex) : -1;
      const requestedMealId = String(mealId || '');
      const indexMatchesMeal =
        targetIndex >= 0 &&
        targetIndex < slotMeals.length &&
        String(slotMeals[targetIndex]?.idMeal || slotMeals[targetIndex]?.id || '') === requestedMealId;

      if (!indexMatchesMeal) {
        targetIndex = slotMeals.findIndex((storedMeal: any) => (
          String(storedMeal?.idMeal || storedMeal?.id || '') === requestedMealId
        ));
      }

      if (targetIndex < 0 || targetIndex >= slotMeals.length) {
        return;
      }

      slotMeals[targetIndex] = {
        ...slotMeals[targetIndex],
        ...updatedMeal,
        id: slotMeals[targetIndex]?.id ?? updatedMeal.id,
        idMeal: slotMeals[targetIndex]?.idMeal ?? updatedMeal.idMeal,
      };

      parsed[context.ownerKey] = {
        ...ownerPlans,
        [context.dateKey]: {
          ...dayPlan,
          [context.slot]: slotMeals,
        },
      };

      await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.log('Persist updated meal nutrition failed:', error);
    }
  }, [mealId, mealPlanEditContext]);

  const handleSaveRecipe = () => {
    if (!meal) return;

    if (saved) {
      if (typeof removeSavedRecipe === 'function') {
        removeSavedRecipe(saveableMeal.id);
      }

      Alert.alert(
        getText('Removed', '已移除', 'Dibuang'),
        getText('This recipe was removed from Saved Recipes.', '这个食谱已从收藏中移除。', 'Resipi ini telah dibuang daripada Resipi Tersimpan.')
      );
      return;
    }

    if (typeof addSavedRecipe === 'function') {
      addSavedRecipe(saveableMeal);
    }

    Alert.alert(
      getText('Saved', '已收藏', 'Disimpan'),
      getText('This recipe has been added to your Saved Recipes in Profile.', '这个食谱已保存到 Profile 的 Saved Recipes。', 'Resipi ini telah ditambah ke Resipi Tersimpan dalam Profil.')
    );
  };

  const handleUpdateWeight = async () => {
    if (selectedIngredientIndex === null) return;

    const trimmedWeight = editWeightValue.trim();
    const newWeight = Number(trimmedWeight);

    if (!trimmedWeight || Number.isNaN(newWeight) || newWeight < 0) {
      Alert.alert(
        getText('Invalid weight', '无效重量', 'Berat tidak sah'),
        getText(
          'Please enter a valid weight in grams.',
          '请输入有效的克数。',
          'Sila masukkan berat dalam gram yang sah.'
        )
      );
      return;
    }

    const nextIngredients = [...localIngredients];
    const currentIngredient = nextIngredients[selectedIngredientIndex];

    if (!currentIngredient) {
      closeIngredientEditor();
      return;
    }

    nextIngredients[selectedIngredientIndex] = recalculateIngredientForWeight(
      currentIngredient,
      newWeight
    );

    const updatedIngredients = (newWeight === 0
      ? nextIngredients.filter((item) => safeNumber(item.gramsEstimated) > 0)
      : nextIngredients
    ).sort((a, b) => safeNumber(b.gramsEstimated) - safeNumber(a.gramsEstimated));

    setLocalIngredients(updatedIngredients);
    await persistMealPlanNutritionUpdate(buildUpdatedMealForStorage(updatedIngredients));
    closeIngredientEditor();
  };

  const handleReplaceIngredient = async (foodData: any) => {
    if (selectedIngredientIndex === null) return;

    const nextIngredients = [...localIngredients];
    const currentIngredient = nextIngredients[selectedIngredientIndex];

    if (!currentIngredient) {
      closeIngredientEditor();
      return;
    }

    const oldWeight = safeNumber(currentIngredient.gramsEstimated) || 100;

    const replacementBase: Ingredient = {
      ...currentIngredient,
      ingredientName:
        foodData.foodNameEn ||
        foodData.foodNameOriginal ||
        currentIngredient.ingredientName,
      foodNameEn: foodData.foodNameEn || foodData.foodNameOriginal,
      foodNameCn: foodData.foodNameCn,
      foodNameMs: foodData.foodNameMs,
      name: foodData.foodNameEn || foodData.foodNameOriginal,
      picUrl: foodData.picUrl,
      foodGroup:
        foodData.foodGroup ||
        foodData.food_group_ ||
        currentIngredient.foodGroup,
      energyKcalPer100g: safeNumber(
        foodData.energyKcalPer100g ??
        foodData.energyKcal ??
        foodData.calories
      ),
      proteinGPer100g: safeNumber(
        foodData.proteinGPer100g ??
        foodData.proteinG ??
        foodData.protein
      ),
      carbohydrateGPer100g: safeNumber(
        foodData.carbohydrateGPer100g ??
        foodData.carbohydrateG ??
        foodData.carbs
      ),
      fatGPer100g: safeNumber(
        foodData.fatGPer100g ??
        foodData.fatG ??
        foodData.fat
      ),
    };

    nextIngredients[selectedIngredientIndex] = recalculateIngredientForWeight(
      replacementBase,
      oldWeight
    );

    const updatedIngredients = nextIngredients.sort(
      (a, b) => safeNumber(b.gramsEstimated) - safeNumber(a.gramsEstimated)
    );

    setLocalIngredients(updatedIngredients);
    await persistMealPlanNutritionUpdate(buildUpdatedMealForStorage(updatedIngredients));
    closeIngredientEditor();

    Alert.alert(
      getText('Food replaced', '食物已替换', 'Makanan telah diganti'),
      getText(
        'The ingredient was replaced, the original weight was kept, and today’s nutrition was updated.',
        '食材已替换，原来的重量已保留，今日营养也已同步更新。',
        'Bahan telah diganti, berat asal dikekalkan, dan nutrisi hari ini telah dikemas kini.'
      )
    );
  };


  const openYoutube = async () => {
    if (!youtubeUrl) {
      Alert.alert(
        getText('No Tutorial', '没有教程', 'Tiada Tutorial'),
        getText('This recipe does not have a tutorial link.', '这个食谱没有教程链接。', 'Resipi ini tiada pautan tutorial.')
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(youtubeUrl);

      if (supported) {
        await Linking.openURL(youtubeUrl);
      } else {
        Alert.alert(
          getText('Cannot Open Link', '无法打开链接', 'Tidak Dapat Buka Pautan'),
          getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.')
        );
      }
    } catch (error) {
      console.log('Open tutorial failed:', error);
      Alert.alert(
        getText('Error', '错误', 'Ralat'),
        getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.')
      );
    }
  };

  if (!meal) {
    return (
      <Screen padded={false}>
        <Header title={getText('Recipe Detail', '食谱详情', 'Butiran Resipi')} subtitle={getText('No recipe found', '没有找到食谱', 'Tiada resipi ditemui')} icon="book" />
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundEmoji}>🍽️</Text>
          <Text style={styles.notFoundTitle}>{getText('Recipe not found', '食谱不存在', 'Resipi tidak ditemui')}</Text>
          <Pressable style={styles.backButtonLarge} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backButtonLargeText}>{getText('Go Back', '返回', 'Kembali')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header
        title={getText('Recipe Detail', '食谱详情', 'Butiran Resipi')}
        subtitle={category}
        icon="book"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.backLinkText}>{getText('Back', '返回', 'Kembali')}</Text>
        </Pressable>

        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroEmojiWrap}>
              <Text style={styles.heroEmoji}>{mealEmoji}</Text>
            </View>
          )}

          <View style={styles.heroContent}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealTitle}>{mealName}</Text>
                <Text style={styles.mealMeta}>
                  {category}{area ? ` · ${area}` : ''}
                </Text>
              </View>

              <Pressable
                style={[styles.saveIconButton, saved && styles.saveIconButtonActive]}
                onPress={handleSaveRecipe}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={saved ? '#FFFFFF' : theme.colors.primaryDark}
                />
              </Pressable>
            </View>

            <View style={styles.heroButtonRow}>
              <Pressable
                style={[styles.primaryActionButton, saved && styles.savedActionButton]}
                onPress={handleSaveRecipe}
              >
                <Ionicons
                  name={saved ? 'checkmark-circle' : 'bookmark-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryActionText}>
                  {saved
                    ? getText('Saved Recipe', '已收藏', 'Resipi Disimpan')
                    : getText('Save Recipe', '收藏食谱', 'Simpan Resipi')}
                </Text>
              </Pressable>

              <Pressable style={styles.youtubeButton} onPress={openYoutube}>
                <Ionicons name="logo-youtube" size={18} color="#FF3B30" />
                <Text style={styles.youtubeButtonText}>{getText('Watch', '观看', 'Tonton')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <Text style={styles.sectionTitle}>{getText('Nutrition', '营养', 'Nutrisi')}</Text>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(localNutrition.calories)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(localNutrition.carbs)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Carbs', '碳水', 'Karbo')}</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(localNutrition.protein)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Protein', '蛋白质', 'Protein')}</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(localNutrition.fat)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Fat', '脂肪', 'Lemak')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{getText('Ingredients', '食材', 'Bahan-bahan')}</Text>

            {localIngredients.length > 0 ? (
              localIngredients.map((item, index) => {
                const name = getIngredientName(item);
                const measure = getIngredientMeasure(item);
                const displayMeasure = localizeIngredientMeasureText(measure, language);
                const showMeasure = !!measure && !shouldHideIngredientMeasure(measure);
                const color = getFoodGroupColor(item.foodGroup || item.category);

                return (
                  <Pressable
                    key={`${name}-${index}`}
                    style={styles.ingredientRow}
                    onPress={() => {
                      setSelectedIngredientIndex(index);
                      setEditWeightValue(
                        item.gramsEstimated !== undefined && item.gramsEstimated !== null
                          ? String(item.gramsEstimated)
                          : '100'
                      );
                      setSearchQuery('');
                      setDebouncedQuery('');
                      setSuggestions([]);
                      setIngredientDetailModalVisible(true);
                    }}
                  >
                    {item.picUrl ? (
                      <Image source={{ uri: item.picUrl }} style={styles.ingredientImage} />
                    ) : (
                      <View style={[styles.ingredientIconFallback, { backgroundColor: color }]}>
                        <Text style={styles.ingredientIconText}>🍽️</Text>
                      </View>
                    )}

                    <View style={styles.ingredientTextWrap}>
                      <Text style={styles.ingredientName}>{name}</Text>
                      {showMeasure && <Text style={styles.ingredientMeasure}>{displayMeasure}</Text>}
                    </View>

                    {safeNumber(item.gramsEstimated) >= 5 && (
                      <View style={styles.ingredientWeightTag}>
                        <Text style={styles.ingredientGram}>{formatLocalizedGramValue(item.gramsEstimated, language)}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.emptyText}>{getText('No ingredients available.', '暂无食材信息。', 'Tiada bahan tersedia.')}</Text>
            )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{getText('Instructions', '做法', 'Arahan')}</Text>

          {instructions.length > 0 ? (
            instructions.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{getText('No instructions available.', '暂无做法。', 'Tiada arahan tersedia.')}</Text>
          )}
        </View>
      </ScrollView>

      {/* Ingredient Edit & Replace Modal */}
      <Modal
        visible={ingredientDetailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeIngredientEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.detailModalCard}>
            <View style={styles.detailModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailModalTitle}>
                  {getText('Edit Ingredient', '编辑食材', 'Edit Bahan')}
                </Text>
                <Text style={styles.detailModalSubtitle}>
                  {getText(
                    'Adjust the weight or search another food to replace it.',
                    '可以调整重量，也可以搜索其他食物来替换。',
                    'Laraskan berat atau cari makanan lain untuk menggantikannya.'
                  )}
                </Text>
              </View>

              <Pressable onPress={closeIngredientEditor} hitSlop={10}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailModalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                if (selectedIngredientIndex === null) return null;

                const ing = localIngredients[selectedIngredientIndex];

                if (!ing) return null;

                const dispWeight = editWeightValue.trim() ? safeNumber(editWeightValue) : 0;
                const previewIngredient = recalculateIngredientForWeight(ing, dispWeight);
                const cals = round(previewIngredient.energyKcal);
                const carbs = round(previewIngredient.carbohydrateG);
                const protein = round(previewIngredient.proteinG);
                const fat = round(previewIngredient.fatG);
                const nameText = getIngredientName(ing);

                return (
                  <>
                    <View style={styles.detailHero}>
                      {ing.picUrl ? (
                        <Image source={{ uri: ing.picUrl }} style={styles.detailHeroImage} />
                      ) : (
                        <View
                          style={[
                            styles.detailHeroIcon,
                            {
                              backgroundColor: getFoodGroupColor(ing.foodGroup || ing.category),
                            },
                          ]}
                        >
                          <Text style={styles.detailHeroEmoji}>🍽️</Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailHeroName}>{nameText}</Text>
                        <Text style={styles.detailHeroHint}>
                          {getText(
                            'Nutrition updates as the weight changes.',
                            '修改重量后，营养会自动重新计算。',
                            'Nutrisi akan dikira semula apabila berat diubah.'
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.macroGrid}>
                      <View style={styles.macroBox}>
                        <Text style={styles.macroValue}>{cals}</Text>
                        <Text style={styles.macroLabel}>kcal</Text>
                      </View>

                      <View style={styles.macroBox}>
                        <Text style={styles.macroValue}>{carbs}g</Text>
                        <Text style={styles.macroLabel}>
                          {getText('Carbs', '碳水', 'Karbo')}
                        </Text>
                      </View>

                      <View style={styles.macroBox}>
                        <Text style={styles.macroValue}>{protein}g</Text>
                        <Text style={styles.macroLabel}>
                          {getText('Protein', '蛋白质', 'Protein')}
                        </Text>
                      </View>

                      <View style={styles.macroBox}>
                        <Text style={styles.macroValue}>{fat}g</Text>
                        <Text style={styles.macroLabel}>
                          {getText('Fat', '脂肪', 'Lemak')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.editWeightSection}>
                      <Text style={styles.editWeightSubtitle}>
                        {getText(
                          'Weight in grams. Enter 0 to remove this ingredient.',
                          '输入克数。输入 0 可以删除这个食材。',
                          'Masukkan berat dalam gram. Masukkan 0 untuk membuang bahan ini.'
                        )}
                      </Text>

                      <View style={styles.detailWeightInputWrap}>
                        <TextInput
                          style={styles.detailWeightInput}
                          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                          value={editWeightValue}
                          onChangeText={handleWeightInputChange}
                          placeholder="0"
                          maxLength={6}
                          selectTextOnFocus
                          returnKeyType="done"
                          onSubmitEditing={handleUpdateWeight}
                        />

                        {editWeightValue.length > 0 && (
                          <Pressable
                            style={styles.detailWeightClearButton}
                            onPress={() => setEditWeightValue('')}
                            hitSlop={8}
                          >
                            <Ionicons name="close-circle" size={22} color="#94A3B8" />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    <View style={styles.inlineReplaceSection}>
                      <Text style={styles.inlineReplaceTitle}>
                        {getText(
                          'Search food to replace',
                          '搜索食物进行替换',
                          'Cari makanan untuk diganti'
                        )}
                      </Text>

                      <Text style={styles.inlineReplaceHint}>
                        {getText(
                          'The selected replacement will keep the current weight automatically.',
                          '替换后会自动保留当前重量，不需要重新输入。',
                          'Makanan gantian akan mengekalkan berat semasa secara automatik.'
                        )}
                      </Text>

                      <View style={styles.inlineSearchBar}>
                        <Ionicons name="search" size={18} color="#64748B" />

                        <TextInput
                          style={styles.inlineSearchInput}
                          placeholder={getText(
                            'Try chicken, tofu, milk...',
                            '例如：鸡肉、豆腐、牛奶...',
                            'Contoh: ayam, tauhu, susu...'
                          )}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoCorrect={false}
                          returnKeyType="search"
                        />

                        {searchQuery.length > 0 && (
                          <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                          </Pressable>
                        )}
                      </View>

                      {isSearching ? (
                        <View style={styles.inlineSearchLoading}>
                          <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                          <Text style={styles.inlineSearchLoadingText}>
                            {getText(
                              'Searching foods...',
                              '正在搜索食物...',
                              'Sedang mencari makanan...'
                            )}
                          </Text>
                        </View>
                      ) : suggestions.length > 0 ? (
                        <ScrollView
                          style={styles.inlineSuggestionScroll}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {suggestions.map((food, i) => (
                            <Pressable
                              key={`${food.id || food.foodNameEn || food.foodNameCn || i}-${i}`}
                              style={styles.suggestionRow}
                              onPress={() => handleReplaceIngredient(food)}
                            >
                              {food.picUrl ? (
                                <Image
                                  source={{ uri: food.picUrl }}
                                  style={styles.suggestionImage}
                                />
                              ) : (
                                <View style={styles.suggestionFallback}>
                                  <Text>🍽️</Text>
                                </View>
                              )}

                              <View style={styles.suggestionInfo}>
                                <Text style={styles.suggestionName} numberOfLines={1}>
                                  {language === 'zh'
                                    ? food.foodNameCn ||
                                      food.foodNameOriginal ||
                                      food.foodNameEn
                                    : language === 'ms'
                                    ? food.foodNameMs ||
                                      food.foodNameOriginal ||
                                      food.foodNameEn
                                    : food.foodNameEn ||
                                      food.foodNameOriginal ||
                                      food.foodNameCn}
                                </Text>

                                <Text style={styles.suggestionMacros}>
                                  {round(food.energyKcal || food.calories)} kcal / 100g
                                </Text>
                              </View>

                              <View style={styles.replacePickTag}>
                                <Text style={styles.replacePickTagText}>
                                  {getText('Use', '替换', 'Pilih')}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : searchQuery.trim().length > 0 ? (
                        <Text style={styles.noResultsTextInline}>
                          {getText(
                            'No matching food found. Try a simpler keyword.',
                            '没有找到匹配食物，可以试试更简单的关键词。',
                            'Tiada makanan sepadan ditemui. Cuba kata kunci yang lebih ringkas.'
                          )}
                        </Text>
                      ) : (
                        <View style={styles.searchHelpCard}>
                          <Ionicons name="bulb-outline" size={18} color={theme.colors.primaryDark} />
                          <Text style={styles.searchHelpText}>
                            {getText(
                              'Tip: search by common food names, such as “chicken”, “rice”, or “tofu”.',
                              '提示：可以输入常见食物名，例如“chicken”“rice”“tofu”。',
                              'Tip: cari nama makanan biasa seperti “chicken”, “rice”, atau “tofu”.'
                            )}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Pressable style={styles.detailSaveBtn} onPress={handleUpdateWeight}>
                      <Text style={styles.detailSaveText}>
                        {getText('Save Weight', '保存重量', 'Simpan Berat')}
                      </Text>
                    </Pressable>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </Screen>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },

  backLink: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  backLinkText: {
    color: themeColors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
  },

  heroEmojiWrap: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F0',
  },

  heroEmoji: {
    fontSize: 96,
  },

  heroContent: {
    padding: 18,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  mealTitle: {
    color: '#0F172A',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 30,
  },

  mealMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },

  saveIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveIconButtonActive: {
    backgroundColor: themeColors.primaryDark,
  },

  heroButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  primaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: themeColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  savedActionButton: {
    backgroundColor: '#16A34A',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  youtubeButton: {
    minWidth: 104,
    minHeight: 48,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },

  youtubeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '900',
  },

  nutritionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },

  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  nutritionItem: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  nutritionValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  nutritionLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  ingredientRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  ingredientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  ingredientTextWrap: {
    flex: 1,
  },

  ingredientName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  ingredientMeasure: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  ingredientGram: {
    color: themeColors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  stepText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },

  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  notFoundEmoji: {
    fontSize: 56,
  },

  notFoundTitle: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  backButtonLarge: {
    marginTop: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: themeColors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },

  backButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  ingredientImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },

  ingredientIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  ingredientIconText: {
    fontSize: 20,
  },

  ingredientWeightTag: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  detailModalCard: {
    width: '92%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 'auto',
    marginTop: 'auto',
    alignSelf: 'center',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailModalSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    paddingRight: 12,
  },
  detailModalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  detailModalContent: {
    padding: 20,
  },
  detailHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailHeroImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 16,
  },
  detailHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeroEmoji: {
    fontSize: 24,
  },
  detailHeroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  detailHeroHint: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  macroGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  macroBox: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  editWeightSection: {
    marginBottom: 24,
  },
  editWeightSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  detailWeightInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  detailWeightInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 52,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  detailWeightClearButton: {
    position: 'absolute',
    right: 16,
    height: 44,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  replaceFullBtnText: {
    color: themeColors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  detailSaveBtn: {
    backgroundColor: themeColors.primaryDark,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  detailSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  inlineReplaceSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlineReplaceTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  inlineReplaceHint: {
    marginTop: 5,
    marginBottom: 12,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  inlineSearchBar: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineSearchInput: {
    flex: 1,
    height: 48,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineSearchLoading: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineSearchLoadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineSuggestionScroll: {
    marginTop: 12,
    maxHeight: 260,
  },
  replacePickTag: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  replacePickTagText: {
    color: themeColors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  noResultsTextInline: {
    textAlign: 'center',
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  searchHelpCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  searchHelpText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionModalSheet: {

    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },

  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },

  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
  },

  sheetActionButton: {
    alignItems: 'center',
    gap: 8,
  },

  sheetActionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sheetActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  editWeightCard: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
  },

  editWeightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  editWeightIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  editWeightTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  editWeightSubtitleOld: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 200,
  },

  weightInput: {
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 24,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: themeColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },

  modalConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  searchModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },

  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  searchCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
    marginLeft: 8,
  },

  searchClearBtn: {
    position: 'absolute',
    right: 28,
  },

  suggestionList: {
    padding: 16,
    gap: 12,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  suggestionImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },

  suggestionFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },

  suggestionName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  suggestionMacros: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },

  noResultsText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
