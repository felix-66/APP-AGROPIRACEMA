import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function ColaboradorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'AgroControl', headerBackVisible: false }}
      />
      <Stack.Screen
        name="abastecimento"
        options={{ title: 'Abastecimento' }}
      />
      <Stack.Screen
        name="revisao"
        options={{ title: 'Manutencao' }}
      />
    </Stack>
  );
}
