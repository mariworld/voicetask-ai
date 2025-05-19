import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTaskStore, Task as TaskType } from '@/services/taskStore';
import { useRouter } from 'expo-router';

export default function DoneScreen() {
  const router = useRouter();
  // Get tasks and actions from the task store
  const allTasks = useTaskStore(state => state.tasks);
  const doneTasks = useMemo(() => 
    allTasks.filter(task => task.status === 'Done'), 
    [allTasks]
  );
  // Get store actions once to avoid re-renders
  const { deleteTask, updateTaskStatus, toggleTaskCompletion } = useTaskStore.getState();
  
  // Keep track of open swipeable
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const openSwipeableId = useRef<string | null>(null);

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
        <TouchableOpacity 
          style={[styles.statusButton, styles.todoButton]}
          onPress={() => updateTaskStatus(id, 'To Do')}
        >
          <Ionicons name="list" size={22} color="white" />
          <Text style={styles.statusButtonText}>To Do</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statusButton, styles.inProgressButton]}
          onPress={() => updateTaskStatus(id, 'In Progress')}
        >
          <Ionicons name="hourglass-outline" size={22} color="white" />
          <Text style={styles.statusButtonText}>In Progress</Text>
        </TouchableOpacity>

        {/* No Done button since we're already in that tab */}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Done</ThemedText>
      </View>

      {/* Empty state for when there are no tasks */}
      {doneTasks.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="checkmark-circle-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No completed tasks</Text>
          <Text style={styles.emptyStateSubText}>Tasks you complete will appear here</Text>
        </View>
      )}

      {/* Task List */}
      {doneTasks.length > 0 && (
        <ScrollView style={styles.tasksContainer}>
          {doneTasks.map((task: TaskType) => (
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
                  <Ionicons name="checkmark-circle" size={24} color="green" />
                </TouchableOpacity>
                <Text style={[styles.taskTitle, styles.completedTask]}>
                  {task.title}
                </Text>
                <TouchableOpacity 
                  style={styles.dueDateTouchable}
                  onPress={() => router.push({ pathname: '/task-detail', params: { id: task.id } })}
                >
                  <Text style={styles.dueDateText}>
                    {task.dueDate 
                      ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                      : "Set Due Date"}
                  </Text>
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
    paddingTop: 60,
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
  dueDateTouchable: {
    marginLeft: 10,
    paddingVertical: 5,
  },
  dueDateText: {
    fontSize: 12,
    color: '#007AFF',
  },
  // Status action buttons styles
  statusActionsContainer: {
    flexDirection: 'row',
    width: 170, // Width for 2 buttons
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