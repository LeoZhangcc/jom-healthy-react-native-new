import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useChildProfile } from './ChildProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PhysicalActivityContextType {
  todayTotal: number;
  todayCalories: number; 
  dailyGoal: number;
  logActivity: (mins: number, calories: number) => Promise<void>; 
  updateGoal: (newGoal: number) => Promise<void>;
  clearActivity: () => Promise<void>; 
}

const PhysicalActivityContext = createContext<PhysicalActivityContextType | undefined>(undefined);

export const PhysicalActivityProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeChild } = useChildProfile();
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0); 
  const [dailyGoal, setDailyGoal] = useState(60);

  // 根据当前活跃儿童的 ID 动态生成专属的本地缓存键名
  const storageKey = activeChild ? `@activity_data_${activeChild.id}` : null;
  const caloriesKey = activeChild ? `@calories_data_${activeChild.id}` : null; 
  const dateKey = activeChild ? `@last_log_date_${activeChild.id}` : null;
  const goalKey = activeChild ? `@daily_goal_${activeChild.id}` : null;

  // 提取核心的数据读取与日期校验逻辑，方便多处复用
  const loadAndCheckDateData = useCallback(async () => {
    if (!storageKey || !dateKey || !goalKey || !caloriesKey) return;

    try {
      const savedData = await AsyncStorage.getItem(storageKey);
      const savedCalories = await AsyncStorage.getItem(caloriesKey); 
      const savedGoal = await AsyncStorage.getItem(goalKey);
      const lastDate = await AsyncStorage.getItem(dateKey);
      
      const today = new Date().toDateString();

      // 判断上次记录的日期戳是否为今天
      if (lastDate === today) {
        if (savedData !== null) setTodayTotal(JSON.parse(savedData));
        if (savedCalories !== null) setTodayCalories(JSON.parse(savedCalories));
      } else {
        // 如果系统日期已发生变更（跨天），或无历史记录，则执行清零机制
        setTodayTotal(0);
        setTodayCalories(0);
      }

      // 初始化每日运动目标
      if (savedGoal) {
        setDailyGoal(JSON.parse(savedGoal));
      } else {
        setDailyGoal(60); 
      }
    } catch (e) {
      console.error("加载运动历史数据失败:", e);
    }
  }, [storageKey, dateKey, goalKey, caloriesKey]);

  // 监听儿童档案切换或首次挂载
  useEffect(() => {
    loadAndCheckDateData();
  }, [activeChild, loadAndCheckDateData]); 

  // 监听手机应用生命周期（解决常驻后台跨夜唤醒无法自动清零的缺陷）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // 当应用从后台或者挂起状态重新切换回前台活跃状态时，强制执行一次日期复核
      if (nextAppState === 'active') {
        loadAndCheckDateData();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadAndCheckDateData]);

  // 累加并保存单日活动时长与卡路里消耗
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
      console.error("保存当日运动数据失败:", e);
    }
  };

  // 调整并持久化每日运动目标
  const updateGoal = async (newGoal: number) => {
    setDailyGoal(newGoal);
    if (goalKey) await AsyncStorage.setItem(goalKey, JSON.stringify(newGoal));
  };   

  // 一键手动清空今日运动数据（配合垃圾桶功能）
  const clearActivity = async () => {
    if (!storageKey || !caloriesKey) return;
    
    setTodayTotal(0);
    setTodayCalories(0);
    
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(0));
      await AsyncStorage.setItem(caloriesKey, JSON.stringify(0));
    } catch (e) {
      console.error("清空今日运动数据失败:", e);
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
  if (!context) throw new Error('useActivity 必须在 PhysicalActivityProvider 内部使用');
  return context;
};
