import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, Alert, ActivityIndicator, View, Text, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/api';
import { useTaskStore } from '@/services/taskStore';

// Create a named React component as an arrow function
const TabLayout = () => {
  const colorScheme = useColorScheme();
  const currentColors = Colors[colorScheme ?? 'light'];
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);
  const tasks = useTaskStore((state) => state.tasks);

  // Calculate task counts
  const todoCount = tasks.filter(t => t.status === 'To Do').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const doneCount = tasks.filter(t => t.status === 'Done').length;

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error Fetching Tasks',
        error,
        [
          { text: 'Retry', onPress: fetchTasks },
          { text: 'OK' }
        ]
      );
    }
  }, [error, fetchTasks]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentColors.background }}>
        <ActivityIndicator size="large" color={currentColors.tint} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: currentColors.tint,
        headerTintColor: currentColors.tint,
        headerStyle: {
          backgroundColor: currentColors.background,
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={28} color={currentColors.tint} style={{ marginBottom: -3 }} />
          </TouchableOpacity>
        ),
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="todo"
        options={{
          title: 'To Do',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="list" size={24} color={color} />
              {todoCount > 0 && (
                <View style={[styles.badge, { backgroundColor: focused ? currentColors.tint : '#E74C3C' }]}>
                  <Text style={styles.badgeText}>{todoCount > 99 ? '99+' : todoCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="in-progress"
        options={{
          title: 'In Progress',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="hourglass-outline" size={24} color={color} />
              {inProgressCount > 0 && (
                <View style={[styles.badge, { backgroundColor: focused ? currentColors.tint : '#FBBC05' }]}>
                  <Text style={styles.badgeText}>{inProgressCount > 99 ? '99+' : inProgressCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="done"
        options={{
          title: 'Done',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={24} color={color} />
              {doneCount > 0 && (
                <View style={[styles.badge, { backgroundColor: focused ? currentColors.tint : '#34A853' }]}>
                  <Text style={styles.badgeText}>{doneCount > 99 ? '99+' : doneCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
};

// Explicitly export the component as default
export default TabLayout;

const styles = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
