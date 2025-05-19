import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authService } from '../services/api';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill out all required fields');
      return;
    }

    if (!isLogin && !fullName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
        Alert.alert('Success', 'Logged in successfully');
      } else {
        await authService.register(email, password, fullName);
        await authService.login(email, password); // Auto-login after registration
        Alert.alert('Success', 'Registered and logged in successfully');
      }
      
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const currentColors = Colors[colorScheme ?? 'light'];
  const isDarkMode = colorScheme === 'dark';

  // Define dynamic styles based on theme
  const themedStyles = StyleSheet.create({
    input: {
      backgroundColor: isDarkMode ? '#2C2C2E' : '#f5f5f5', // Darker grey for dark mode input, light grey for light
      color: currentColors.text,
      borderRadius: 8,
      padding: Platform.OS === 'ios' ? 15 : 12, // Adjust padding for Android
      marginBottom: 16,
      fontSize: 16,
      borderWidth: isDarkMode ? 1 : 0, // Optional: add a border in dark mode
      borderColor: isDarkMode ? '#444' : 'transparent',
    },
    placeholderText: {
      color: isDarkMode ? '#8E8E93' : '#C7C7CD', // Adjusted placeholder colors for better contrast
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <Stack.Screen
        options={{
          title: isLogin ? 'Login' : 'Register',
          headerShown: false,
        }}
      />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentColors.tint }]}>VoiceTask AI</Text>
        <Text style={[styles.subtitle, { color: currentColors.text }]}>
          {isLogin ? 'Login to your account' : 'Create a new account'}
        </Text>
      </View>

      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            style={themedStyles.input}
            placeholder="Full Name"
            placeholderTextColor={themedStyles.placeholderText.color}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={themedStyles.input}
          placeholder="Email"
          placeholderTextColor={themedStyles.placeholderText.color}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={themedStyles.input}
          placeholder="Password"
          placeholderTextColor={themedStyles.placeholderText.color}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.tint }]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDarkMode ? currentColors.background : '#fff'} />
          ) : (
            <Text style={[styles.buttonText, {color: isDarkMode ? currentColors.background : '#fff'}]}>
              {isLogin ? 'Login' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={[styles.switchButtonText, { color: currentColors.tint }]}>
            {isLogin
              ? "Don't have an account? Register"
              : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
        
        {/* Testing only - Quick login with test credentials */}
        <TouchableOpacity
          style={[styles.testButton, {backgroundColor: isDarkMode ? '#2C2C2E' : '#f0f0f0'}]}
          onPress={async () => {
            setLoading(true);
            try {
              await authService.login('testuser@example.com', 'securepassword123');
              Alert.alert('Success', 'Logged in with test account');
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Test login error:', error);
              Alert.alert('Error', 'Test login failed. Make sure you\'ve registered this user first.');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={[styles.testButtonText, { color: currentColors.text }]}>
            Quick Login (Test User)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  form: {
    width: '100%',
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 16,
  },
  testButton: {
    marginTop: 30,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
  },
}); 