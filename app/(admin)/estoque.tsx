import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getAllPropriedades, getEstoqueDiesel, setEstoqueDiesel,
  getHistoricoEstoque, registrarMovimentoEstoque,
} from '../../src/database/database';
import { Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

export default function EstoqueScreen() {
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [selectedProp, setSelectedProp] = useState<Propriedade | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novoEstoque, setNovoEstoque] = useState('');
  const [modo, setModo] = useState<'definir' | 'adicionar'>('adicionar');

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    setLoading(true);
    const props = await getAllPropriedades();
    setPropriedades(props);
    if (props.length > 0) {
      const sel = selectedProp ? props.find(p => p.id === selectedProp.id) || props[0] : props[0];
      setSelectedProp(sel);
      const hist = await getHistoricoEstoque(sel.id);
      setHistorico(hist);
    }
    setLoading(false);
  }

  async function selectProp(p: Propriedade) {
    setSelectedProp(p);
    const hist = await getHistoricoEstoque(p.id);
    setHistorico(hist);
  }

  async function handleSalvar() {
    if (!selectedProp) return;
    const valor = Number(novoEstoque);
    if (!novoEstoque.trim() || isNaN(valor) || valor < 0) {
      Alert.alert('Atencao', 'Digite um valor valido.');
      return;
    }
    setSaving(true);
    try {
      const estoqueAtual = selectedProp.diesel_litros;
      const litrosFinal = modo === 'definir' ? valor : estoqueAtual + valor;
      const descricao = modo === 'definir'
        ? `Estoque definido para ${valor}L`
        : `Entrada de ${valor}L`;
      await setEstoqueDiesel(selectedProp.id, litrosFinal);
      await registrarMovimentoEstoque(
        selectedProp.id, estoqueAtual, litrosFinal,
        modo === 'definir' ? 'ajuste' : 'entrada', descricao,
      );
      Alert.alert('Sucesso', modo === 'definir'
        ? `Estoque definido: ${litrosFinal}L`
        : `Adicionados ${valor}L. Novo estoque: ${litrosFinal}L`
      );
      setNovoEstoque('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao salvar.');
    } finally { setSaving(false); }
  }

  function formatDateTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando estoque...</Text>
      </View>
    );
  }

  if (propriedades.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="barn" size={64} color={Colors.disabled} />
        <Text style={styles.loadingText}>Cadastre uma propriedade primeiro</Text>
      </View>
    );
  }

  const est = selectedProp?.diesel_litros ?? 0;
  const estColor = est <= 0 ? Colors.error : est < 200 ? Colors.warning : Colors.success;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Seletor de Propriedade */}
      <Text style={styles.sectionLabel}>Propriedade</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propScroll}>
        <View style={styles.propRow}>
          {propriedades.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.propChip, selectedProp?.id === p.id && styles.propChipActive]}
              onPress={() => selectProp(p)}
            >
              <MaterialCommunityIcons name="barn" size={16}
                color={selectedProp?.id === p.id ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.propChipText, selectedProp?.id === p.id && styles.propChipTextActive]}>
                {p.nome}
              </Text>
              <Text style={[styles.propChipLitros, selectedProp?.id === p.id && { color: '#fff' }]}>
                {p.diesel_litros.toFixed(0)}L
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Estoque Card */}
      <View style={styles.estoqueCard}>
        <MaterialCommunityIcons name="fuel" size={48} color={estColor} />
        <Text style={styles.estoqueLabel}>{selectedProp?.nome}</Text>
        <Text style={[styles.estoqueValor, { color: estColor }]}>{est.toFixed(0)}L</Text>
        {est <= 0 && (
          <View style={styles.alertRow}>
            <MaterialCommunityIcons name="alert" size={18} color={Colors.error} />
            <Text style={styles.alertText}>Estoque zerado!</Text>
          </View>
        )}
        {est > 0 && est < 200 && (
          <View style={styles.alertRow}>
            <MaterialCommunityIcons name="alert" size={18} color={Colors.warning} />
            <Text style={[styles.alertText, { color: Colors.warning }]}>Estoque baixo</Text>
          </View>
        )}
      </View>

      {/* Modo */}
      <View style={styles.modoRow}>
        <TouchableOpacity
          style={[styles.modoBtn, modo === 'adicionar' && styles.modoBtnActive]}
          onPress={() => setModo('adicionar')}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color={modo === 'adicionar' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.modoText, modo === 'adicionar' && styles.modoTextActive]}>Adicionar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modoBtn, modo === 'definir' && styles.modoBtnActive]}
          onPress={() => setModo('definir')}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={modo === 'definir' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.modoText, modo === 'definir' && styles.modoTextActive]}>Definir Total</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>
        {modo === 'adicionar' ? 'Litros a Adicionar' : 'Novo Total de Litros'}
      </Text>
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="water" size={24} color={Colors.accent} />
        <TextInput
          style={styles.inputField}
          placeholder={modo === 'adicionar' ? 'Ex: 1000' : 'Ex: 5000'}
          placeholderTextColor={Colors.disabled}
          value={novoEstoque}
          onChangeText={setNovoEstoque}
          keyboardType="numeric"
        />
        <Text style={styles.unit}>litros</Text>
      </View>
      {modo === 'adicionar' && novoEstoque.trim() && Number(novoEstoque) > 0 && (
        <Text style={styles.previewText}>
          Novo estoque: {est} + {Number(novoEstoque)} = {est + Number(novoEstoque)}L
        </Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSalvar}
        disabled={saving}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="check-circle" size={28} color={Colors.textOnPrimary} />
        <Text style={styles.saveButtonText}>
          {saving ? 'SALVANDO...' : modo === 'adicionar' ? 'ADICIONAR AO ESTOQUE' : 'DEFINIR ESTOQUE'}
        </Text>
      </TouchableOpacity>

      {/* Historico */}
      <Text style={styles.sectionTitle}>Historico - {selectedProp?.nome}</Text>
      {historico.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma movimentacao registrada</Text>
      ) : (
        historico.slice(0, 30).map((h, i) => (
          <View key={i} style={[styles.histCard, {
            borderLeftColor: h.tipo === 'saida' ? Colors.error : h.tipo === 'entrada' ? Colors.success : Colors.accent,
          }]}>
            <View style={styles.histRow}>
              <MaterialCommunityIcons
                name={h.tipo === 'saida' ? 'arrow-down-circle' : h.tipo === 'entrada' ? 'arrow-up-circle' : 'pencil-circle'}
                size={20}
                color={h.tipo === 'saida' ? Colors.error : h.tipo === 'entrada' ? Colors.success : Colors.accent}
              />
              <Text style={styles.histDesc}>{h.descricao}</Text>
            </View>
            <View style={styles.histDetails}>
              <Text style={styles.histDate}>{formatDateTime(h.data_hora)}</Text>
              <Text style={styles.histValues}>
                {h.litros_antes.toFixed(0)}L → {h.litros_depois.toFixed(0)}L
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary },

  sectionLabel: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.textSecondary, marginBottom: Spacing.xs },
  propScroll: { marginBottom: Spacing.md },
  propRow: { flexDirection: 'row', gap: Spacing.sm },
  propChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  propChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  propChipText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.text },
  propChipTextActive: { color: '#fff' },
  propChipLitros: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, fontWeight: Fonts.weightBold },

  estoqueCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  estoqueLabel: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary },
  estoqueValor: { fontSize: 56, fontWeight: Fonts.weightBold },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  alertText: { fontSize: Fonts.sizeBase, color: Colors.error, fontWeight: Fonts.weightMedium },

  modoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.xs,
  },
  modoBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modoText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.textSecondary },
  modoTextActive: { color: '#fff' },

  label: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium,
    color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  inputField: { flex: 1, paddingVertical: Spacing.md, fontSize: Fonts.sizeLarge, color: Colors.text },
  unit: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },
  previewText: {
    fontSize: Fonts.sizeBase, color: Colors.success, fontWeight: Fonts.weightMedium,
    marginTop: Spacing.sm, textAlign: 'center',
  },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4, marginTop: Spacing.lg, gap: Spacing.sm, elevation: 2,
  },
  saveButtonText: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold,
    color: Colors.textOnPrimary, letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.primary,
    marginTop: Spacing.xl, marginBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.xs,
  },
  emptyText: { fontSize: Fonts.sizeBase, color: Colors.disabled, textAlign: 'center', paddingVertical: Spacing.md },

  histCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2, marginBottom: Spacing.xs, elevation: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.accent,
  },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  histDesc: { flex: 1, fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.text },
  histDetails: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 28, marginTop: 4 },
  histDate: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  histValues: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },
});
