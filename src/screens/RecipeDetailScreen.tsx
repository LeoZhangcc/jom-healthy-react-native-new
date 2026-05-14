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

function getLocalizedMealName(meal: any, language: string, fallback: string) {
  const localized = pickLocalizedValue(
    language,
    meal?.strMealEn || meal?.nameEn || meal?.strMeal || meal?.name,
    meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh,
    meal?.strMealMs || meal?.nameMs,
    fallback
  );

  if (normalizeLanguageCode(language) === 'zh' || normalizeLanguageCode(language) === 'ms') {
    const sourceName = meal?.strMealEn || meal?.nameEn || meal?.strMeal || meal?.name || fallback;
    if (localized === sourceName) {
      return translateMealName(localized, language);
    }
  }

  return localized;
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
  return pickLocalizedValue(
    language,
    meal?.strInstructionsEn || meal?.instructionsEn || meal?.strInstructions || meal?.instructions,
    meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh,
    meal?.strInstructionsMs || meal?.instructionsMs,
    meal?.strInstructions || meal?.instructions || ''
  );
}

function normalizeMealType(category?: string | null, type?: string | null) {
  const text = `${category || ''} ${type || ''}`.toLowerCase();

  if (text.includes('breakfast')) return 'breakfast';
  if (text.includes('lunch')) return 'lunch';
  if (text.includes('dinner')) return 'dinner';
  if (text.includes('snack')) return 'snack';

  return 'lunch';
}

