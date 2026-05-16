import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  TextInput,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "https://jom-healthy-react-native-new-1.onrender.com/ai/chat";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export default function FloatingAIChat() {
  const { language } = useLanguage();
  const pan = useRef(new Animated.ValueXY({ x: 300, y: 650 })).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const getText = (en: string, zh: string, ms: string) => {
    if (language === "zh") return zh;
    if (language === "ms") return ms;
    return en;
  };

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: getText(
        "Hello! I’m your AI Nutrition Companion 👋 Ask me about food, nutrition, meal planning, or healthy eating.",
        "你好！我是你的 AI 营养伙伴 👋 可以问我食物、营养、膳食计划或健康饮食的问题。",
        "Hai! Saya Rakan Nutrisi AI anda 👋 Tanya saya tentang makanan, nutrisi, pelan makanan atau pemakanan sihat."
      ),
    },
  ]);

  useEffect(() => {
    setChat((prev) => {
      if (prev.length !== 1 || prev[0].role !== "ai") return prev;

      return [
        {
          ...prev[0],
          text: getText(
            "Hello! I’m your AI Nutrition Companion 👋 Ask me about food, nutrition, meal planning, or healthy eating.",
            "你好！我是你的 AI 营养伙伴 👋 可以问我食物、营养、膳食计划或健康饮食的问题。",
            "Hai! Saya Rakan Nutrisi AI anda 👋 Tanya saya tentang makanan, nutrisi, pelan makanan atau pemakanan sihat."
          ),
        },
      ];
    });
  }, [language]);

  const lastPosition = useRef({ x: 300, y: 650 });

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chat, loading]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 ||
          Math.abs(gestureState.dy) > 10
        );
      },

      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastPosition.current.x,
          y: lastPosition.current.y,
        });

        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        {
          useNativeDriver: false,
        }
      ),

      onPanResponderRelease: () => {
        pan.flattenOffset();

        lastPosition.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
      },
    })
  ).current;

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    setChat((prev) => [
      ...prev,
      { role: "user", text: userMessage },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            data.reply ||
            getText(
              "Sorry, I couldn't generate a response.",
              "抱歉，我暂时无法生成回复。",
              "Maaf, saya tidak dapat menjana jawapan."
            ),
        },
      ]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: getText(
            "Unable to connect to AI assistant.",
            "无法连接到 AI 助手。",
            "Tidak dapat menyambung ke pembantu AI."
          ),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingButton,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setVisible(true)}
        >
          <Ionicons name="sparkles" size={28} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {getText('AI Nutrition Companion', 'AI 营养伙伴', 'Rakan Nutrisi AI')}
              </Text>

              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.chatArea}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {chat.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.message,
                    msg.role === "user"
                      ? styles.userMessage
                      : styles.aiMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              ))}

              {loading && (
                <View style={styles.aiMessage}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                </View>
              )}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={getText(
                  'Ask about nutrition...',
                  '询问营养问题...',
                  'Tanya tentang nutrisi...'
                )}
                placeholderTextColor="#999"
                style={styles.input}
                multiline
              />

              <TouchableOpacity
                onPress={sendMessage}
                disabled={loading}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={loading ? "#bbb" : "#4CAF50"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    zIndex: 999,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  chatArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  message: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 6,
    maxWidth: "80%",
  },

  userMessage: {
    backgroundColor: "#4CAF50",
    alignSelf: "flex-end",
  },

  aiMessage: {
    backgroundColor: "white",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },

  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: "#F8F8F8",
    fontSize: 15,
  },
});
