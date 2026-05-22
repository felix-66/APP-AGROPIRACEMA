import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllMaquinas, deactivateMaquina, getMaquinaStatus } from '../../src/database/database';
import { Maquina } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

const TIPO_ICONS: Record<string, string> = {
  trator: 'tractor-variant',
  colheitadeira: 'corn',
  caminhao: 'truck',
  pulverizador: 'sprinkler-variant',
  default: 'engine',
};

function getStatusInfo(status: string) {
  switch (status) {
    case 'atrasada': return { label: 'Revisão atrasada', color: Colors.error, icon: 'close-circle' as const };
    case 'proxima': return { label: 'Próxima da revisão', color: Colors.warning, icon: 'alert' as const };
    default: return { label: 'Em dia', color: Colors.success, icon: 'check-circle' as const };
  }
}

export default function MaquinasScreen() {
  const router = useRouter();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadMaquinas();
    }, [])
  );

  async function loadMaquinas() {
    setLoading(true);
    const data = await getAllMaquinas();
    setMaquinas(data);
    setLoading(false);
  }

  function handleDelete(maquina: Maquina) {
    Alert.alert(
      'Desativar máquina',
      `Deseja desativar "${maquina.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            await deactivateMaquina(maquina.id);
            loadMaquinas();
          },
        },
      ]
    );
  }

  function renderMaquina({ item }: { item: Maquina }) {
    const status = getMaquinaStatus(item);
    const statusInfo = getStatusInfo(status);
    const iconName = TIPO_ICONS[item.tipo.toLowerCase()] || TIPO_ICONS.default;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(admin)/maquina-form', params: { id: item.id.toString() } })}
      >
        <View style={[styles.cardIcon, { backgroundColor: Colors.primaryLight }]}>
          <MaterialCommunityIcons name={iconName as any} size={36} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.nome}</Text>
          <Text style={styles.cardSubtitle}>{item.tipo}</Text>
          {item.horimetro_atual != null && item.horimetro_atual > 0 && (
            <Text style={styles.cardDetail}>Horímetro: {item.horimetro_atual}h</Text>
          )}
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {maquinas.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="tractor-variant" size={80} color={Colors.disabled} />
          <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
          <Text style={styles.emptySubtext}>Toque no botão abaixo para cadastrar</Text>
        </View>
      ) : (
        <FlatList
          data={maquinas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMaquina}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/(admin)/maquina-form')}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 60, height: 60, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },
  cardSubtitle: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginTop: 2 },
  cardDetail: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusText: { fontSize: Fonts.sizeSmall, fontWeight: Fonts.weightMedium },
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
