import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllColaboradores, deactivateColaborador } from '../../src/database/database';
import { User } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

export default function ColaboradoresScreen() {
  const router = useRouter();
  const [colaboradores, setColaboradores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadColaboradores();
    }, [])
  );

  async function loadColaboradores() {
    setLoading(true);
    const data = await getAllColaboradores();
    setColaboradores(data);
    setLoading(false);
  }

  function handleDelete(colab: User) {
    Alert.alert(
      'Desativar colaborador',
      `Deseja desativar "${colab.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            await deactivateColaborador(colab.id);
            loadColaboradores();
          },
        },
      ]
    );
  }

  function renderColaborador({ item }: { item: User }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(admin)/colaborador-form', params: { id: item.id.toString() } })}
      >
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={36} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.nome}</Text>
          <Text style={styles.cardSubtitle}>Login: {item.login}</Text>
          {item.whatsapp ? (
            <View style={styles.whatsappRow}>
              <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
              <Text style={styles.whatsappText}>{item.whatsapp}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {colaboradores.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group" size={80} color={Colors.disabled} />
          <Text style={styles.emptyText}>Nenhum colaborador cadastrado</Text>
          <Text style={styles.emptySubtext}>Toque no botão abaixo para cadastrar</Text>
        </View>
      ) : (
        <FlatList
          data={colaboradores}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderColaborador}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/(admin)/colaborador-form')}
      >
        <MaterialCommunityIcons name="plus" size={32} color={Colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
    elevation: 2, gap: Spacing.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },
  cardSubtitle: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginTop: 2 },
  whatsappRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  whatsappText: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  deleteBtn: { padding: Spacing.sm },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyText: { fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: Colors.textSecondary },
  emptySubtext: { fontSize: Fonts.sizeBase, color: Colors.disabled },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
});
