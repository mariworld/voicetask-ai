import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, SplashScreen, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState, useRef } from 'react';
import { authService } from '../services/api';
import { View, ActivityIndicator, Text } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a named React component as an arrow function
const RootLayout = () => {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Log font status immediately
  console.log('RootLayout: Initial font status - fontsLoaded:', fontsLoaded, 'fontError:', fontError);

  const [appState, setAppState] = useState('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('RootLayout: Font effect triggered - fontsLoaded:', fontsLoaded, 'fontError:', fontError);
    if (fontsLoaded || fontError) {
      // If fonts are loaded or there was an error, proceed with app initialization
      initializeApp();
    }
    return () => {
      // isMounted.current = false; // Moved cleanup to initializeApp
    };
  }, [fontsLoaded, fontError]); // This effect depends only on font status

  const initializeApp = async () => {
    if (!isMounted.current) return;
    try {
      console.log('RootLayout: Initializing app (core logic)... AppState:', appState);
      // This function should now only run once fonts are deemed ready by the effect above
      
      // If already beyond loading (e.g. checkingAuth or ready), don't re-init core logic if font state somehow re-triggers 
      if(appState !== 'loading') {
        console.log('RootLayout: Core initialization already in progress or done. Current appState:', appState);
        // We might still need to hide splash if fonts just loaded *after* auth check started/finished
        if (appState === 'ready') {
          console.log('RootLayout: Hiding splash screen because fonts loaded late but app was ready.');
          await SplashScreen.hideAsync();
        }
        return;
      }

      setAppState('checkingAuth');
      if (!isMounted.current) return;

      const loggedIn = await authService.isLoggedIn();
      if (!isMounted.current) return;

      console.log('RootLayout: Auth status - loggedIn:', loggedIn);
      setIsAuthenticated(loggedIn);
      setAppState('ready');
      console.log('RootLayout: App state is ready. Hiding splash screen.');
      await SplashScreen.hideAsync();

    } catch (e) {
      console.warn('RootLayout: Error during app initialization (core logic)', e);
      if (isMounted.current) {
        setIsAuthenticated(false);
        setAppState('ready');
        await SplashScreen.hideAsync();
      }
    }
  };
  
  useEffect(() => {
    // Cleanup ref when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle navigation once app state is 'ready'
  useEffect(() => {
    console.log('RootLayout: Navigation effect triggered - appState:', appState, 'isAuthenticated:', isAuthenticated);
    if (appState === 'ready') {
      if (isAuthenticated) {
        console.log('RootLayout: Authenticated, navigating to (tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('RootLayout: Not authenticated, navigating to /auth');
        router.replace('/auth');
      }
    }
  }, [appState, isAuthenticated]);

  // Render logic based on states
  if (!fontsLoaded && !fontError) {
    console.log('RootLayout: Render - Waiting for fonts (fontsLoaded=false, fontError=false/null).');
    // Splash screen is visible, return null or a minimal loader if you prefer
    return null; 
  }

  if (fontError) {
    console.error('RootLayout: Render - Font loading error:', fontError);
    // Optionally hide splash and show an error message to the user
    // SplashScreen.hideAsync(); // Consider if you want to hide splash on font error
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading fonts. Please restart the app.</Text>
      </View>
    );
  }
  
  // If fonts are loaded, but app is not yet 'ready' (still loading or checkingAuth)
  if (appState === 'loading' || appState === 'checkingAuth') {
    console.log('RootLayout: Render - Fonts loaded, appState:', appState, '(Splash should be visible)');
    return null; // Splash screen is still visible
  }

  // At this point, appState should be 'ready'. Navigation effect will handle redirection.
  // The Stack here acts as a container for the router to replace its content.
  console.log('RootLayout: Render - App ready, navigation effect should take over. isAuthenticated:', isAuthenticated);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Define all possible top-level routes. Navigation effect will pick one. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="task-detail" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

// Explicitly export the component as default
export default RootLayout;
