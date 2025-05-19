import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore, Task as TaskType } from '@/services/taskStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params; // Expecting an 'id' parameter

  const { getTaskById, updateTask, deleteTask } = useTaskStore.getState();
  const [task, setTask] = useState<TaskType | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentDueDate, setCurrentDueDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // For DateTimePicker modal
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [tempDateHolder, setTempDateHolder] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (id) {
      const currentTask = getTaskById(id as string);
      if (currentTask) {
        setTask(currentTask);
        setTitle(currentTask.title);
        setDescription(currentTask.description || '');
        setCurrentDueDate(currentTask.dueDate ? new Date(currentTask.dueDate) : undefined);
        setStatus(currentTask.status);
        setPriority(currentTask.priority || 'medium');
      } else {
        Alert.alert('Error', 'Task not found.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    }
  }, [id, getTaskById]);

  const handleSaveChanges = () => {
    if (!task) return;
    const updatedTaskData: Partial<TaskType> = {
      title,
      description,
      dueDate: currentDueDate?.toISOString(),
      status,
      priority,
    };
    updateTask(task.id, updatedTaskData);
    Alert.alert('Success', 'Task updated!', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const handleDeleteTask = () => {
    if (!task) return;
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
            deleteTask(task.id);
            router.back();
          }
        },
      ]
    );
  };

  const showDatepicker = () => {
    setTempDateHolder(currentDueDate || new Date());
    setShowPicker(true);
  };

  const onChangeDateTimePicker = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShowPicker(false);
        setTempDateHolder(undefined);
        setPickerMode('date');
        return;
      }

      if (selectedDate) {
        if (pickerMode === 'date') {
          setTempDateHolder(selectedDate);
          setPickerMode('time');
          setShowPicker(false);
          setTimeout(() => setShowPicker(true), 0);
        } else {
          const finalDate = new Date(tempDateHolder || currentDueDate || Date.now());
          finalDate.setHours(selectedDate.getHours());
          finalDate.setMinutes(selectedDate.getMinutes());
          finalDate.setSeconds(0);
          finalDate.setMilliseconds(0);
          
          setCurrentDueDate(finalDate);
          setTempDateHolder(undefined);
          setShowPicker(false);
          setPickerMode('date');
        }
      }
      return;
    }

    if (Platform.OS === 'ios') {
      if (selectedDate) {
        setTempDateHolder(selectedDate);
      }
    }
  };

  const handlePickerConfirm = () => {
    if (tempDateHolder) {
      setCurrentDueDate(tempDateHolder);
    }
    setShowPicker(false);
    setTempDateHolder(undefined);
  };

  const handlePickerCancel = () => {
    setShowPicker(false);
    setTempDateHolder(undefined);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Select Date';
    return date.toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  if (!task) {
    return <View style={styles.container}><Text>Loading task...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={{ width: 40 }} />{/* Spacer */}
      </View>

      {/* 1. Editable Task Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Title:</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
        />
      </View>

      {/* 2. Description / Notes Field */}
      <View style={styles.section}>
        <Text style={styles.label}>Description/Notes:</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter task description or notes"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* 3. Due Date & Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Due Date:</Text>
        <TouchableOpacity onPress={showDatepicker} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>{formatDate(currentDueDate)}</Text>
        </TouchableOpacity>
        {showPicker && (
          <>
            <DateTimePicker
              value={tempDateHolder || currentDueDate || new Date()}
              mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={false}
              onChange={onChangeDateTimePicker}
              {...(Platform.OS === 'ios' && { textColor: '#333333', themeVariant: 'light' })}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerControlsContainer}>
                <TouchableOpacity onPress={handlePickerCancel} style={[styles.pickerButton, styles.pickerCancelButton]}>
                  <Text style={styles.pickerButtonTextDark}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickerConfirm} style={[styles.pickerButton, styles.pickerConfirmButton]}>
                  <Text style={styles.pickerButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* 4. Status Indicator & Changer */}
      <View style={styles.section}>
        <Text style={styles.label}>Status:</Text>
        <View style={styles.statusContainer}>
          {(['todo', 'in-progress', 'done'] as const).map(s => (
            <TouchableOpacity 
              key={s} 
              style={[styles.statusButton, status === s && styles.statusButtonActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusButtonText, status === s && styles.statusButtonTextActive]}>
                {s.replace('-', ' ').replace(/^\w/, c => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* 6. Priority */}
      <View style={styles.section}>
        <Text style={styles.label}>Priority:</Text>
         <View style={styles.statusContainer}>
          {(['low', 'medium', 'high'] as const).map(p => (
            <TouchableOpacity 
              key={p} 
              style={[styles.statusButton, priority === p && styles.statusButtonActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.statusButtonText, priority === p && styles.statusButtonTextActive]}>
                {p.replace(/^\w/, c => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* 7. Save/Confirm Changes & 8. Delete Task */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveChanges}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteTask}>
          <Text style={styles.buttonText}>Delete Task</Text>
        </TouchableOpacity>
      </View>
      <View style={{height: 50}} />{/* Bottom padding */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dateButtonText: {
    color: '#333',
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  statusButtonActive: {
    backgroundColor: '#007AFF',
  },
  statusButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
   subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtaskInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 8,
    marginRight: 8,
  },
  addButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8E8E8',
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#007AFF',
    fontWeight: 'bold'
  },
  actionsContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  pickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  pickerConfirmButton: {
    backgroundColor: '#007AFF',
  },
  pickerCancelButton: {
    backgroundColor: '#D1D1D6',
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButtonTextDark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 