import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Callout, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import {
  Card,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';

const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';
const ALL_OWNER_KEY = 'all';
const GUEST_OWNER_KEY = 'guest';

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

type DisplayShoppingItem = ShoppingItem & {
  displayId: string;
  ownerKey: string;
  ownerLabel: string;
};

type OwnerOption = {
  key: string;
  label: string;
  subtitle?: string;
  avatar?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type NearbySupermarket = {
  placeId?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number | null;
  userRatingCount?: number | null;
  openNow?: boolean | null;
  distanceKm?: number | null;
};

const categoryIcons: Record<ShoppingCategory, keyof typeof Ionicons.glyphMap> = {
  vegetables: 'leaf',
  protein: 'fitness',
  carbs: 'pizza',
  others: 'basket',
};

const NEARBY_SUPERMARKET_API_URL =
  process.env.EXPO_PUBLIC_NEARBY_SUPERMARKET_API_URL ||
  'https://jom-healthy-java.onrender.com/map/nearbySupermarkets';

function buildGoogleMapsDirectionsUrl(market: NearbySupermarket) {
  const destination =
    market.latitude !== undefined &&
    market.longitude !== undefined
      ? `${market.latitude},${market.longitude}`
      : market.address || market.name;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}`;
}

function hasMarketCoordinates(market: NearbySupermarket) {
  return (
    market.latitude !== undefined &&
    market.longitude !== undefined &&
    Number.isFinite(market.latitude) &&
    Number.isFinite(market.longitude)
  );
}

const INGREDIENT_TRANSLATIONS: Record<string, { zh: string; ms: string }> = {
  rice: { zh: '米饭', ms: 'Nasi' },
  nasi: { zh: '米饭', ms: 'Nasi' },
  bread: { zh: '面包', ms: 'Roti' },
  toast: { zh: '吐司', ms: 'Roti bakar' },
  noodle: { zh: '面条', ms: 'Mi' },
  noodles: { zh: '面条', ms: 'Mi' },
  pasta: { zh: '意面', ms: 'Pasta' },
  spaghetti: { zh: '意大利面', ms: 'Spageti' },
  oat: { zh: '燕麦', ms: 'Oat' },
  oats: { zh: '燕麦', ms: 'Oat' },
  rolled_oats: { zh: '燕麦片', ms: 'Oat' },
  flour: { zh: '面粉', ms: 'Tepung' },
  potato: { zh: '土豆', ms: 'Kentang' },
  sweet_potato: { zh: '红薯', ms: 'Ubi keledek' },
  chicken: { zh: '鸡肉', ms: 'Ayam' },
  chicken_breast: { zh: '鸡胸肉', ms: 'Dada ayam' },
  beef: { zh: '牛肉', ms: 'Daging lembu' },
  fish: { zh: '鱼', ms: 'Ikan' },
  fish_fillet: { zh: '鱼片', ms: 'Isi ikan' },
  salmon: { zh: '三文鱼', ms: 'Salmon' },
  tuna: { zh: '金枪鱼', ms: 'Tuna' },
  egg: { zh: '鸡蛋', ms: 'Telur' },
  eggs: { zh: '鸡蛋', ms: 'Telur' },
  tofu: { zh: '豆腐', ms: 'Tauhu' },
  bean: { zh: '豆类', ms: 'Kacang' },
  beans: { zh: '豆类', ms: 'Kacang' },
  lentil: { zh: '扁豆', ms: 'Lentil' },
  milk: { zh: '牛奶', ms: 'Susu' },
  yogurt: { zh: '酸奶', ms: 'Yogurt' },
  cheese: { zh: '奶酪', ms: 'Keju' },
  broccoli: { zh: '西兰花', ms: 'Brokoli' },
  spinach: { zh: '菠菜', ms: 'Bayam' },
  carrot: { zh: '胡萝卜', ms: 'Lobak merah' },
  tomato: { zh: '番茄', ms: 'Tomato' },
  cucumber: { zh: '黄瓜', ms: 'Timun' },
  onion: { zh: '洋葱', ms: 'Bawang' },
  garlic: { zh: '大蒜', ms: 'Bawang putih' },
  cabbage: { zh: '卷心菜', ms: 'Kubis' },
  lettuce: { zh: '生菜', ms: 'Salad' },
  mushroom: { zh: '蘑菇', ms: 'Cendawan' },
  mixed_vegetables: { zh: '混合蔬菜', ms: 'Sayur campuran' },
  corn: { zh: '玉米', ms: 'Jagung' },
  pea: { zh: '豌豆', ms: 'Kacang pea' },
  peas: { zh: '豌豆', ms: 'Kacang pea' },
  banana: { zh: '香蕉', ms: 'Pisang' },
  apple: { zh: '苹果', ms: 'Epal' },
  orange: { zh: '橙子', ms: 'Oren' },
  mango: { zh: '芒果', ms: 'Mangga' },
  strawberry: { zh: '草莓', ms: 'Strawberi' },
  berries: { zh: '莓果', ms: 'Beri' },
  avocado: { zh: '牛油果', ms: 'Avokado' },
  lemon: { zh: '柠檬', ms: 'Lemon' },
  lime: { zh: '青柠', ms: 'Limau nipis' },
  oil: { zh: '油', ms: 'Minyak' },
  olive_oil: { zh: '橄榄油', ms: 'Minyak zaitun' },
  butter: { zh: '黄油', ms: 'Mentega' },
  salt: { zh: '盐', ms: 'Garam' },
  sugar: { zh: '糖', ms: 'Gula' },
  honey: { zh: '蜂蜜', ms: 'Madu' },
  soy_sauce: { zh: '酱油', ms: 'Kicap' },
  coconut_milk: { zh: '椰浆', ms: 'Santan' },
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function translateIngredientName(name: string, language: string) {
  if (language === 'en') return name;

  const lower = name.toLowerCase();
  const exact = INGREDIENT_TRANSLATIONS[normalizeKey(name)];

  if (exact) {
    return language === 'zh' ? exact.zh : exact.ms;
  }

  const entry = Object.entries(INGREDIENT_TRANSLATIONS).find(([key]) => {
    const keyword = key.replace(/_/g, ' ');
    return lower.includes(keyword) || lower.includes(keyword.replace(/s$/, ''));
  });

  if (!entry) return name;

  return language === 'zh' ? entry[1].zh : entry[1].ms;
}

function normalizeOwnerKey(value?: string | null) {
  const text = String(value || '').trim();
  return text.length > 0 ? text : GUEST_OWNER_KEY;
}

function getOwnerKeyForChild(child: any) {
  return `child_${child.id}`;
}

function normalizeShoppingCategory(value: any): ShoppingCategory {
  const text = String(value || '').toLowerCase();

  if (text === 'vegetables' || text === 'protein' || text === 'carbs' || text === 'others') {
    return text;
  }

  if (text.includes('veg') || text.includes('fruit')) return 'vegetables';
  if (text.includes('protein') || text.includes('meat') || text.includes('fish') || text.includes('egg')) return 'protein';
  if (text.includes('carb') || text.includes('grain') || text.includes('rice')) return 'carbs';

  return 'others';
}

function normalizeShoppingList(value: any): ShoppingItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `${item.name || 'item'}-${index}`).replace(/\s+/g, '-'),
      name: String(item.name || item.nameEn || item.foodNameEn || item.ingredientName || 'Ingredient'),
      nameEn: item.nameEn || item.name || item.foodNameEn || item.ingredientName || '',
      nameCn: item.nameCn || item.foodNameCn || '',
      nameMs: item.nameMs || item.foodNameMs || '',
      quantity: String(item.quantity || item.measure || ''),
      quantityCn: item.quantityCn || '',
      quantityMs: item.quantityMs || '',
      category: normalizeShoppingCategory(item.category),
      source: String(item.source || item.sourceEn || ''),
      sourceEn: item.sourceEn || item.source || '',
      sourceCn: item.sourceCn || '',
      sourceMs: item.sourceMs || '',
      mealId: String(item.mealId || ''),
      checked: Boolean(item.checked),
      picUrl: item.picUrl || '',
    }));
}

function getShoppingItemName(item: ShoppingItem, language: string) {
  if (language === 'zh') {
    return item.nameCn || translateIngredientName(item.nameEn || item.name, language);
  }

  if (language === 'ms') {
    return item.nameMs || translateIngredientName(item.nameEn || item.name, language);
  }

  return item.nameEn || item.name;
}

function getShoppingItemQuantity(item: ShoppingItem, language: string) {
  if (language === 'zh') return item.quantityCn || item.quantity;
  if (language === 'ms') return item.quantityMs || item.quantity;
  return item.quantity;
}

function getShoppingItemSource(item: ShoppingItem, language: string) {
  if (language === 'zh') return item.sourceCn || item.source;
  if (language === 'ms') return item.sourceMs || item.source;
  return item.sourceEn || item.source;
}

export default function ShoppingScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const childProfile = useChildProfile() as any;
  const {
    activeChild,
    getOwnerKey,
    children = [],
  } = childProfile;

  const firstChildOwnerKey = children?.[0]?.id ? getOwnerKeyForChild(children[0]) : ALL_OWNER_KEY;
  const activeOwnerKey = activeChild?.id
    ? getOwnerKeyForChild(activeChild)
    : firstChildOwnerKey;

  const [showSupermarkets, setShowSupermarkets] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [shoppingByOwner, setShoppingByOwner] = useState<Record<string, ShoppingItem[]>>({});
  const [selectedOwnerKey, setSelectedOwnerKey] = useState<string>(activeOwnerKey);
  const [nearbySupermarkets, setNearbySupermarkets] = useState<NearbySupermarket[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyUserLocation, setNearbyUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedNearbyPlaceId, setSelectedNearbyPlaceId] = useState<string | null>(null);
  const [nearbyMapReady, setNearbyMapReady] = useState(false);
  const nearbyMapRef = useRef<MapView | null>(null);
  const nearbyMarkerRefs = useRef<Record<string, Marker | null>>({});

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const nearbyMapRegion = useMemo(() => {
    if (!nearbyUserLocation) return null;

    return {
      latitude: nearbyUserLocation.latitude,
      longitude: nearbyUserLocation.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
  }, [nearbyUserLocation]);

  const getMarketMarkerKey = useCallback((market: NearbySupermarket, index?: number) => {
    return String(market.placeId || `${market.name}-${index ?? 'market'}`);
  }, []);

  const selectedNearbyMarket = useMemo(() => {
    return nearbySupermarkets.find((market) => market.placeId === selectedNearbyPlaceId) || null;
  }, [nearbySupermarkets, selectedNearbyPlaceId]);

  const showSelectedMarketCallout = useCallback((market: NearbySupermarket) => {
    const markerKey = getMarketMarkerKey(market);
    const marker = nearbyMarkerRefs.current[markerKey];

    if (marker && typeof marker.showCallout === 'function') {
      marker.showCallout();
    }
  }, [getMarketMarkerKey]);

  const focusMapOnSupermarket = useCallback((market: NearbySupermarket, showCalloutAfterFocus = true) => {
    if (!hasMarketCoordinates(market)) return;

    nearbyMapRef.current?.animateToRegion(
      {
        latitude: Number(market.latitude),
        longitude: Number(market.longitude),
        latitudeDelta: 0.0038,
        longitudeDelta: 0.0038,
      },
      700
    );

    if (showCalloutAfterFocus) {
      setTimeout(() => showSelectedMarketCallout(market), 760);
    }
  }, [showSelectedMarketCallout]);

  const selectNearbySupermarket = useCallback(
    (market: NearbySupermarket) => {
      setSelectedNearbyPlaceId(market.placeId || null);

      requestAnimationFrame(() => {
        focusMapOnSupermarket(market, true);
      });
    },
    [focusMapOnSupermarket]
  );

  useEffect(() => {
    if (!showSupermarkets || !nearbyMapReady || !selectedNearbyMarket) return;

    const timer = setTimeout(() => {
      focusMapOnSupermarket(selectedNearbyMarket, true);
    }, 180);

    return () => clearTimeout(timer);
  }, [showSupermarkets, nearbyMapReady, selectedNearbyMarket, focusMapOnSupermarket]);

  const getOwnerLabel = useCallback(
    (ownerKey: string) => {
      if (ownerKey === ALL_OWNER_KEY) return getText('All children', '所有小孩', 'Semua Anak');

      const matchedChild = children.find((child: any) => getOwnerKeyForChild(child) === ownerKey);
      return matchedChild?.nickname || ownerKey.replace(/^child_/, getText('Child ', '小孩 ', 'Anak '));
    },
    [children, language]
  );

  const ownerOptions = useMemo<OwnerOption[]>(() => {
    const options: OwnerOption[] = [
      {
        key: ALL_OWNER_KEY,
        label: getText('All children', '所有小孩', 'Semua Anak'),
        subtitle: getText('View every child list', '查看所有小孩清单', 'Lihat semua senarai anak'),
        icon: 'people',
      },
    ];

    children.forEach((child: any) => {
      options.push({
        key: getOwnerKeyForChild(child),
        label: child.nickname || getText('Child', '小孩', 'Anak'),
        avatar: child.avatar || '👶',
        subtitle: getText('Child list', '小孩清单', 'Senarai anak'),
      });
    });

    return options;
  }, [children, language]);

  const childOwnerKeys = useMemo(
    () => children.map((child: any) => getOwnerKeyForChild(child)),
    [children]
  );

  const loadShoppingList = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const nextByOwner: Record<string, ShoppingItem[]> = {};

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([owner, list]) => {
          nextByOwner[normalizeOwnerKey(owner)] = normalizeShoppingList(list);
        });
      }

      setShoppingByOwner(nextByOwner);
    } catch (error) {
      console.log('Load shopping list failed:', error);
      setShoppingByOwner({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShoppingList();
    }, [loadShoppingList])
  );

  useEffect(() => {
    if (selectedOwnerKey === ALL_OWNER_KEY) return;

    const optionExists = ownerOptions.some((option) => option.key === selectedOwnerKey);
    if (!optionExists) {
      setSelectedOwnerKey(activeOwnerKey || ALL_OWNER_KEY);
    }
  }, [activeOwnerKey, ownerOptions, selectedOwnerKey]);

  const saveShoppingByOwner = async (nextByOwner: Record<string, ShoppingItem[]>) => {
    setShoppingByOwner(nextByOwner);

    try {
      await AsyncStorage.setItem(
        SHOPPING_LIST_STORAGE_KEY,
        JSON.stringify(nextByOwner)
      );
    } catch (error) {
      console.log('Save shopping list failed:', error);
    }
  };

  const selectedShoppingList = useMemo<DisplayShoppingItem[]>(() => {
    if (selectedOwnerKey === ALL_OWNER_KEY) {
      return childOwnerKeys.flatMap((owner: string) =>
        normalizeShoppingList(shoppingByOwner[owner]).map((item) => ({
          ...item,
          ownerKey: owner,
          ownerLabel: getOwnerLabel(owner),
          displayId: `${owner}__${item.id}`,
        }))
      );
    }

    return normalizeShoppingList(shoppingByOwner[selectedOwnerKey]).map((item) => ({
      ...item,
      ownerKey: selectedOwnerKey,
      ownerLabel: getOwnerLabel(selectedOwnerKey),
      displayId: `${selectedOwnerKey}__${item.id}`,
    }));
  }, [selectedOwnerKey, shoppingByOwner, childOwnerKeys, getOwnerLabel]);

  const toggleShoppingItem = async (ownerKey: string, itemId: string) => {
    const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
    const nextByOwner = {
      ...shoppingByOwner,
      [normalizedOwnerKey]: normalizeShoppingList(shoppingByOwner[normalizedOwnerKey]).map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    };

    await saveShoppingByOwner(nextByOwner);
  };

  const clearCheckedItems = async () => {
    const nextByOwner = { ...shoppingByOwner };

    if (selectedOwnerKey === ALL_OWNER_KEY) {
      childOwnerKeys.forEach((owner: string) => {
        nextByOwner[owner] = normalizeShoppingList(nextByOwner[owner]).filter((item) => !item.checked);
      });
    } else {
      nextByOwner[selectedOwnerKey] = normalizeShoppingList(nextByOwner[selectedOwnerKey]).filter((item) => !item.checked);
    }

    await saveShoppingByOwner(nextByOwner);
  };

  const resetAllItems = async () => {
    const nextByOwner = { ...shoppingByOwner };

    if (selectedOwnerKey === ALL_OWNER_KEY) {
      childOwnerKeys.forEach((owner: string) => {
        nextByOwner[owner] = normalizeShoppingList(nextByOwner[owner]).map((item) => ({
          ...item,
          checked: false,
        }));
      });
    } else {
      nextByOwner[selectedOwnerKey] = normalizeShoppingList(nextByOwner[selectedOwnerKey]).map((item) => ({
        ...item,
        checked: false,
      }));
    }

    await saveShoppingByOwner(nextByOwner);
  };

  const normalizeNearbySupermarkets = (payload: any): NearbySupermarket[] => {
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.result)
      ? payload.result
      : [];

    return rows
      .filter((item: any) => item && (item.name || item.displayName))
      .map((item: any) => ({
        placeId: item.placeId || item.id || '',
        name: String(item.name || item.displayName || ''),
        address: String(item.address || item.formattedAddress || ''),
        latitude:
          item.latitude !== undefined
            ? Number(item.latitude)
            : item.location?.latitude !== undefined
            ? Number(item.location.latitude)
            : undefined,
        longitude:
          item.longitude !== undefined
            ? Number(item.longitude)
            : item.location?.longitude !== undefined
            ? Number(item.location.longitude)
            : undefined,
        rating:
          item.rating === null || item.rating === undefined
            ? null
            : Number(item.rating),
        userRatingCount:
          item.userRatingCount === null || item.userRatingCount === undefined
            ? null
            : Number(item.userRatingCount),
        openNow:
          item.openNow === null || item.openNow === undefined
            ? null
            : Boolean(item.openNow),
        distanceKm:
          item.distanceKm === null || item.distanceKm === undefined
            ? null
            : Number(item.distanceKm),
      }));
  };

  const loadNearbySupermarkets = async () => {
    setShowSupermarkets(true);
    setNearbyMapReady(false);
    setNearbyLoading(true);
    setNearbyError('');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        const message = getText(
          'Location permission is needed to find supermarkets near you.',
          '需要定位权限，才能查找你附近的超市。',
          'Kebenaran lokasi diperlukan untuk mencari pasar raya berdekatan.'
        );
        setNearbyError(message);
        Alert.alert(getText('Location Needed', '需要定位权限', 'Lokasi Diperlukan'), message);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;
      setNearbyUserLocation({ latitude, longitude });
      const requestUrl =
        `${NEARBY_SUPERMARKET_API_URL}?lat=${encodeURIComponent(latitude)}` +
        `&lng=${encodeURIComponent(longitude)}&radius=3000`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Nearby supermarket request failed: ${response.status}`);
      }

      const payload = await response.json();
      const list = normalizeNearbySupermarkets(payload);

      setNearbySupermarkets(list);

      const firstMarketWithCoordinates = list.find(hasMarketCoordinates) || list[0];
      setSelectedNearbyPlaceId(firstMarketWithCoordinates?.placeId || null);

      if (firstMarketWithCoordinates && hasMarketCoordinates(firstMarketWithCoordinates)) {
        setTimeout(() => {
          focusMapOnSupermarket(firstMarketWithCoordinates, true);
        }, 320);
      }

      if (list.length === 0) {
        setNearbyError(
          getText(
            'No nearby supermarkets were found. Try again later or open Google Maps.',
            '没有找到附近超市，可以稍后重试或打开 Google Maps。',
            'Tiada pasar raya ditemui. Cuba lagi kemudian atau buka Google Maps.'
          )
        );
      }
    } catch (error) {
      console.log('Load nearby supermarkets failed:', error);
      setNearbySupermarkets([]);
      setSelectedNearbyPlaceId(null);
      setNearbyError(
        getText(
          'Unable to load nearby supermarkets right now.',
          '暂时无法加载附近超市。',
          'Tidak dapat memuatkan pasar raya berdekatan buat masa ini.'
        )
      );
    } finally {
      setNearbyLoading(false);
    }
  };

  const openGoogleMapsForSupermarket = async (market: NearbySupermarket) => {
    const url = buildGoogleMapsDirectionsUrl(market);

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          getText('Cannot Open Maps', '无法打开地图', 'Tidak Dapat Buka Peta'),
          getText(
            'Unable to open Google Maps.',
            '无法打开 Google Maps。',
            'Tidak dapat membuka Google Maps.'
          )
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Open Google Maps failed:', error);
      Alert.alert(
        getText('Error', '错误', 'Ralat'),
        getText(
          'Unable to open Google Maps.',
          '无法打开 Google Maps。',
          'Tidak dapat membuka Google Maps.'
        )
      );
    }
  };

  const openGrabApp = async () => {
    const grabAppUrl = 'grab://open';
    const grabFallbackUrl = 'https://www.grab.com/my/';

    try {
      const canOpenGrabApp = await Linking.canOpenURL(grabAppUrl);

      if (canOpenGrabApp) {
        await Linking.openURL(grabAppUrl);
        return;
      }

      await Linking.openURL(grabFallbackUrl);
    } catch (error) {
      console.log('Open Grab failed:', error);

      try {
        await Linking.openURL(grabFallbackUrl);
      } catch {
        Alert.alert(
          getText('Error', '错误', 'Ralat'),
          getText('Unable to open Grab.', '无法打开 Grab。', 'Tidak dapat membuka Grab.')
        );
      }
    }
  };

  const openGrabForSupermarket = (market: NearbySupermarket) => {
    const destinationText = market.address || market.name;

    Alert.alert(
      getText('Open Grab', '打开 Grab', 'Buka Grab'),
      getText(
        `Use this supermarket as your destination in Grab:\n${destinationText}`,
        `在 Grab 中把这个超市设为目的地：\n${destinationText}`,
        `Gunakan pasar raya ini sebagai destinasi dalam Grab:\n${destinationText}`
      ),
      [
        {
          text: getText('Cancel', '取消', 'Batal'),
          style: 'cancel',
        },
        {
          text: getText('Open Grab', '打开 Grab', 'Buka Grab'),
          onPress: openGrabApp,
        },
      ]
    );
  };

  const openGrabMart = async () => {
    const grabMartUrl = 'https://food.grab.com/my/en/';
    const grabAppUrl = 'grab://open';

    try {
      const canOpenGrabApp = await Linking.canOpenURL(grabAppUrl);

      if (canOpenGrabApp) {
        await Linking.openURL(grabAppUrl);
        return;
      }

      await Linking.openURL(grabMartUrl);
    } catch (error) {
      console.log('Open Grab failed:', error);

      try {
        await Linking.openURL(grabMartUrl);
      } catch {
        Alert.alert(getText('Error', '错误', 'Ralat'), getText('Unable to open Grab.', '无法打开 Grab。', 'Tidak dapat membuka Grab.'));
      }
    }
  };

  const grouped = useMemo(() => {
    return selectedShoppingList.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<ShoppingCategory, DisplayShoppingItem[]>);
  }, [selectedShoppingList]);

  const checkedCount = selectedShoppingList.filter((item) => item.checked).length;
  const totalCount = selectedShoppingList.length;
  const percent = totalCount ? Math.round((checkedCount / totalCount) * 100) : 0;
  const selectedOwnerLabel = getOwnerLabel(selectedOwnerKey);
  const isAllSelected = selectedOwnerKey === ALL_OWNER_KEY;

  const categoryNames: Record<ShoppingCategory, string> = {
    vegetables: getText('Vegetables', '蔬菜', 'Sayur-sayuran'),
    protein: getText('Protein', '蛋白质', 'Protein'),
    carbs: getText('Carbs', '碳水', 'Karbohidrat'),
    others: getText('Others', '其他', 'Lain-lain'),
  };

  const categoryOrder: ShoppingCategory[] = [
    'vegetables',
    'protein',
    'carbs',
    'others',
  ];

  return (
    <>
      <Screen padded={false}>
        <Header
          title={getText('Shopping', '购物清单', 'Senarai Beli-belah')}
          subtitle={
            isAllSelected
              ? getText(
                  'All children ingredients',
                  '所有小孩的食材',
                  'Bahan untuk semua anak'
                )
              : getText(
                  `${selectedOwnerLabel}'s ingredients`,
                  `${selectedOwnerLabel}的食材`,
                  `Bahan untuk ${selectedOwnerLabel}`
                )
          }
          icon="cart"
          right={
            <Pressable
              style={styles.headerOwnerButton}
              onPress={() => setShowOwnerDropdown(true)}
            >
              <Ionicons
                name={isAllSelected ? 'people' : 'person'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.headerOwnerText} numberOfLines={1}>
                {selectedOwnerLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
            </Pressable>
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <Card>
            <View style={styles.supermarketHeader}>
              <View style={styles.supermarketIconBox}>
                <Ionicons
                  name="storefront"
                  size={22}
                  color={colors.primaryDark}
                />
              </View>

              <View style={styles.supermarketInfo}>
                <Text style={styles.supermarketTitle}>{getText('Nearby Supermarkets', '附近超市', 'Pasar Raya Berdekatan')}</Text>
                <Text style={styles.supermarketSubtitle}>
                  {getText('Find ingredients in stores near you or order with GrabMart.', '查找附近商店的食材，或使用 GrabMart 下单。', 'Cari bahan di kedai berdekatan atau pesan dengan GrabMart.')}
                </Text>
              </View>
            </View>

            <View style={styles.supermarketActionRow}>
              <Pressable
                style={styles.nearbyButton}
                onPress={loadNearbySupermarkets}
              >
                <Ionicons name="location-outline" size={17} color="#FFFFFF" />
                <Text style={styles.nearbyButtonText}>{getText('Find Nearby', '查找附近', 'Cari Berdekatan')}</Text>
              </Pressable>

              <Pressable style={styles.grabButton} onPress={openGrabMart}>
                <Ionicons name="bag-handle-outline" size={17} color="#12A150" />
                <Text style={styles.grabButtonText}>{getText('Open GrabMart', '打开 GrabMart', 'Buka GrabMart')}</Text>
              </Pressable>
            </View>
          </Card>

          {totalCount === 0 ? (
            <EmptyState
              emoji="🛒"
              title={
                isAllSelected
                  ? getText('No shopping items for any child yet', '所有小孩都还没有购物食材', 'Belum ada item belian untuk semua anak')
                  : getText('No shopping items yet', '还没有购物食材', 'Belum ada item belian')
              }
              subtitle={getText('Add recipes to your Meal Plan first. Ingredients will automatically appear here.', '先把食谱加入膳食计划，食材会自动出现在这里。', 'Tambah resipi ke Pelan Makanan dahulu. Bahan akan muncul secara automatik di sini.')}
              action={
                <PrimaryButton
                  title={getText('Go to Meal Plan', '前往膳食计划', 'Pergi ke Pelan Makanan')}
                  icon="restaurant"
                  onPress={() => navigation.navigate('Meal')}
                />
              }
            />
          ) : (
            <>
              <Card>
                <View style={styles.progressHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{getText('Shopping List', '购物清单', 'Senarai Beli-belah')}</Text>
                    <Text style={styles.cardSub}>
                      {isAllSelected
                        ? getText(
                            'Generated from all Meal Plans',
                            '来自所有小孩的膳食计划',
                            'Dijana daripada semua Pelan Makanan'
                          )
                        : getText(
                            `Generated from ${selectedOwnerLabel}'s Meal Plan`,
                            `来自${selectedOwnerLabel}的膳食计划`,
                            `Dijana daripada Pelan Makanan ${selectedOwnerLabel}`
                          )}
                    </Text>
                  </View>

                  <Text style={styles.percent}>{`${percent}%`}</Text>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${percent}%` }]}
                  />
                </View>

                <Text style={styles.progressText}>
                  {getText(`${checkedCount} / ${totalCount} checked`, `${checkedCount} / ${totalCount} 已勾选`, `${checkedCount} / ${totalCount} ditanda`)}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={resetAllItems}>
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.secondaryButtonText}>{getText('Reset', '重置', 'Tetapkan Semula')}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dangerButton}
                    onPress={clearCheckedItems}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.dangerButtonText}>{getText('Clear Checked', '清除已勾选', 'Kosongkan Yang Ditanda')}</Text>
                  </Pressable>
                </View>
              </Card>

              {categoryOrder
                .filter((category) => grouped[category]?.length)
                .map((category) => (
                  <View key={category}>
                    <SectionTitle title={categoryNames[category]} />

                    {grouped[category].map((item) => (
                      <Pressable
                        key={item.displayId}
                        onPress={() => toggleShoppingItem(item.ownerKey, item.id)}
                        style={[
                          styles.itemRow,
                          item.checked && styles.itemDone,
                        ]}
                      >
                        <View style={styles.itemIcon}>
                          {item.picUrl ? (
                            <Image
                              source={{ uri: item.picUrl }}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons
                              name={categoryIcons[category]}
                              color={colors.primaryDark}
                              size={18}
                            />
                          )}
                        </View>

                        <View style={styles.itemInfo}>
                          <View style={styles.itemTitleRow}>
                            <Text
                              style={[
                                styles.itemName,
                                item.checked && styles.itemNameDone,
                              ]}
                              numberOfLines={1}
                            >
                              {getShoppingItemName(item, language)}
                            </Text>

                            {isAllSelected && (
                              <View style={styles.ownerBadge}>
                                <Text style={styles.ownerBadgeText} numberOfLines={1}>
                                  {item.ownerLabel}
                                </Text>
                              </View>
                            )}
                          </View>

                          {!!item.quantity && (
                            <Text style={styles.itemQuantity}>
                              {getShoppingItemQuantity(item, language)}
                            </Text>
                          )}

                          <Text style={styles.itemSource} numberOfLines={2}>
                            {getShoppingItemSource(item, language)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.check,
                            item.checked && styles.checkDone,
                          ]}
                        >
                          {item.checked && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}
            </>
          )}
        </ScrollView>
      </Screen>

      <Modal
        visible={showOwnerDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOwnerDropdown(false)}
      >
        <Pressable
          style={styles.ownerDropdownBackdrop}
          onPress={() => setShowOwnerDropdown(false)}
        >
          <View style={styles.ownerDropdownPanel}>
            <Text style={styles.ownerDropdownTitle}>
              {getText('Shopping list', '购物清单', 'Senarai Beli-belah')}
            </Text>

            {ownerOptions.map((option) => {
              const selected = selectedOwnerKey === option.key;
              const listCount = option.key === ALL_OWNER_KEY
                ? childOwnerKeys.reduce(
                    (sum: number, owner: string) => sum + normalizeShoppingList(shoppingByOwner[owner]).length,
                    0
                  )
                : normalizeShoppingList(shoppingByOwner[option.key]).length;

              return (
                <Pressable
                  key={option.key}
                  style={[styles.ownerDropdownItem, selected && styles.ownerDropdownItemActive]}
                  onPress={() => {
                    setSelectedOwnerKey(option.key);
                    setShowOwnerDropdown(false);
                  }}
                >
                  <View style={[styles.ownerDropdownIcon, selected && styles.ownerDropdownIconActive]}>
                    {option.avatar ? (
                      <Text style={styles.ownerDropdownAvatar}>{option.avatar}</Text>
                    ) : (
                      <Ionicons
                        name={option.icon || 'person'}
                        size={17}
                        color={selected ? '#FFFFFF' : colors.primaryDark}
                      />
                    )}
                  </View>

                  <View style={styles.ownerDropdownTextWrap}>
                    <Text
                      numberOfLines={1}
                      style={[styles.ownerDropdownLabel, selected && styles.ownerDropdownLabelActive]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.ownerDropdownCount, selected && styles.ownerDropdownCountActive]}
                    >
                      {getText(
                        `${listCount} item${listCount === 1 ? '' : 's'}`,
                        `${listCount} 项`,
                        `${listCount} item`
                      )}
                    </Text>
                  </View>

                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSupermarkets}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSupermarkets(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSupermarkets(false)}
        >
          <Pressable style={styles.supermarketModal} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{getText('Nearby Supermarkets', '附近超市', 'Pasar Raya Berdekatan')}</Text>
                <Text style={styles.modalSubtitle}>
                  {getText('Choose a supermarket below to focus the map. Tap a map pin to open Google Maps.', '从下方选择超市，地图会自动定位。点击地图上的标记可打开 Google Maps。', 'Pilih pasar raya di bawah untuk fokus pada peta. Ketik penanda peta untuk buka Google Maps.')}
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowSupermarkets(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.supermarketList}
            >
              <View style={styles.nearbyMapCard}>
                {nearbyMapRegion ? (
                  <MapView
                    ref={nearbyMapRef}
                    style={styles.nearbyMap}
                    initialRegion={nearbyMapRegion}
                    showsUserLocation
                    showsMyLocationButton
                    loadingEnabled
                    onMapReady={() => setNearbyMapReady(true)}
                  >
                    <Marker
                      coordinate={nearbyUserLocation as { latitude: number; longitude: number }}
                      title={getText('Your location', '你的位置', 'Lokasi anda')}
                      pinColor="#2563EB"
                    />

                    {nearbySupermarkets
                      .filter(hasMarketCoordinates)
                      .map((market, index) => (
                        <Marker
                          ref={(marker) => {
                            nearbyMarkerRefs.current[getMarketMarkerKey(market, index)] = marker;
                          }}
                          key={`map-${market.placeId || market.name}-${index}`}
                          coordinate={{
                            latitude: Number(market.latitude),
                            longitude: Number(market.longitude),
                          }}
                          title={market.name}
                          description={market.address || undefined}
                          pinColor={selectedNearbyPlaceId === market.placeId ? '#12A150' : '#EF4444'}
                          onPress={() => selectNearbySupermarket(market)}
                        >
                          <Callout onPress={() => openGoogleMapsForSupermarket(market)}>
                            <View style={styles.marketCalloutCard}>
                              <Text style={styles.marketCalloutTitle}>{market.name}</Text>
                              {!!market.address && (
                                <Text style={styles.marketCalloutAddress} numberOfLines={2}>
                                  {market.address}
                                </Text>
                              )}
                              <View style={styles.marketCalloutButton}>
                                <Ionicons name="map-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.marketCalloutButtonText}>
                                  {getText('Open Google Maps', '打开 Google 地图', 'Buka Google Maps')}
                                </Text>
                              </View>
                            </View>
                          </Callout>
                        </Marker>
                      ))}
                  </MapView>
                ) : (
                  <View style={styles.nearbyMapPlaceholder}>
                    {nearbyLoading ? (
                      <ActivityIndicator size="small" color={colors.primaryDark} />
                    ) : (
                      <Ionicons name="map-outline" size={26} color={colors.primaryDark} />
                    )}
                    <Text style={styles.nearbyMapPlaceholderTitle}>
                      {nearbyLoading
                        ? getText('Preparing the map...', '正在准备地图...', 'Menyediakan peta...')
                        : getText('Map will appear after location is found', '定位成功后会显示地图', 'Peta akan dipaparkan selepas lokasi ditemui')}
                    </Text>
                  </View>
                )}
              </View>

              {nearbyLoading ? (
                <View style={styles.nearbyLoadingWrap}>
                  <ActivityIndicator size="large" color={colors.primaryDark} />
                  <Text style={styles.nearbyLoadingText}>
                    {getText(
                      'Finding supermarkets near you...',
                      '正在查找你附近的超市...',
                      'Mencari pasar raya berdekatan...'
                    )}
                  </Text>
                </View>
              ) : nearbySupermarkets.length > 0 ? (
                nearbySupermarkets.map((market, index) => (
                  <Pressable
                    key={market.placeId || `${market.name}-${index}`}
                    style={[
                      styles.marketRow,
                      selectedNearbyPlaceId === market.placeId && styles.marketRowSelected,
                    ]}
                    onPress={() => selectNearbySupermarket(market)}
                  >
                    <View style={styles.marketIcon}>
                      <Ionicons
                        name="storefront-outline"
                        size={20}
                        color={colors.primaryDark}
                      />
                    </View>

                    <View style={styles.marketInfo}>
                      <Text style={styles.marketName}>{market.name}</Text>

                      {!!market.address && (
                        <Text style={styles.marketSubtitle} numberOfLines={2}>
                          {market.address}
                        </Text>
                      )}

                      <View style={styles.marketMetaRow}>
                        {market.distanceKm !== null && market.distanceKm !== undefined && Number.isFinite(market.distanceKm) && (
                          <View style={styles.marketMetaPill}>
                            <Ionicons name="navigate-outline" size={12} color={colors.primaryDark} />
                            <Text style={styles.marketMetaText}>
                              {`${market.distanceKm.toFixed(2)} km`}
                            </Text>
                          </View>
                        )}

                        {market.rating !== null && market.rating !== undefined && Number.isFinite(market.rating) && (
                          <View style={styles.marketMetaPill}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.marketMetaText}>
                              {market.rating.toFixed(1)}
                              {market.userRatingCount ? ` (${market.userRatingCount})` : ''}
                            </Text>
                          </View>
                        )}

                        {market.openNow !== null && market.openNow !== undefined && (
                          <View
                            style={[
                              styles.marketMetaPill,
                              market.openNow ? styles.marketOpenPill : styles.marketClosedPill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.marketMetaText,
                                market.openNow ? styles.marketOpenText : styles.marketClosedText,
                              ]}
                            >
                              {market.openNow
                                ? getText('Open', '营业中', 'Buka')
                                : getText('Closed', '已休息', 'Tutup')}
                            </Text>
                          </View>
                        )}
                      </View>

                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.nearbyEmptyWrap}>
                  <Ionicons name="location-outline" size={28} color={colors.primaryDark} />
                  <Text style={styles.nearbyEmptyTitle}>
                    {getText('No supermarkets to show', '暂无附近超市', 'Tiada pasar raya untuk dipaparkan')}
                  </Text>
                  <Text style={styles.nearbyEmptySubtitle}>
                    {nearbyError ||
                      getText(
                        'Tap Find Nearby to use your location.',
                        '点击“查找附近”来使用你的定位。',
                        'Tekan Cari Berdekatan untuk menggunakan lokasi anda.'
                      )}
                  </Text>
                  <Pressable style={styles.nearbyRetryButton} onPress={loadNearbySupermarkets}>
                    <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.nearbyRetryButtonText}>
                      {getText('Try Again', '重新查找', 'Cuba Lagi')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalGrabButton} onPress={openGrabMart}>
                <Ionicons name="bag-handle" size={18} color="#FFFFFF" />
                <Text style={styles.modalGrabButtonText}>{getText('Open GrabMart', '打开 GrabMart', 'Buka GrabMart')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    color: '#FFFFFF',
    fontWeight: '800',
  },

  headerOwnerButton: {
    maxWidth: 150,
    minWidth: 96,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  headerOwnerText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  ownerDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.20)',
    alignItems: 'flex-end',
    paddingTop: 86,
    paddingRight: 16,
  },

  ownerDropdownPanel: {
    width: 250,
    maxHeight: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  ownerDropdownTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  ownerDropdownItem: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  ownerDropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },

  ownerDropdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ownerDropdownIconActive: {
    backgroundColor: colors.primaryDark,
  },

  ownerDropdownAvatar: {
    fontSize: 18,
  },

  ownerDropdownTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  ownerDropdownLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  ownerDropdownLabelActive: {
    color: colors.primaryDark,
  },

  ownerDropdownCount: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  ownerDropdownCountActive: {
    color: colors.primaryDark,
  },

  ownerSelectorCard: {
    paddingBottom: 14,
  },

  ownerSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ownerSelectorTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  ownerSelectorSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  ownerChipScroll: {
    marginTop: 14,
  },

  ownerChipContent: {
    gap: 10,
    paddingRight: 4,
  },

  ownerChip: {
    minWidth: 138,
    maxWidth: 176,
    minHeight: 54,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  ownerChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },

  ownerChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ownerChipIconActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  ownerChipAvatar: {
    fontSize: 18,
  },

  ownerChipTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  ownerChipLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  ownerChipLabelActive: {
    color: '#FFFFFF',
  },

  ownerChipCount: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  ownerChipCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },

  supermarketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  supermarketIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  supermarketInfo: {
    flex: 1,
  },

  supermarketTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  supermarketSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
  },

  supermarketActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  nearbyButton: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  nearbyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  grabButton: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  grabButtonText: {
    color: '#12A150',
    fontWeight: '900',
    fontSize: 13,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },

  cardTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 20,
  },

  cardSub: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },

  percent: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 22,
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
  },

  progressText: {
    marginTop: 10,
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },

  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 13,
  },

  dangerButton: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  dangerButtonText: {
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 13,
  },

  itemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  itemDone: {
    opacity: 0.62,
    backgroundColor: '#F3F4F6',
  },

  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  itemImage: {
    width: '100%',
    height: '100%',
  },

  itemInfo: {
    flex: 1,
    minWidth: 0,
  },

  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  itemName: {
    flex: 1,
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  itemNameDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },

  ownerBadge: {
    maxWidth: 84,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },

  ownerBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },

  itemQuantity: {
    marginTop: 4,
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },

  itemSource: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkDone: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  supermarketModal: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    maxHeight: '82%',
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  supermarketList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 10,
  },

  marketRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  marketIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  marketInfo: {
    flex: 1,
  },

  marketName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  marketSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
  },

  modalFooter: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  modalGrabButton: {
    height: 50,
    borderRadius: 20,
    backgroundColor: '#12A150',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  modalGrabButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },


  nearbyMapCard: {
    height: 280,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },

  nearbyMap: {
    width: '100%',
    height: '100%',
  },

  nearbyMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },

  nearbyMapPlaceholderTitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },

  marketRowSelected: {
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    backgroundColor: '#F0FDF4',
  },

  nearbyLoadingWrap: {
    minHeight: 180,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },

  nearbyLoadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },

  nearbyEmptyWrap: {
    minHeight: 210,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },

  nearbyEmptyTitle: {
    marginTop: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  nearbyEmptySubtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },

  nearbyRetryButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  nearbyRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  marketMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },

  marketMetaPill: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  marketMetaText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },

  marketOpenPill: {
    backgroundColor: '#DCFCE7',
  },

  marketClosedPill: {
    backgroundColor: '#FEE2E2',
  },

  marketOpenText: {
    color: '#15803D',
  },

  marketClosedText: {
    color: '#DC2626',
  },

  marketActionRow: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 8,
  },

  marketMapsButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  marketMapsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  marketGrabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 15,
    backgroundColor: '#EAF7F0',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  marketGrabButtonText: {
    color: '#12A150',
    fontSize: 12,
    fontWeight: '900',
  },

  marketCalloutCard: {
    width: 220,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  marketCalloutTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  marketCalloutAddress: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },

  marketCalloutButton: {
    marginTop: 9,
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  marketCalloutButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
