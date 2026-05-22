import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getAllPropriedades, createPropriedade, updatePropriedade, deactivatePropriedade,
} from '../../src/database/database';
import { Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

export default function PropriedadesScreen() {
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    setLoading(true);
    const data = await getAllPropriedades();
    setPropriedades(data);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setNome('');
    setModalVisible(true);
  }

  function openEdit(p: Propriedade) {
    setEditingId(p.id);
    setNome(p.nome);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!nome.trim()) {
      Alert.alert('Atencao', 'Digite o nome da propriedade.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updatePropriedade(editingId, nome.trim());
      } else {
        await createPropriedade(nome.trim());
      }
      setModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao salvar.');
    } finally { setSaving(false); }
  }

  function handleDelete(p: Propriedade) {
    Alert.alert('Excluir', `Deseja excluir "${p.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await deactivatePropriedade(p.id);
        await loadData();
      }},
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {propriedades.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="barn" size={64} color={Colors.disabled} />
            <Text style={styles.emptyText}>Nenhuma propriedade cadastrada</Text>
            <Text style={styles.emptySubtext}>Adicione sua primeira fazenda</Text>
          </View>
        ) : (
          propriedades.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => openEdit(p)} activeOpacity={0.7}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="barn" size={32} color={Colors.textOnPrimary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{p.nome}</Text>
                <View style={styles.cardInfo}>
                  <MaterialCommunityIcons name="fuel" size={14} color={Colors.textSecondary} />
                  <Text style={styles.cardInfoText}>Estoque: {p.diesel_litros.toFixed(0)}L</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(p)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="delete" size={22} color={Colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openNew} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={32} color={Colors.textOnPrimary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar Propriedade' : 'Nova Propriedade'}</Text>
            <Text style={styles.label}>Nome da Propriedade</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Fazenda Piracema"
              placeholderTextColor={Colors.disabled}
              value={nome}
              onChangeText={setNome}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: Colors.textSecondary },
  emptySubtext: { fontSize: Fonts.sizeBase, color: Colors.disabled },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, gap: Spacing.md,
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardInfoText: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  deleteBtn: { padding: Spacing.sm },

  fab: {
    position: 'absolute', bottom: Spacing.lg, right: Spacing.lg,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold,
    color: Colors.text, marginBottom: Spacing.lg, textAlign: 'center',
  },
  label: {
    fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium,
    color: Colors.text, marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md,
    fontSize: Fonts.sizeMedium, color: Colors.text,
  },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold, color: '#fff' },
});
