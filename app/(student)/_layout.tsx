import { Stack } from 'expo-router';

export default function StudentLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0F172A' }
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Student Login' }} />
            <Stack.Screen name="register" options={{ title: 'Student Registration' }} />
            <Stack.Screen name="dashboard" options={{ title: 'Student Dashboard' }} />
            <Stack.Screen name="grades" options={{ title: 'My Grades' }} />
        </Stack>
    );
}
