import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createMaquina, updateMaquina, getMaquinaById } from '../../src/database/database';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

const TIPOS = [
  { label: 'Trator', value: 'Trator', icon: 'tractor-variant' },
  { label: 'Colheitadeira', value: 'Colheitadeira', icon: 'corn' },
  { label: 'Caminhão', value: 'Caminhão', icon: 'truck' },
  { label: 'Pulverizador', value: 'Pulverizador', icon: 'sprinkler-variant' },
  { label: 'Outro', value: 'Outro', icon: 'engine' },
];

export default function MaquinaFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Trator');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [intervaloDias, setIntervaloDias] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) loadMaquina();
  }, [id]);

  async function loadMaquina() {
    const maquina = await getMaquinaById(Number(id));
    if (maquina) {
      setNome(maquina.nome);
      setTipo(maquina.tipo);
      setNumeroSerie(maquina.numero_serie || '');
      setIntervaloHoras(maquina.intervalo_revisao_horas?.toString() || '');
      setIntervaloDias(maquina.intervalo_revisao_dias?.toString() || '');
    }
  }

  async function handleSave() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Digite o nome da máquina.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        nome: nome.trim(),
        tipo,
        numero_serie: numeroSerie.trim() || undefined,
        intervalo_revisao_horas: intervaloHoras ? Number(intervaloHoras) : undefined,
        intervalo_revisao_dias: intervaloDias ? Number(intervaloDias) : undefined,
      };

      if (isEditing) {
        await updateMaquina(Number(id), data);
      } else {
        await createMaquina(data);
      }

      Alert.alert('Sucesso', isEditing ? 'Máquina atualizada!' : 'Máquina cadastrada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Nome da Máquina *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Trator John Deere 5075"
        placeholderTextColor={Colors.disabled}
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Tipo *</Text>
      <View style={styles.tipoGrid}>
        {TIPOS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.tipoCard, tipo === t.value && styles.tipoCardSelected]}
            onPress={() => setTipo(t.value)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={t.icon as any}
              size={28}
              color={tipo === t.value ? Colors.textOnPrimary : Colors.textSecondary}
            />
            <Text style={[styles.tipoLabel, tipo === t.value && styles.tipoLabelSelected]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Número de Série (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: ABC12345"
        placeholderTextColor={Colors.disabled}
        value={numeroSerie}
        onChangeText={setNumeroSerie}
      />

      <Text style={styles.sectionTitle}>Intervalo de Revisão</Text>
      <Text style={styles.hint}>Defina por horas OU por dias. Se não tiver horímetro, use dias.</Text>

      <Text style={styles.label}>A cada quantas horas?</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 50, 100, 200"
        placeholderTextColor={Colors.disabled}
        value={intervaloHoras}
        onChangeText={setIntervaloHoras}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Ou a cada quantos dias?</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 30, 60, 90"
        placeholderTextColor={Colors.disabled}
        value={intervaloDias}
        onChangeText={setIntervaloDias}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="content-save" size={24} color={Colors.textOnPrimary} />
        <Text style={styles.saveButtonText}>
          {saving ? 'SALVANDO...' : isEditing ? 'ATUALIZAR' : 'CADASTRAR'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium,
    color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, fontSize: Fonts.sizeMedium, color: Colors.text,
  },
  tipoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
  },
  tipoCard: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface, minWidth: 90, gap: 4,
  },
  tipoCardSelected: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  tipoLabel: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },
  tipoLabelSelected: { color: Colors.textOnPrimary },
  sectionTitle: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold,
    color: Colors.primary, marginTop: Spacing.xl, marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginBottom: Spacing.sm,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4, marginTop: Spacing.xl, gap: Spacing.sm, elevation: 2,
  },
  saveButtonText: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold,
    color: Colors.textOnPrimary, letterSpacing: 1,
  },
});
