import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getAllMaquinas, createAbastecimento, getAllPropriedades } from '../../src/database/database';
import { Maquina, Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

const TIPO_ICONS: Record<string, string> = {
  trator: 'tractor-variant',
  colheitadeira: 'corn',
  caminhao: 'truck',
  pulverizador: 'sprinkler-variant',
  default: 'engine',
};

const OUTROS_ID = 0;

export default function AbastecimentoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [selectedProp, setSelectedProp] = useState<Propriedade | null>(null);
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);
  const [isOutros, setIsOutros] = useState(false);
  const [outrosDescricao, setOutrosDescricao] = useState('');
  const [litros, setLitros] = useState('');
  const [horimetro, setHorimetro] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [maq, props] = await Promise.all([getAllMaquinas(), getAllPropriedades()]);
    setMaquinas(maq);
    setPropriedades(props);
    if (props.length === 1) setSelectedProp(props[0]);
  }

  function selectMaquina(m: Maquina) {
    setSelectedMaquina(m);
    setIsOutros(false);
  }

  function selectOutros() {
    setSelectedMaquina(null);
    setIsOutros(true);
  }

  async function handleSave() {
    if (!selectedProp) {
      Alert.alert('Atencao', 'Selecione a propriedade.');
      return;
    }
    if (!selectedMaquina && !isOutros) {
      Alert.alert('Atencao', 'Selecione a maquina.');
      return;
    }
    if (isOutros && !outrosDescricao.trim()) {
      Alert.alert('Atencao', 'Especifique o que esta abastecendo.');
      return;
    }
    if (!litros.trim() || Number(litros) <= 0) {
      Alert.alert('Atencao', 'Digite a quantidade de litros.');
      return;
    }

    setSaving(true);
    try {
      await createAbastecimento({
        maquina_id: isOutros ? OUTROS_ID : selectedMaquina!.id,
        colaborador_id: user!.id,
        propriedade_id: selectedProp.id,
        litros: Number(litros),
        horimetro_momento: horimetro ? Number(horimetro) : undefined,
        outros_descricao: isOutros ? outrosDescricao.trim() : undefined,
      });
      Alert.alert('Sucesso', 'Abastecimento registrado!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar.');
    } finally { setSaving(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.iconHeader}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="gas-station" size={48} color={Colors.textOnPrimary} />
        </View>
        <Text style={styles.headerTitle}>Registrar Abastecimento</Text>
      </View>

      {/* Propriedade */}
      <Text style={styles.label}>Propriedade *</Text>
      {propriedades.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma propriedade cadastrada</Text>
      ) : (
        <View style={styles.propGrid}>
          {propriedades.map(p => {
            const isSelected = selectedProp?.id === p.id;
            const estColor = p.diesel_litros < 200 ? Colors.accentDark : Colors.success;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.propCard, isSelected && styles.propCardSelected]}
                onPress={() => setSelectedProp(p)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="barn"
                  size={24}
                  color={isSelected ? Colors.textOnPrimary : Colors.primaryLight}
                />
                <Text style={[styles.propName, isSelected && styles.propNameSelected]} numberOfLines={1}>
                  {p.nome}
                </Text>
                <Text style={[styles.propEstoque, isSelected ? { color: '#fff' } : { color: estColor }]}>
                  {p.diesel_litros.toFixed(0)}L
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Maquina */}
      <Text style={styles.label}>Maquina *</Text>
      <View style={styles.maquinaGrid}>
        {maquinas.map((m) => {
          const iconName = TIPO_ICONS[m.tipo.toLowerCase()] || TIPO_ICONS.default;
          const isSelected = selectedMaquina?.id === m.id && !isOutros;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.maquinaCard, isSelected && styles.maquinaCardSelected]}
              onPress={() => selectMaquina(m)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={iconName as any}
                size={32}
                color={isSelected ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[styles.maquinaName, isSelected && styles.maquinaNameSelected]} numberOfLines={2}>
                {m.nome}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.maquinaCard, styles.outrosCard, isOutros && styles.outrosCardSelected]}
          onPress={selectOutros}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="dots-horizontal-circle"
            size={32}
            color={isOutros ? Colors.textOnPrimary : Colors.accent}
          />
          <Text style={[styles.maquinaName, { color: isOutros ? Colors.textOnPrimary : Colors.accent }]} numberOfLines={1}>
            Outros
          </Text>
        </TouchableOpacity>
      </View>
      {maquinas.length === 0 && !isOutros && (
        <Text style={styles.emptyText}>Nenhuma maquina cadastrada</Text>
      )}

      {isOutros && (
        <>
          <Text style={styles.label}>Especifique o que esta abastecendo *</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="text-box-outline" size={24} color={Colors.accent} />
            <TextInput
              style={styles.inputField}
              placeholder="Ex: Caminhonete, Gerador, Motobomba..."
              placeholderTextColor={Colors.disabled}
              value={outrosDescricao}
              onChangeText={setOutrosDescricao}
              autoFocus
            />
          </View>
        </>
      )}

      <Text style={styles.label}>Quantidade de Litros *</Text>
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="water" size={24} color={Colors.accent} />
        <TextInput
          style={styles.inputField}
          placeholder="Ex: 50"
          placeholderTextColor={Colors.disabled}
          value={litros}
          onChangeText={setLitros}
          keyboardType="numeric"
        />
        <Text style={styles.unit}>litros</Text>
      </View>

      {!isOutros && (
        <>
          <Text style={styles.label}>Horimetro Atual (opcional)</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={Colors.primary} />
            <TextInput
              style={styles.inputField}
              placeholder={selectedMaquina?.horimetro_atual ? `Atual: ${selectedMaquina.horimetro_atual}h` : 'Ex: 1500'}
              placeholderTextColor={Colors.disabled}
              value={horimetro}
              onChangeText={setHorimetro}
              keyboardType="numeric"
            />
            <Text style={styles.unit}>horas</Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="check-circle" size={28} color={Colors.textOnPrimary} />
        <Text style={styles.saveButtonText}>
          {saving ? 'SALVANDO...' : 'REGISTRAR ABASTECIMENTO'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  iconHeader: { alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm },
  headerIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: Colors.text },
  label: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium,
    color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },

  propGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  propCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  propCardSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  propName: { fontSize: Fonts.sizeBase, color: Colors.text, fontWeight: Fonts.weightMedium },
  propNameSelected: { color: Colors.textOnPrimary },
  propEstoque: { fontSize: Fonts.sizeSmall, fontWeight: Fonts.weightBold },

  maquinaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  maquinaCard: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface, minWidth: 100, maxWidth: 120, gap: 4,
  },
  maquinaCardSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  outrosCard: { borderColor: Colors.accent, borderStyle: 'dashed' },
  outrosCardSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent, borderStyle: 'solid' },
  maquinaName: {
    fontSize: Fonts.sizeSmall, color: Colors.textSecondary,
    fontWeight: Fonts.weightMedium, textAlign: 'center',
  },
  maquinaNameSelected: { color: Colors.textOnPrimary },
  emptyText: {
    fontSize: Fonts.sizeBase, color: Colors.disabled, textAlign: 'center', marginTop: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  inputField: { flex: 1, paddingVertical: Spacing.md, fontSize: Fonts.sizeLarge, color: Colors.text },
  unit: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },
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