export default function RecipeDetailScreen() {
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

  const instructions = useMemo(
    () => splitInstructions(instructionsText, meal?.steps),
    [instructionsText, meal?.steps]
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
    if (!meal || !Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
      return {
        calories: safeNumber(meal?.totalEnergyKcal || meal?.calories),
        protein: safeNumber(meal?.totalProteinG || meal?.protein),
        carbs: safeNumber(meal?.totalCarbohydrateG || meal?.carbs),
        fat: safeNumber(meal?.totalFatG || meal?.fat),
      };
    }
    
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    
    localIngredients.forEach(item => {
      const g = safeNumber(item.gramsEstimated);
      if (g > 0) {
        calories += safeNumber(item.energyKcal) * (g / 100);
        protein += safeNumber(item.proteinG) * (g / 100);
        carbs += safeNumber(item.carbohydrateG) * (g / 100);
        fat += safeNumber(item.fatG) * (g / 100);
      }
    });
    
    return { calories, protein, carbs, fat };
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
      strMealEn: meal?.strMealEn || meal?.strMeal || mealNameEn,
      strMealCn: meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || mealNameCn,
      strMealMs: meal?.strMealMs || meal?.nameMs || mealNameMs,
      strCategory: meal?.strCategory || categoryEn,
      strCategoryEn: meal?.strCategoryEn || meal?.strCategory || categoryEn,
      strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || categoryCn,
      strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || categoryMs,
      strArea: meal?.strArea || meal?.strAreaEn || areaEn,
      strAreaEn: meal?.strAreaEn || meal?.strArea || areaEn,
      strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || areaCn,
      strAreaMs: meal?.strAreaMs || meal?.areaMs || areaMs,
      strInstructions: meal?.strInstructions || meal?.strInstructionsEn || instructionsEn,
      strInstructionsEn: meal?.strInstructionsEn || meal?.strInstructions || instructionsEn,
      strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || instructionsCn,
      strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || instructionsMs,
      type: normalizeMealType(categoryEn, meal?.type),
      imageUrl: imageUrl || undefined,
      strMealThumb: imageUrl || meal?.strMealThumb || '',
      mealIconEmoji: mealEmoji,
      carbs: localNutrition.carbs,
      protein: localNutrition.protein,
      fat: localNutrition.fat,
      totalCarbohydrateG: localNutrition.carbs,
      totalProteinG: localNutrition.protein,
      totalFatG: localNutrition.fat,
      totalEnergyKcal: localNutrition.calories,
    };
  }, [meal, mealId, mealName, mealNameEn, mealNameCn, mealNameMs, categoryEn, categoryCn, categoryMs, areaEn, areaCn, areaMs, instructionsEn, instructionsCn, instructionsMs, imageUrl, mealEmoji, localNutrition]);

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
    if (item.measure) return String(item.measure);
    if (item.quantity) return String(item.quantity);
    if (item.gramsEstimated !== undefined && item.gramsEstimated !== null) return `${item.gramsEstimated}g`;
    return '';
  };

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

  const handleUpdateWeight = () => {
    if (selectedIngredientIndex === null) return;

    const newWeight = parseInt(editWeightValue, 10);

    if (isNaN(newWeight) || newWeight < 0) {
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

    setLocalIngredients(prev => {
      const next = [...prev];

      next[selectedIngredientIndex] = {
        ...next[selectedIngredientIndex],
        gramsEstimated: newWeight,
      };

      return newWeight === 0
        ? next.filter(i => safeNumber(i.gramsEstimated) > 0)
        : next.sort((a, b) => safeNumber(b.gramsEstimated) - safeNumber(a.gramsEstimated));
    });

    closeIngredientEditor();
  };

  const handleReplaceIngredient = (foodData: any) => {
    if (selectedIngredientIndex === null) return;

    setLocalIngredients(prev => {
      const next = [...prev];
      const oldWeight = safeNumber(next[selectedIngredientIndex].gramsEstimated) || 100;

      next[selectedIngredientIndex] = {
        ...next[selectedIngredientIndex],
        ingredientName: foodData.foodNameEn || foodData.foodNameOriginal || next[selectedIngredientIndex].ingredientName,
        foodNameEn: foodData.foodNameEn || foodData.foodNameOriginal,
        foodNameCn: foodData.foodNameCn,
        foodNameMs: foodData.foodNameMs,
        name: foodData.foodNameEn || foodData.foodNameOriginal,
        measure: `${Math.round(oldWeight)}g`,
        picUrl: foodData.picUrl,
        energyKcal: foodData.energyKcal || foodData.calories,
        proteinG: foodData.proteinG || foodData.protein,
        carbohydrateG: foodData.carbohydrateG || foodData.carbs,
        fatG: foodData.fatG || foodData.fat,
        gramsEstimated: oldWeight,
      };

      return next.sort((a, b) => safeNumber(b.gramsEstimated) - safeNumber(a.gramsEstimated));
    });

    closeIngredientEditor();

    Alert.alert(
      getText('Food replaced', '食物已替换', 'Makanan telah diganti'),
      getText(
        'The ingredient was replaced and the original weight was kept.',
        '食材已替换，并自动保留原来的重量。',
        'Bahan telah diganti dan berat asal dikekalkan.'
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
          <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
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
                  color={saved ? '#FFFFFF' : colors.primaryDark}
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
                const color = getFoodGroupColor(item.foodGroup || item.category);

                return (
                  <Pressable
                    key={`${name}-${index}`}
                    style={styles.ingredientRow}
                    onPress={() => {
                      setSelectedIngredientIndex(index);
                      setEditWeightValue(String(item.gramsEstimated || '100'));
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
                      {!!measure && <Text style={styles.ingredientMeasure}>{measure}</Text>}
                    </View>

                    {safeNumber(item.gramsEstimated) > 0 && (
                      <View style={styles.ingredientWeightTag}>
                        <Text style={styles.ingredientGram}>{round(item.gramsEstimated)}g</Text>
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

                const dispWeight = safeNumber(editWeightValue) || 0;
                const cals = round(safeNumber(ing.energyKcal) * (dispWeight / 100));
                const carbs = round(safeNumber(ing.carbohydrateG) * (dispWeight / 100));
                const protein = round(safeNumber(ing.proteinG) * (dispWeight / 100));
                const fat = round(safeNumber(ing.fatG) * (dispWeight / 100));
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

                      <TextInput
                        style={styles.detailWeightInput}
                        keyboardType="number-pad"
                        value={editWeightValue}
                        onChangeText={setEditWeightValue}
                        maxLength={5}
                        returnKeyType="done"
                        onSubmitEditing={handleUpdateWeight}
                      />
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
                          <ActivityIndicator size="small" color={colors.primaryDark} />
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
                          <Ionicons name="bulb-outline" size={18} color={colors.primaryDark} />
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

const styles = StyleSheet.create({
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
    color: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
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
    color: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
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
    backgroundColor: 'rgba(15,23,42,0.5)',
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
  detailWeightInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
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
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  detailSaveBtn: {
    backgroundColor: colors.primaryDark,
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
    color: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
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
