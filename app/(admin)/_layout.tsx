import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function AdminLayout() {
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
        options={{ title: 'AgroControl - Admin', headerBackVisible: false }}
      />
      <Stack.Screen name="maquinas" options={{ title: 'Máquinas' }} />
      <Stack.Screen name="maquina-form" options={{ title: 'Nova Máquina' }} />
      <Stack.Screen name="colaboradores" options={{ title: 'Colaboradores' }} />
      <Stack.Screen name="colaborador-form" options={{ title: 'Novo Colaborador' }} />
      <Stack.Screen name="propriedades" options={{ title: 'Propriedades' }} />
      <Stack.Screen name="estoque" options={{ title: 'Estoque Diesel' }} />
      <Stack.Screen name="relatorios" options={{ title: 'Relatórios' }} />
      <Stack.Screen name="abastecimento" options={{ title: 'Abastecimento' }} />
    </Stack>
  );
}
