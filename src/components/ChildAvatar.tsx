import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

export type BuiltInChildAvatarOption = {
  id: string;
  source: ImageSourcePropType;
};

export const CHILD_AVATAR_OPTIONS: BuiltInChildAvatarOption[] = [
  { id: 'kid-avatar-01', source: require('../assets/avatars/kid-avatar-01.png') },
  { id: 'kid-avatar-02', source: require('../assets/avatars/kid-avatar-02.png') },
  { id: 'kid-avatar-03', source: require('../assets/avatars/kid-avatar-03.png') },
  { id: 'kid-avatar-04', source: require('../assets/avatars/kid-avatar-04.png') },
  { id: 'kid-avatar-05', source: require('../assets/avatars/kid-avatar-05.png') },
  { id: 'kid-avatar-06', source: require('../assets/avatars/kid-avatar-06.png') },
  { id: 'kid-avatar-07', source: require('../assets/avatars/kid-avatar-07.png') },
  { id: 'kid-avatar-08', source: require('../assets/avatars/kid-avatar-08.png') },
  { id: 'kid-avatar-09', source: require('../assets/avatars/kid-avatar-09.png') },
  { id: 'kid-avatar-10', source: require('../assets/avatars/kid-avatar-10.png') },
  { id: 'kid-avatar-11', source: require('../assets/avatars/kid-avatar-11.png') },
  { id: 'kid-avatar-12', source: require('../assets/avatars/kid-avatar-12.png') },
  { id: 'kid-avatar-13', source: require('../assets/avatars/kid-avatar-13.png') },
  { id: 'kid-avatar-14', source: require('../assets/avatars/kid-avatar-14.png') },
  { id: 'kid-avatar-15', source: require('../assets/avatars/kid-avatar-15.png') },
  { id: 'kid-avatar-16', source: require('../assets/avatars/kid-avatar-16.png') },
];

const CHILD_AVATAR_SOURCE_BY_ID = CHILD_AVATAR_OPTIONS.reduce<Record<string, ImageSourcePropType>>(
  (acc, option) => {
    acc[option.id] = option.source;
    return acc;
  },
  {}
);

export function isBuiltInChildAvatar(avatar?: string | null) {
  return Boolean(avatar && CHILD_AVATAR_SOURCE_BY_ID[avatar]);
}

type ChildAvatarProps = {
  avatar: string;
  avatarImageUri?: string;
  size?: number;
  style?: StyleProp<ImageStyle | ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function ChildAvatar({
  avatar,
  avatarImageUri,
  size = 44,
  style,
  textStyle,
}: ChildAvatarProps) {
  if (avatarImageUri) {
    return (
      <Image
        source={{ uri: avatarImageUri }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style as StyleProp<ImageStyle>,
        ]}
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  const builtInSource = CHILD_AVATAR_SOURCE_BY_ID[avatar];

  if (builtInSource) {
    return (
      <Image
        source={builtInSource}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style as StyleProp<ImageStyle>,
        ]}
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <Text
        style={[
          styles.emoji,
          {
            fontSize: Math.round(size * 0.52),
          },
          textStyle,
        ]}
      >
        {avatar || '👶'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.bg,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  emoji: {
    textAlign: 'center',
  },
});
