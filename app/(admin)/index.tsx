import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getLitrosHoje, getRevisoesHoje, getAllPropriedades } from '../../src/database/database';
import { Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

const adminMenuItems = [
  {
    label: 'Abastecimento',
    icon: 'gas-station' as const,
    color: Colors.accent,
    description: 'Registrar abastecimento',
    route: '/(admin)/abastecimento',
  },
  {
    label: 'Propriedades',
    icon: 'barn' as const,
    color: '#6D4C41',
    description: 'Cadastrar fazendas',
    route: '/(admin)/propriedades',
  },
  {
    label: 'Estoque Diesel',
    icon: 'fuel' as const,
    color: '#E65100',
    description: 'Controle por propriedade',
    route: '/(admin)/estoque',
  },
  {
    label: 'Maquinas',
    icon: 'tractor-variant' as const,
    color: Colors.primaryLight,
    description: 'Cadastrar e gerenciar',
    route: '/(admin)/maquinas',
  },
  {
    label: 'Colaboradores',
    icon: 'account-group' as const,
    color: Colors.accent,
    description: 'Cadastrar e gerenciar',
    route: '/(admin)/colaboradores',
  },
  {
    label: 'Relatorios',
    icon: 'chart-bar' as const,
    color: '#5C6BC0',
    description: 'Por propriedade',
    route: '/(admin)/relatorios',
  },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [litros, setLitros] = useState<number | null>(null);
  const [revisoes, setRevisoes] = useState<number | null>(null);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);

  useFocusEffect(
    useCallback(() => { loadStats(); }, [])
  );

  async function loadStats() {
    const [l, r, p] = await Promise.all([
      getLitrosHoje(),
      getRevisoesHoje().then((arr) => arr.length),
      getAllPropriedades(),
    ]);
    setLitros(l);
    setRevisoes(r);
    setPropriedades(p);
  }

  const estoqueTotal = propriedades.reduce((s, p) => s + p.diesel_litros, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ola, {user?.nome?.split(' ')[0]}!</Text>
          <Text style={styles.role}>Administrador</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={28} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.accentLight }]}>
          <MaterialCommunityIcons name="gas-station" size={32} color={Colors.accentDark} />
          <Text style={styles.statValue}>{litros ?? '--'}</Text>
          <Text style={styles.statLabel}>Litros hoje</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.successLight }]}>
          <MaterialCommunityIcons name="wrench" size={32} color={Colors.success} />
          <Text style={styles.statValue}>{revisoes ?? '--'}</Text>
          <Text style={styles.statLabel}>Revisoes hoje</Text>
        </View>
      </View>

      {/* Estoque por Propriedade */}
      {propriedades.length > 0 && (
        <TouchableOpacity
          style={styles.estoqueSection}
          onPress={() => router.push('/(admin)/estoque' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.estoqueSectionHeader}>
            <MaterialCommunityIcons name="fuel" size={20} color={Colors.primary} />
            <Text style={styles.estoqueSectionTitle}>Estoque Diesel</Text>
            <Text style={styles.estoqueSectionTotal}>{estoqueTotal.toFixed(0)}L total</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.disabled} />
          </View>
          {propriedades.map(p => {
            const color = p.diesel_litros <= 0 ? Colors.error : p.diesel_litros < 200 ? Colors.warning : Colors.success;
            return (
              <View key={p.id} style={styles.estoquePropRow}>
                <MaterialCommunityIcons name="barn" size={16} color={Colors.textSecondary} />
                <Text style={styles.estoquePropNome}>{p.nome}</Text>
                <Text style={[styles.estoquePropVal, { color }]}>{p.diesel_litros.toFixed(0)}L</Text>
              </View>
            );
          })}
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Menu</Text>
      <View style={styles.menuGrid}>
        {adminMenuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon} size={36} color={Colors.textOnPrimary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color={Colors.disabled} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: { fontSize: Fonts.sizeXLarge, fontWeight: Fonts.weightBold, color: Colors.text },
  role: { fontSize: Fonts.sizeBase, color: Colors.primaryLight, fontWeight: Fonts.weightMedium, marginTop: 2 },
  logoutButton: {
    padding: Spacing.sm, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, elevation: 2,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', gap: Spacing.xs,
  },
  statValue: { fontSize: Fonts.sizeXLarge, fontWeight: Fonts.weightBold, color: Colors.text },
  statLabel: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, textAlign: 'center' },

  estoqueSection: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg, elevation: 2,
  },
  estoqueSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  estoqueSectionTitle: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold, color: Colors.primary, flex: 1 },
  estoqueSectionTotal: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },
  estoquePropRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
  },
  estoquePropNome: { flex: 1, fontSize: Fonts.sizeBase, color: Colors.text },
  estoquePropVal: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold },

  sectionTitle: { fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: Colors.text, marginBottom: Spacing.md },
  menuGrid: { gap: Spacing.md },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, gap: Spacing.md,
  },
  menuIcon: {
    width: 60, height: 60, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },
  menuDescription: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginTop: 2 },
});
