import React, { createContext, useState, useContext, useEffect } from 'react';
import { useChildProfile } from './ChildProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PhysicalActivityContextType {
  todayTotal: number;
  todayCalories: number; // 🌟 新增：全局记录今天的总卡路里
  dailyGoal: number;
  logActivity: (mins: number, calories: number) => Promise<void>; // 🌟 升级：同时记录时间和卡路里
  updateGoal: (newGoal: number) => Promise<void>;
  clearActivity: () => Promise<void>; // 🌟 新增：一键清空今日数据（配合垃圾桶功能）
}

const PhysicalActivityContext = createContext<PhysicalActivityContextType | undefined>(undefined);

export const PhysicalActivityProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeChild } = useChildProfile();
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0); // 🌟 新增状态
  const [dailyGoal, setDailyGoal] = useState(60);

  const storageKey = activeChild ? `@activity_data_${activeChild.id}` : null;
  const caloriesKey = activeChild ? `@calories_data_${activeChild.id}` : null; // 🌟 卡路里的专属钥匙
  const dateKey = activeChild ? `@last_log_date_${activeChild.id}` : null;
  const goalKey = activeChild ? `@daily_goal_${activeChild.id}` : null;

  // 1. 启动或切换孩子时，读取数据
  useEffect(() => {
    if (!storageKey || !dateKey || !goalKey || !caloriesKey) return;

    const loadPersistedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(storageKey);
        const savedCalories = await AsyncStorage.getItem(caloriesKey); // 🌟 读取卡路里
        const savedGoal = await AsyncStorage.getItem(goalKey);
        const lastDate = await AsyncStorage.getItem(dateKey);
        const today = new Date().toDateString();

        if (lastDate === today) {
          if (savedData !== null) setTodayTotal(JSON.parse(savedData));
          if (savedCalories !== null) setTodayCalories(JSON.parse(savedCalories));
        } else {
          // 如果是新的一天，或者新换了档案，全清零
          setTodayTotal(0);
          setTodayCalories(0);
        }

        if (savedGoal) {
          setDailyGoal(JSON.parse(savedGoal));
        } else {
          setDailyGoal(60); 
        }
      } catch (e) {
        console.error("Failed to load activity", e);
      }
    };

    loadPersistedData();
  }, [activeChild]); 

  // 🌟 升级版打卡方法：同时接收分钟和卡路里
  const logActivity = async (mins: number, calories: number) => {
    if (!storageKey || !caloriesKey || !dateKey) return;

    const newTotal = todayTotal + mins;
    const newCalories = todayCalories + calories;
    
    setTodayTotal(newTotal);
    setTodayCalories(newCalories);

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newTotal));
      await AsyncStorage.setItem(caloriesKey, JSON.stringify(newCalories));
      await AsyncStorage.setItem(dateKey, new Date().toDateString());
    } catch (e) {
      console.error("Failed to save activity", e);
    }
  };

  const updateGoal = async (newGoal: number) => {
    setDailyGoal(newGoal);
    if (goalKey) await AsyncStorage.setItem(goalKey, JSON.stringify(newGoal));
  };  

  // 🌟 一键清空今日数据（配合你的 LeanKit AC 11.1.3）
  const clearActivity = async () => {
    if (!storageKey || !caloriesKey) return;
    
    setTodayTotal(0);
    setTodayCalories(0);
    
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(0));
      await AsyncStorage.setItem(caloriesKey, JSON.stringify(0));
    } catch (e) {
      console.error("Failed to clear activity", e);
    }
  };

  return (
    <PhysicalActivityContext.Provider value={{ todayTotal, todayCalories, dailyGoal, logActivity, updateGoal, clearActivity }}>
      {children}
    </PhysicalActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(PhysicalActivityContext);
  if (!context) throw new Error('useActivity must be used within PhysicalActivityProvider');
  return context;
};