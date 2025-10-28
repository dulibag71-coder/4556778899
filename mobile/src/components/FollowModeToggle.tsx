import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface FollowModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const FollowModeToggle: React.FC<FollowModeToggleProps> = ({ enabled, onToggle }) => {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.title}>따라가기 모드</Text>
        <Text style={styles.subtitle}>차량 위치를 자동으로 추적합니다</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.light,
  },
});

export default FollowModeToggle;
