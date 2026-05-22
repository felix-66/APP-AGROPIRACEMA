import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getAllPropriedades } from '../../src/database/database';
import { Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const menuItems = [
  {
    label: 'Registrar\nAbastecimento',
    icon: 'gas-station' as const,
    color: Colors.accent,
    route: '/(colaborador)/abastecimento',
  },
  {
    label: 'Registrar\nRevisão',
    icon: 'wrench' as const,
    color: Colors.primaryLight,
    route: '/(colaborador)/revisao',
  },
];

export default function ColaboradorHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllPropriedades().then(setPropriedades);
    }, [])
  );

  const estoqueTotal = propriedades.reduce((s, p) => s + p.diesel_litros, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.nome?.split(' ')[0]}!
          </Text>
          <Text style={styles.time}>{formatTime()}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <MaterialCommunityIcons
            name="logout"
            size={28}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {propriedades.length > 0 && (
        <View style={styles.estoqueSection}>
          <View style={styles.estoqueSectionHeader}>
            <MaterialCommunityIcons name="fuel" size={20} color={Colors.primary} />
            <Text style={styles.estoqueSectionTitle}>Estoque Diesel</Text>
            <Text style={styles.estoqueSectionTotal}>{estoqueTotal.toFixed(0)}L total</Text>
          </View>
          {propriedades.map(p => {
            const color = p.diesel_litros <= 0 ? Colors.error : p.diesel_litros < 200 ? Colors.warning : Colors.success;
            return (
              <View key={p.id} style={styles.estoquePropRow}>
                <MaterialCommunityIcons name="barn" size={16} color={Colors.textSecondary} />
                <Text style={styles.estoquePropNome}>{p.nome}</Text>
                <Text style={[styles.estoquePropVal, { color }]}>{p.diesel_litros.toFixed(0)}L</Text>
                {p.diesel_litros < 200 && (
                  <MaterialCommunityIcons
                    name="alert"
                    size={16}
                    color={p.diesel_litros <= 0 ? Colors.error : Colors.warning}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuCard, { borderLeftColor: item.color }]}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={48}
                color={Colors.textOnPrimary}
              />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  greeting: {
    fontSize: Fonts.sizeXLarge,
    fontWeight: Fonts.weightBold,
    color: Colors.text,
  },
  time: {
    fontSize: Fonts.sizeMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  logoutButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    elevation: 2,
  },
  estoqueSection: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  estoqueSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.sm, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  estoqueSectionTitle: {
    fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold,
    color: Colors.primary, flex: 1,
  },
  estoqueSectionTotal: {
    fontSize: Fonts.sizeSmall, color: Colors.textSecondary,
    fontWeight: Fonts.weightMedium,
  },
  estoquePropRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
  },
  estoquePropNome: { flex: 1, fontSize: Fonts.sizeBase, color: Colors.text },
  estoquePropVal: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold },
  menuGrid: {
    gap: Spacing.lg,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: Fonts.sizeLarge,
    fontWeight: Fonts.weightBold,
    color: Colors.text,
    flex: 1,
  },
});
