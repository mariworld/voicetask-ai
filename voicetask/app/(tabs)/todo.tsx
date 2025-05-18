import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
// Importing the deprecated expo-av, but with a comment for future migration
// TODO: Migrate to expo-audio when SDK 54 is released
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { apiService } from '@/services/api';
import { Swipeable } from 'react-native-gesture-handler';
import { useTaskStore, Task as TaskType } from '@/services/taskStore';

export default function TodoScreen() {
  // Replace expo-audio hooks with direct expo-av usage
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  
  // Get tasks and actions from the task store
  const allTasks = useTaskStore(state => state.tasks);
  const todoTasks = useMemo(() => {
    return allTasks.filter(task => task.status === 'todo');
  }, [allTasks]);
  
  // Get store actions once to avoid re-renders
  const { deleteTask, updateTaskStatus, toggleTaskCompletion, addTask } = useTaskStore.getState();
  
  // Add new state for API integration
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isProcessingTasks, setIsProcessingTasks] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const buttonColorAnim = useRef(new Animated.Value(0)).current; // 0 = blue, 1 = red
  const recordingIndicatorAnim = useRef(new Animated.Value(1)).current;

  // Keep track of open swipeable
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const openSwipeableId = useRef<string | null>(null);

  // Get current date
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateString = today.toLocaleDateString('en-US', options);

  // State for recording duration
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for microphone permissions
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  
  // Add this state to track button press
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
  // Add debug logs state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Add debug logging function
  const addDebugLog = (message: string) => {
    setDebugLogs(prev => {
      const timestamp = new Date().toISOString().substring(11, 19);
      return [`${timestamp} ${message}`, ...prev.slice(0, 9)]; // Keep last 10 logs
    });
  };

  // Request permission on component mount
  useEffect(() => {
    async function setupMicrophone() {
      try {
        addDebugLog('🎤 Requesting microphone permissions');
        console.log('Requesting microphone permission...');
        
        const { status } = await Audio.requestPermissionsAsync();
        const granted = status === 'granted';
        
        setHasMicPermission(granted);
        addDebugLog(`🎤 Microphone permission: ${granted ? 'GRANTED' : 'DENIED'}`);
        console.log('Microphone permission granted:', granted);
        
        if (granted) {
          try {
            // Set audio mode for recording with numeric values for all properties
            // to ensure cross-platform compatibility
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              interruptionModeIOS: 1,  // Use numeric value 1 = INTERRUPTION_MODE_IOS_DO_NOT_MIX
              interruptionModeAndroid: 1,  // Use numeric value 1 = INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false
            });
            addDebugLog('🎤 Audio mode set for recording');
          } catch (err) {
            // Handle audio mode error separately to continue
            const errorMsg = err instanceof Error ? err.message : String(err);
            addDebugLog(`⚠️ Audio mode error: ${errorMsg}`);
            console.warn('Audio mode error:', err);
            
            // Try alternative approach with only essential settings
            try {
              addDebugLog('🎤 Trying minimal audio mode settings');
              await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                interruptionModeIOS: 1,
                interruptionModeAndroid: 1
              });
              addDebugLog('🎤 Minimal audio mode set successfully');
            } catch (fallbackErr) {
              // Log but continue anyway since we have permission
              addDebugLog(`⚠️ Fallback audio mode error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
            }
          }
        } else {
          Alert.alert(
            'Microphone Permission Required',
            'This app needs access to your microphone to record tasks.',
            [
              { text: 'OK', onPress: () => console.log('OK Pressed') }
            ]
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addDebugLog(`❌ Error: ${errorMessage}`);
        console.error('Error requesting microphone permission:', error);
        setHasMicPermission(false);
      }
    }
    
    setupMicrophone();
  }, []);

  // Start animation when recording
  useEffect(() => {
    if (isRecording) {
      // Create pulse animation with faster, more noticeable effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25, // More pronounced scaling
            duration: 600, // Faster animation
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease), // Smoother animation
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          })
        ])
      ).start();
    } else {
      // Stop animation
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true
      }).stop();
    }
  }, [isRecording, pulseAnim]);

  // Flash animation when recording state changes
  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate button color change - FIXED - changed to use a separate animated value
  // that doesn't conflict with the native driver animations
  useEffect(() => {
    // Create separate non-native animation for button color
    Animated.timing(buttonColorAnim, {
      toValue: isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: false // color animations can't use native driver
    }).start();
  }, [isRecording, buttonColorAnim]);

  // Add an effect to monitor audio recorder state
  useEffect(() => {
    // Log any changes to the recorder state
    addDebugLog(`🎙️ Recording state changed: ${isRecording ? 'RECORDING' : 'NOT RECORDING'}`);
    
    console.log('Recording state changed:', {
      isRecording: isRecording,
      uri: audioUri
    });
  }, [isRecording]);

  // Add cleanup for audio recorder and timers
  useEffect(() => {
    // This effect handles cleanup when component unmounts
    return () => {
      console.log('🧹 Cleaning up audio resources');
      addDebugLog('🧹 Cleaning up audio resources');
      
      // Clear any ongoing timers
      if (recordingTimerRef.current) {
        console.log('🧹 Clearing recording timer');
        clearInterval(recordingTimerRef.current);
      }
      
      // Stop recording if active
      if (recording) {
        console.log('🧹 Stopping active recording during cleanup');
        try {
          recording.stopAndUnloadAsync();
        } catch (err) {
          console.error('Error stopping recording during cleanup:', err);
        }
      }
      
      // Stop playback if active
      if (sound) {
        console.log('🧹 Stopping audio playback during cleanup');
        try {
          sound.stopAsync();
          sound.unloadAsync();
        } catch (err) {
          console.error('Error stopping playback during cleanup:', err);
        }
      }
    };
  }, []);

  // Interpolate colors for the button
  const buttonBackgroundColor = buttonColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4285F4', '#E74C3C']
  });

  // Animate recording indicator
  useEffect(() => {
    if (isRecording) {
      // Create pulse animation for recording indicator dot
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingIndicatorAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(recordingIndicatorAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      // Stop animation
      recordingIndicatorAnim.setValue(1);
      Animated.timing(recordingIndicatorAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true
      }).stop();
    }
  }, [isRecording, recordingIndicatorAnim]);

  // Create a separate non-animated value for button pressed state
  const [recordButtonStyle, setRecordButtonStyle] = useState({});
  
  // Update button style based on recording state without using animations
  useEffect(() => {
    setRecordButtonStyle({
      backgroundColor: isRecording ? '#E74C3C' : '#4285F4'
    });
  }, [isRecording]);

  // Start recording function
  async function startRecording() {
    try {
      addDebugLog('⏺️ START RECORDING FUNCTION CALLED');
      
      console.log('⏺️ START RECORDING BUTTON PRESSED');
      console.log('Current recording state:', { 
        isRecording,
        uri: audioUri
      });

      // Add visual feedback immediately to show the button was pressed
      setIsButtonPressed(true);
      setTimeout(() => setIsButtonPressed(false), 300);
      
      // Trigger haptic feedback immediately for button press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check permission first
      if (!hasMicPermission) {
        addDebugLog('🎤 No microphone permission, requesting...');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          addDebugLog('🎤 Microphone permission denied');
          Alert.alert('Permission Denied', 'Microphone access is required for recording.');
          return;
        }
        addDebugLog('🎤 Microphone permission granted');
        setHasMicPermission(true);
      }

      // Clear previous transcription and reset duration
      setTranscription(null);
      setRecordingDuration(0);
      
      // Setup timer for duration tracking
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      // Use local variable to track duration to avoid React's stale closure issue in setInterval
      let durationCounter = 0;
      
      recordingTimerRef.current = setInterval(() => {
        durationCounter += 1;
        setRecordingDuration(durationCounter);
        
        // Log every 5 seconds to confirm recording is still active
        if (durationCounter % 5 === 0) {
          console.log(`⏺️ Still recording... ${durationCounter} seconds elapsed`);
          addDebugLog(`⏺️ Still recording... ${durationCounter}s`);
        }
      }, 1000) as unknown as NodeJS.Timeout;
      
      // Make sure recording is properly initialized
      if (!isRecording) {
        try {
          addDebugLog('⏺️ Creating new recording object');
          console.log('⏺️ Creating new recording object');
          
          // Attempt to initiate recording state early to update UI
          setIsRecording(true);
          
          // Unload any existing recorder to avoid conflicts
          if (recording) {
            addDebugLog('⏺️ Unloading previous recording');
            try {
              await recording.stopAndUnloadAsync();
            } catch (stopError) {
              // Just log and continue if there's an error stopping
              addDebugLog(`⚠️ Error stopping previous recording: ${stopError instanceof Error ? stopError.message : String(stopError)}`);
            }
            setRecording(null);
          }
          
          // Create a new recording object with explicit options
          const recordingOptions = {
            android: {
              extension: '.wav',
              outputFormat: 1, // THREE_GPP becomes VORBIS/WEBM/MATROSKA
              audioEncoder: 3, // AAC
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
            },
            ios: {
              extension: '.wav',
              audioQuality: 0x02, // medium quality (AVAudioQuality.medium)
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
              outputFormat: 1, // Linear PCM - use numeric value instead of constant
            },
            web: {
              mimeType: 'audio/webm',
              bitsPerSecond: 128000,
            },
          };
          
          // Create a new recording with explicit options
          try {
            addDebugLog('⏺️ Creating recording with custom options');
            const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
            
            setRecording(newRecording);
            addDebugLog('⏺️ Recording started!');
            console.log('⏺️ Recording started!');
            
            // Visual feedback - animate the button
            triggerFlash();
            
            // Provide haptic feedback when recording actually starts
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Log that recording started successfully
            console.log('⏺️ Recording active');
          } catch (recErr) {
            // const recErrorMsg = recErr instanceof Error ? recErr.message : String(recErr);
            // addDebugLog(`❌ Recording creation error: ${recErrorMsg}`); // Removed this log
            // console.error('❌ Failed to create recording', recErr);    // Removed this log
            
            // Try with preset options as fallback
            try {
              addDebugLog('⏺️ Trying with preset options as fallback');
              // Use lower quality preset but with WAV format for better compatibility
              const { recording: newRecording } = await Audio.Recording.createAsync({
                ...Audio.RecordingOptionsPresets.LOW_QUALITY,
                android: {
                  ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
                  extension: '.wav',
                  outputFormat: 1,  // THREE_GPP becomes VORBIS/WEBM/MATROSKA
                },
                ios: {
                  ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
                  extension: '.wav',
                  outputFormat: 1,  // Linear PCM - use numeric value instead of constant
                }
              });
              
              setRecording(newRecording);
              addDebugLog('⏺️ Recording started with preset options!');
              
              // Visual and haptic feedback
              triggerFlash();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
            } catch (fallbackErr) {
              const fallbackErrorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
              addDebugLog(`❌ Fallback recording error: ${fallbackErrorMsg}`);
              
              // Last resort - simplest possible recording
              try {
                addDebugLog('⏺️ Trying simplest possible recording as last resort');
                // Create a new recording with minimal options - use Audio.RecordingOptionsPresets.LOW_QUALITY as a safe fallback
                const { recording: basicRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
                
                setRecording(basicRecording);
                addDebugLog('⏺️ Recording started with minimal options!');
                
                // Visual and haptic feedback
                triggerFlash();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
              } catch (lastErr) {
                const lastErrorMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
                addDebugLog(`❌ Last resort recording error: ${lastErrorMsg}`);
                
                // Reset recording state since all attempts failed
                setIsRecording(false);
                throw lastErr; // Re-throw to be caught by outer catch
              }
            }
          }
        } catch (err) {
          // Reset recording state if any error occurs
          setIsRecording(false);
          const errorMessage = err instanceof Error ? err.message : String(err);
          addDebugLog(`❌ Error: ${errorMessage}`);
          console.error('❌ Failed to start recording', err);
          Alert.alert('Error', 'Failed to start recording: ' + errorMessage);
        }
      } else {
        addDebugLog('⏺️ Recording already active');
        console.log('⏺️ Recording already active');
      }
    } catch (err) {
      // Ensure recording state is reset on any error
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDebugLog(`❌ Error: ${errorMessage}`);
      console.error('❌ Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + errorMessage);
    }
  }

  // Stop recording function
  async function stopRecording() {
    try {
      addDebugLog('⏹️ STOP RECORDING FUNCTION CALLED');
      
      console.log('⏹️ STOP RECORDING BUTTON PRESSED');
      console.log('Current recorder state before stopping:', { 
        isRecording: isRecording,
        recording: recording ? 'active' : 'null',
        uri: audioUri
      });

      // Add immediate visual feedback that button was pressed
      setIsButtonPressed(true);
      setTimeout(() => setIsButtonPressed(false), 300);
      
      // Provide immediate haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Clear duration timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Set recording state to false early for UI feedback
      setIsRecording(false);
      
      if (recording) {
        addDebugLog('⏹️ Stopping recording...');
        console.log('⏹️ Stopping recording...');
        
        // Using a timeout to ensure we don't get stuck if stopAndUnloadAsync hangs
        const stopPromise = recording.stopAndUnloadAsync();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stopping recording timed out')), 3000)
        );
        
        try {
          // Race the stopAndUnloadAsync against a timeout
          await Promise.race([stopPromise, timeoutPromise]);
          const uri = recording.getURI();
          
          console.log('⏹️ Recording stopped. URI:', uri);
          addDebugLog(`⏹️ Recording stopped. URI: ${uri || 'none'}`);
          
          setRecording(null);
          setAudioUri(uri || null);
          
          // Visual feedback
          triggerFlash();
          
          // Provide haptic feedback when recording stops successfully
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          if (uri) {
            // Transcribe the audio
            addDebugLog('⏹️ Starting transcription...');
            console.log('⏹️ Starting audio transcription');
            transcribeAudio(uri);
          } else {
            addDebugLog('⚠️ No audio file was created');
            console.warn('⚠️ No URI returned after recording stopped');
            Alert.alert('Warning', 'The recording completed but no audio file was created. Please try again.');
          }
        } catch (stopError) {
          const stopErrorMsg = stopError instanceof Error ? stopError.message : String(stopError);
          addDebugLog(`❌ Error stopping recording: ${stopErrorMsg}`);
          console.error('❌ Error stopping recording:', stopError);
          
          // Try an alternative approach to get the recording file
          try {
            addDebugLog('⏹️ Trying alternative method to get recording file');
            
            // Some devices might still have created a file even if stopping failed
            const uri = recording.getURI();
            if (uri) {
              addDebugLog(`⏹️ Found recording URI through fallback: ${uri}`);
              setAudioUri(uri);
              
              // Provide feedback
              triggerFlash();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Attempt transcription
              transcribeAudio(uri);
            } else {
              throw new Error('No URI available from recording');
            }
          } catch (fallbackError) {
            addDebugLog(`❌ Fallback method failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            Alert.alert('Error', 'Failed to save recording. Please try again.');
          } finally {
            // Clean up recording object regardless
            setRecording(null);
          }
        }
      } else {
        addDebugLog('⏹️ No active recording to stop');
        console.log('⏹️ No active recording to stop');
        
        // We set isRecording false but had no recording object - report this inconsistency
        addDebugLog('⚠️ Recording state inconsistency detected (isRecording=true but no recording object)');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDebugLog(`❌ Error: ${errorMessage}`);
      console.error('❌ Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording: ' + errorMessage);
      
      // Reset state to a clean slate
      setIsRecording(false);
      setRecording(null);
    }
  }

  // Format seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Transcribe audio using API
  async function transcribeAudio(uri: string) {
    try {
      console.log('🔤 Starting transcription for URI:', uri);
      addDebugLog('🔤 Starting transcription');
      setIsTranscribing(true);
      
      // Log audio file details before sending to API
      console.log('🔤 Sending audio file to transcription API');
      
      const result = await apiService.transcribeAudio(uri);
      console.log('🔤 Transcription result received:', result);
      addDebugLog('🔤 Transcription received');
      
      setTranscription(result);
      
      // After transcription, extract tasks
      if (result) {
        console.log('🔤 Transcription successful, extracting tasks');
        addDebugLog('🔤 Extracting tasks');
        extractTasks(result);
      } else {
        console.log('🔤 Transcription returned empty result');
        addDebugLog('🔤 Empty transcription result');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog(`❌ Transcription error: ${errorMessage}`);
      console.error('❌ Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
      console.log('🔤 Transcription process completed');
      addDebugLog('🔤 Transcription process completed');
    }
  }
  
  // Play sound function
  async function playSound() {
    if (!audioUri) return;
    
    try {
      addDebugLog('🔊 Loading audio for playback');
      
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri }
      );
      
      setSound(newSound);
      
      addDebugLog('🔊 Playing audio');
      await newSound.playAsync();
      setIsPlaying(true);
      
      // Listen for playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            addDebugLog('🔊 Playback finished');
          }
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDebugLog(`❌ Playback error: ${errorMessage}`);
      console.error('Failed to play sound', err);
      Alert.alert('Error', 'Failed to play recording');
    }
  }

  // Pause sound function
  async function pauseSound() {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        addDebugLog('🔊 Playback paused');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDebugLog(`❌ Pause error: ${errorMessage}`);
      console.error('Failed to pause sound', err);
    }
  }
  
  // Extract tasks from transcription
  async function extractTasks(text: string) {
    try {
      setIsProcessingTasks(true);
      const extractedTasks = await apiService.extractTasks(text);
      
      if (extractedTasks && extractedTasks.length > 0) {
        // Use the task store to add tasks
        const newTasks = extractedTasks.map((task: any, index: number) => ({
          id: `new-${Date.now()}-${index}`,
          title: task.title,
          completed: task.status === 'Done',
          status: task.status === 'Done' ? 'done' : 'todo'
        }));
        
        // Use the pre-fetched addTask function to avoid re-renders
        newTasks.forEach((task: TaskType) => {
          addTask(task);
        });
        
        Alert.alert('Success', `Added ${newTasks.length} new task(s) from your voice recording`);
      } else {
        Alert.alert('No tasks found', 'No tasks were detected in your voice recording');
      }
    } catch (error) {
      console.error('Task extraction error:', error);
      Alert.alert('Error', 'Failed to extract tasks from transcription');
    } finally {
      setIsProcessingTasks(false);
    }
  }

  // Handle swipeable open
  const handleSwipeableOpen = (id: string) => {
    // If there's already an open swipeable and it's different from this one, close it
    if (openSwipeableId.current && openSwipeableId.current !== id && 
        swipeableRefs.current.has(openSwipeableId.current)) {
      const swipeable = swipeableRefs.current.get(openSwipeableId.current);
      swipeable?.close();
    }
    
    // Set this as the open swipeable
    openSwipeableId.current = id;
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render right actions (delete button)
  const renderRightActions = (id: string) => {
    return (
      <View style={styles.deleteContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => {
            deleteTask(id);
            // Provide haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Ionicons name="trash" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render left actions (status options)
  const renderLeftActions = (id: string) => {
    return (
      <View style={styles.statusActionsContainer}>
        {/* Already in ToDo tab, so only show other options */}
        <TouchableOpacity 
          style={[styles.statusButton, styles.inProgressButton]}
          onPress={() => updateTaskStatus(id, 'in-progress')}
        >
          <Ionicons name="hourglass-outline" size={22} color="white" />
          <Text style={styles.statusButtonText}>In Progress</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statusButton, styles.doneButton]}
          onPress={() => updateTaskStatus(id, 'done')}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="white" />
          <Text style={styles.statusButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Update handleMicButtonPress
  const handleMicButtonPress = () => {
    addDebugLog('🎤 Microphone button pressed');
    
    console.log('🎤 Microphone button pressed');
    console.log('Current audio recorder state:', {
      isRecording: isRecording,
      uri: audioUri
    });
    
    if (isRecording) {
      addDebugLog('🎤 Stopping recording...');
      stopRecording();
    } else {
      addDebugLog('🎤 Starting recording...');
      startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Hey Mari, today is {dateString}</ThemedText>
      </View>

   
      {/* Flash overlay for visual feedback */}
      <Animated.View 
        style={[
          styles.flashOverlay,
          { opacity: flashAnim }
        ]} 
      />

      {/* Voice Recording Button */}
      <View style={styles.recordingContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.5}
            style={[
              styles.recordButton,
              hasMicPermission === false ? styles.recordButtonDisabled : null,
              isButtonPressed ? styles.recordButtonPressed : null,
              recordButtonStyle // Use non-animated style instead of buttonBackgroundColor
            ]}
            onPress={handleMicButtonPress}
            onPressIn={() => {
              console.log('🎤 Button press detected (onPressIn)');
              setIsButtonPressed(true);
              // Add immediate haptic feedback on press
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              console.log('🎤 Button press released (onPressOut)');
              setIsButtonPressed(false);
            }}
            disabled={hasMicPermission === false || isTranscribing}
          >
            {isTranscribing || isProcessingTasks ? (
              <ActivityIndicator size="large" color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons
                  name={isRecording ? "mic-off" : "mic"}
                  size={40}
                  color="white"
                  style={styles.micIcon}
                />
                <Text style={styles.buttonIconText}>
                  {isRecording ? "STOP" : "REC"}
                </Text>
                {isRecording && (
                  <Animated.View 
                    style={[
                      styles.recordingIndicator,
                      { opacity: recordingIndicatorAnim }
                    ]} 
                  />
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        
        {/* Permission message when denied */}
        {hasMicPermission === false && (
          <Text style={styles.errorText}>
            Microphone access denied. Please enable in settings.
          </Text>
        )}
        
        {/* Recording status text */}
        {isRecording && (
          <View style={styles.recordingStatusContainer}>
            <Text style={styles.recordingText}>● RECORDING</Text>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </View>
        )}
        
        {/* Ready to record indicator when not recording */}
        {!isRecording && !isTranscribing && !isProcessingTasks && (
          <View style={styles.recordingStatusContainer}>
            <Text style={styles.readyText}>Tap microphone to record</Text>
          </View>
        )}
        
        {/* Status indicator */}
        {isTranscribing && (
          <Text style={styles.statusText}>Transcribing your voice...</Text>
        )}
        {isProcessingTasks && (
          <Text style={styles.statusText}>Extracting tasks...</Text>
        )}
      </View>

      {/* Empty state for when there are no tasks */}
      {todoTasks.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="list" size={50} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No tasks to do</Text>
          <Text style={styles.emptyStateSubText}>Record a task or swipe to move tasks here</Text>
        </View>
      )}

      {/* Task List */}
      {todoTasks.length > 0 && (
        <ScrollView 
          style={styles.tasksContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {todoTasks.map((task: TaskType) => (
            <Swipeable
              key={task.id}
              ref={(ref) => {
                swipeableRefs.current.set(task.id, ref);
              }}
              renderRightActions={() => renderRightActions(task.id)}
              renderLeftActions={() => renderLeftActions(task.id)}
              onSwipeableOpen={(direction) => handleSwipeableOpen(task.id)}
              overshootLeft={false}
              overshootRight={false}
            >
              <View style={styles.taskItem}>
                <TouchableOpacity
                  style={styles.taskCheckbox}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  {task.completed ? (
                    <Ionicons name="checkmark-circle" size={24} color="green" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="gray" />
                  )}
                </TouchableOpacity>
                <Text style={[styles.taskTitle, task.completed && styles.completedTask]}>
                  {task.title}
                </Text>
                
                <TouchableOpacity style={styles.calendarButton}>
                  <Ionicons name="calendar-outline" size={24} color="gray" />
                  <Text style={styles.calendarText}>Calendar</Text>
                </TouchableOpacity>
              </View>
            </Swipeable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  recordingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  recordButton: {
    width: 90,
    height: 90, 
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 5, // For Android
  },
  recordingStatusContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  recordingText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 14,
    color: '#E74C3C',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  readyText: {
    fontSize: 14,
    color: '#4285F4',
    marginTop: 10,

  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  transcriptionContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  transcriptionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
    color: '#333',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 10,
  },
  playPauseButton: {
    marginRight: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
  },
  progress: {
    width: '30%',
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 2,
  },
  duration: {
    marginLeft: 10,
    fontSize: 12,
    color: '#666',
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    backgroundColor: 'white', // Ensure background is set for the swipeable
  },
  taskCheckbox: {
    marginRight: 15,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#AAAAAA',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  calendarText: {
    fontSize: 12,
    marginLeft: 5,
    color: '#666',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E74C3C',
    zIndex: 999,
  },
  micIcon: {
    opacity: 1,
  },
  recordButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  recordButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: '#E74C3C',
    textAlign: 'center',
  },
  debugPanel: {
    margin: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 5,
    maxHeight: 200,
  },
  debugTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugStatusText: {
    color: 'white',
    fontSize: 12,
    marginRight: 10,
  },
  debugLog: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace',
    paddingVertical: 2,
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  debugButton: {
    backgroundColor: '#444',
    padding: 5,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugButtonDisabled: {
    backgroundColor: '#666',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    position: 'absolute',
    top: 5,
    right: 5,
  },
  // Status action buttons styles
  statusActionsContainer: {
    flexDirection: 'row',
    width: 170, // Reduced width for only 2 buttons
    height: '100%',
    alignItems: 'center',
  },
  statusButton: {
    height: '80%',
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
  },
  todoButton: {
    backgroundColor: '#4285F4',
  },
  inProgressButton: {
    backgroundColor: '#FBBC05',
  },
  doneButton: {
    backgroundColor: '#34A853',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  // Delete button styles
  deleteContainer: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '80%',
    borderRadius: 8,
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#888888',
    marginTop: 10,
    fontWeight: 'bold',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 