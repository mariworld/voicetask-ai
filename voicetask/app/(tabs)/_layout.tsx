import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';

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
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="in-progress"
        options={{
          title: 'In Progress',
          tabBarIcon: ({ color }) => <Ionicons name="hourglass-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="done"
        options={{
          title: 'Done',
          tabBarIcon: ({ color }) => <Ionicons name="checkmark-done-circle-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
};

// Explicitly export the component as default
export default TabLayout;
