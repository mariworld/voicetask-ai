import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the todo tab
  return <Redirect href="/(tabs)/todo" />;
} 