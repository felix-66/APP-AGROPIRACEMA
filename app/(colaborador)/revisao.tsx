import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  FlatList, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getAllMaquinas, createRevisao, getAllRevisoes } from '../../src/database/database';
import { Maquina, Revisao } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

const TIPO_ICONS: Record<string, string> = {
  trator: 'tractor-variant',
  colheitadeira: 'corn',
  caminhao: 'truck',
  pulverizador: 'sprinkler-variant',
  default: 'engine',
};

const PECAS_CATEGORIAS = [
  {
    titulo: 'Filtros',
    icon: 'filter' as const,
    itens: [
      'Filtro de Ar',
      'Filtro de Combustivel',
      'Filtro de Oleo',
      'Filtro do Hidraulico',
      'Filtro do Cambio',
      'Filtro de Cabine',
    ],
  },
  {
    titulo: 'Oleos Lubrificantes',
    icon: 'oil' as const,
    itens: [
      'Oleo do Motor',
      'Oleo da Cx. Marchas',
      'Oleo da Cx. Direcao',
      'Fluido de Freio',
      'Oleo do Dif. Diant.',
      'Oleo do Dif. Tras.',
      'Oleo da Tomada de Forca',
    ],
  },
  {
    titulo: 'Outros',
    icon: 'cog' as const,
    itens: [
      'Agua Radiador',
      'Adit. Radiador',
      'Engraxamento',
      'Correias',
      'Bateria',
      'Pneus',
    ],
  },
];

type Tab = 'form' | 'historico';

export default function RevisaoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('form');
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);
  const [tipoManutencao, setTipoManutencao] = useState<'corretiva' | 'preventiva'>('corretiva');
  const [pecasSelecionadas, setPecasSelecionadas] = useState<string[]>([]);
  const [outrasPecas, setOutrasPecas] = useState('');
  const [horimetro, setHorimetro] = useState('');
  const [unidadeHorimetro, setUnidadeHorimetro] = useState<'horas' | 'km'>('horas');
  const [operador, setOperador] = useState('');
  const [dataManutencao, setDataManutencao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDay, setTempDay] = useState(dataManutencao.getDate().toString());
  const [tempMonth, setTempMonth] = useState((dataManutencao.getMonth() + 1).toString());
  const [tempYear, setTempYear] = useState(dataManutencao.getFullYear().toString());
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<(Revisao & { maquina_nome?: string; colaborador_nome?: string })[]>([]);
  const [showMaquinaPicker, setShowMaquinaPicker] = useState(false);

  useEffect(() => {
    loadMaquinas();
  }, []);

  useEffect(() => {
    if (tab === 'historico') loadHistorico();
  }, [tab]);

  async function loadMaquinas() {
    const data = await getAllMaquinas();
    setMaquinas(data);
  }

  async function loadHistorico() {
    const data = await getAllRevisoes();
    setHistorico(data);
  }

  function togglePeca(item: string) {
    setPecasSelecionadas((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function confirmDate() {
    const d = parseInt(tempDay) || 1;
    const m = parseInt(tempMonth) || 1;
    const y = parseInt(tempYear) || new Date().getFullYear();
    const newDate = new Date(y, m - 1, d);
    if (!isNaN(newDate.getTime()) && newDate <= new Date()) {
      setDataManutencao(newDate);
    }
    setShowDatePicker(false);
  }

  function openDatePicker() {
    setTempDay(dataManutencao.getDate().toString());
    setTempMonth((dataManutencao.getMonth() + 1).toString());
    setTempYear(dataManutencao.getFullYear().toString());
    setShowDatePicker(true);
  }

  async function handleSave() {
    if (!selectedMaquina) {
      Alert.alert('Atencao', 'Selecione o equipamento.');
      return;
    }
    if (pecasSelecionadas.length === 0 && !outrasPecas.trim()) {
      Alert.alert('Atencao', 'Selecione pelo menos uma peca ou informe em "Outras".');
      return;
    }

    setSaving(true);
    try {
      await createRevisao({
        maquina_id: selectedMaquina.id,
        colaborador_id: user!.id,
        tipo_manutencao: tipoManutencao,
        pecas_trocadas: pecasSelecionadas,
        outras_pecas: outrasPecas.trim() || undefined,
        horimetro_momento: horimetro ? Number(horimetro) : undefined,
        unidade_horimetro: unidadeHorimetro,
        operador: operador.trim() || undefined,
        data_manutencao: dataManutencao.toISOString().split('T')[0],
        observacoes: observacoes.trim() || undefined,
      });

      Alert.alert('Sucesso', 'Manutencao registrada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar.');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'form' && styles.tabBtnActive]}
          onPress={() => setTab('form')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="wrench" size={20} color={tab === 'form' ? '#fff' : Colors.primary} />
          <Text style={[styles.tabText, tab === 'form' && styles.tabTextActive]}>Nova</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'historico' && styles.tabBtnActive]}
          onPress={() => setTab('historico')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="history" size={20} color={tab === 'historico' ? '#fff' : Colors.primary} />
          <Text style={[styles.tabText, tab === 'historico' && styles.tabTextActive]}>Historico</Text>
        </TouchableOpacity>
      </View>

      {tab === 'form' ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Data da Manutencao */}
          <Text style={styles.sectionTitle}>Data da Manutencao</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={openDatePicker} activeOpacity={0.7}>
            <MaterialCommunityIcons name="calendar" size={24} color={Colors.primary} />
            <Text style={styles.dateText}>
              {dataManutencao.toLocaleDateString('pt-BR')}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Modal visible={showDatePicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione a Data</Text>
                <View style={styles.dateInputRow}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Dia</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={tempDay}
                      onChangeText={setTempDay}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.dateSep}>/</Text>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Mes</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={tempMonth}
                      onChangeText={setTempMonth}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.dateSep}>/</Text>
                  <View style={[styles.dateInputGroup, { flex: 1.5 }]}>
                    <Text style={styles.dateInputLabel}>Ano</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={tempYear}
                      onChangeText={setTempYear}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
                <View style={styles.dateModalBtns}>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.modalCloseText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalClose, { backgroundColor: Colors.primary }]} onPress={confirmDate}>
                    <Text style={[styles.modalCloseText, { color: '#fff' }]}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Equipamento */}
          <Text style={styles.sectionTitle}>Equipamento *</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowMaquinaPicker(true)}
            activeOpacity={0.7}
          >
            {selectedMaquina ? (
              <View style={styles.pickerSelected}>
                <MaterialCommunityIcons
                  name={(TIPO_ICONS[selectedMaquina.tipo.toLowerCase()] || TIPO_ICONS.default) as any}
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.pickerSelectedText}>{selectedMaquina.nome}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Selecione o equipamento</Text>
            )}
            <MaterialCommunityIcons name="chevron-down" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Modal visible={showMaquinaPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione o Equipamento</Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {maquinas.map((m) => {
                    const iconName = TIPO_ICONS[m.tipo.toLowerCase()] || TIPO_ICONS.default;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.modalItem, selectedMaquina?.id === m.id && styles.modalItemSelected]}
                        onPress={() => { setSelectedMaquina(m); setShowMaquinaPicker(false); }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name={iconName as any} size={28} color={selectedMaquina?.id === m.id ? '#fff' : Colors.primary} />
                        <Text style={[styles.modalItemText, selectedMaquina?.id === m.id && { color: '#fff' }]}>{m.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowMaquinaPicker(false)}>
                  <Text style={styles.modalCloseText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Horimetro */}
          <Text style={styles.sectionTitle}>Horimetro / Km</Text>
          <View style={styles.horimetroRow}>
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitBtn, unidadeHorimetro === 'horas' && styles.unitBtnActive]}
                onPress={() => setUnidadeHorimetro('horas')}
              >
                <Text style={[styles.unitBtnText, unidadeHorimetro === 'horas' && styles.unitBtnTextActive]}>Horas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, unidadeHorimetro === 'km' && styles.unitBtnActive]}
                onPress={() => setUnidadeHorimetro('km')}
              >
                <Text style={[styles.unitBtnText, unidadeHorimetro === 'km' && styles.unitBtnTextActive]}>Km</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.horimetroInput}>
              <TextInput
                style={styles.inputField}
                placeholder={selectedMaquina?.horimetro_atual ? `Atual: ${selectedMaquina.horimetro_atual}` : '0'}
                placeholderTextColor={Colors.disabled}
                value={horimetro}
                onChangeText={setHorimetro}
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>{unidadeHorimetro === 'horas' ? 'h' : 'km'}</Text>
            </View>
          </View>

          {/* Operador */}
          <Text style={styles.sectionTitle}>Operador</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="account" size={24} color={Colors.primary} />
            <TextInput
              style={styles.inputField}
              placeholder="Nome do operador"
              placeholderTextColor={Colors.disabled}
              value={operador}
              onChangeText={setOperador}
            />
          </View>

          {/* Tipo de Manutencao */}
          <Text style={styles.sectionTitle}>Tipo de Manutencao</Text>
          <View style={styles.tipoRow}>
            <TouchableOpacity
              style={[styles.tipoBtn, tipoManutencao === 'corretiva' && styles.tipoBtnCorretiva]}
              onPress={() => setTipoManutencao('corretiva')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color={tipoManutencao === 'corretiva' ? '#fff' : Colors.error}
              />
              <Text style={[styles.tipoBtnText, tipoManutencao === 'corretiva' && { color: '#fff' }]}>Corretiva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tipoBtn, tipoManutencao === 'preventiva' && styles.tipoBtnPreventiva]}
              onPress={() => setTipoManutencao('preventiva')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color={tipoManutencao === 'preventiva' ? '#fff' : Colors.success}
              />
              <Text style={[styles.tipoBtnText, tipoManutencao === 'preventiva' && { color: '#fff' }]}>Preventiva</Text>
            </TouchableOpacity>
          </View>

          {/* Pecas por Categoria */}
          <Text style={styles.sectionTitle}>Pecas Trocadas / Servicos</Text>
          {PECAS_CATEGORIAS.map((cat) => (
            <View key={cat.titulo} style={styles.categoriaBlock}>
              <View style={styles.categoriaHeader}>
                <MaterialCommunityIcons name={cat.icon as any} size={20} color={Colors.primary} />
                <Text style={styles.categoriaTitulo}>{cat.titulo}</Text>
              </View>
              <View style={styles.pecasGrid}>
                {cat.itens.map((item) => {
                  const checked = pecasSelecionadas.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.pecaChip, checked && styles.pecaChipSelected]}
                      onPress={() => togglePeca(item)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={checked ? '#fff' : Colors.disabled}
                      />
                      <Text style={[styles.pecaChipText, checked && styles.pecaChipTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Outras Pecas */}
          <Text style={styles.sectionTitle}>Outras Pecas (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ex: Rolamento do eixo, mangueira..."
            placeholderTextColor={Colors.disabled}
            value={outrasPecas}
            onChangeText={setOutrasPecas}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          {/* Observacoes */}
          <Text style={styles.sectionTitle}>Observacoes (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Detalhes adicionais sobre a manutencao..."
            placeholderTextColor={Colors.disabled}
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Salvar */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="check-circle" size={28} color="#fff" />
            <Text style={styles.saveButtonText}>
              {saving ? 'SALVANDO...' : 'REGISTRAR MANUTENCAO'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-off" size={64} color={Colors.disabled} />
              <Text style={styles.emptyText}>Nenhuma manutencao registrada</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.histCard}>
              <View style={styles.histHeader}>
                <View style={[styles.histBadge, { backgroundColor: item.tipo_manutencao === 'preventiva' ? Colors.successLight : Colors.errorLight }]}>
                  <MaterialCommunityIcons
                    name={item.tipo_manutencao === 'preventiva' ? 'shield-check' : 'alert-circle'}
                    size={16}
                    color={item.tipo_manutencao === 'preventiva' ? Colors.success : Colors.error}
                  />
                  <Text style={[styles.histBadgeText, { color: item.tipo_manutencao === 'preventiva' ? Colors.success : Colors.error }]}>
                    {item.tipo_manutencao === 'preventiva' ? 'Preventiva' : 'Corretiva'}
                  </Text>
                </View>
                <Text style={styles.histDate}>{formatDate(item.data_manutencao || item.data_hora)}</Text>
              </View>
              <Text style={styles.histMaquina}>{item.maquina_nome || `Maquina #${item.maquina_id}`}</Text>
              {item.operador ? <Text style={styles.histOperador}>Operador: {item.operador}</Text> : null}
              {item.horimetro_momento != null && (
                <Text style={styles.histHorimetro}>
                  Horimetro: {item.horimetro_momento} {item.unidade_horimetro || 'h'}
                </Text>
              )}
              {item.pecas_trocadas && item.pecas_trocadas.length > 0 && (
                <View style={styles.histPecas}>
                  {item.pecas_trocadas.map((p, i) => (
                    <View key={i} style={styles.histPecaTag}>
                      <Text style={styles.histPecaTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {item.outras_pecas ? <Text style={styles.histOutras}>Outras: {item.outras_pecas}</Text> : null}
              {item.observacoes ? <Text style={styles.histObs}>{item.observacoes}</Text> : null}
              <Text style={styles.histColaborador}>Por: {item.colaborador_nome || `#${item.colaborador_id}`}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surface, padding: Spacing.sm,
    gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, gap: Spacing.xs,
    backgroundColor: Colors.background,
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium, color: Colors.primary },
  tabTextActive: { color: '#fff' },

  sectionTitle: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold,
    color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  dateText: { flex: 1, fontSize: Fonts.sizeLarge, color: Colors.text, fontWeight: Fonts.weightMedium },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  pickerSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pickerSelectedText: { fontSize: Fonts.sizeMedium, color: Colors.text, fontWeight: Fonts.weightMedium },
  pickerPlaceholder: { fontSize: Fonts.sizeMedium, color: Colors.disabled },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: Spacing.xs,
  },
  modalItemSelected: { backgroundColor: Colors.primary },
  modalItemText: { fontSize: Fonts.sizeMedium, color: Colors.text, fontWeight: Fonts.weightMedium },
  modalClose: {
    marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background,
  },
  modalCloseText: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },

  horimetroRow: { gap: Spacing.sm },
  unitToggle: { flexDirection: 'row', gap: Spacing.sm },
  unitBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  unitBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitBtnText: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium, color: Colors.textSecondary },
  unitBtnTextActive: { color: '#fff' },
  horimetroInput: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  unitLabel: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary, fontWeight: Fonts.weightMedium },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  inputField: {
    flex: 1, paddingVertical: Spacing.md, fontSize: Fonts.sizeMedium, color: Colors.text,
  },

  tipoRow: { flexDirection: 'row', gap: Spacing.sm },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, gap: Spacing.sm,
  },
  tipoBtnCorretiva: { backgroundColor: Colors.error, borderColor: Colors.error },
  tipoBtnPreventiva: { backgroundColor: Colors.success, borderColor: Colors.success },
  tipoBtnText: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },

  categoriaBlock: { marginBottom: Spacing.md },
  categoriaHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  categoriaTitulo: {
    fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold, color: Colors.primaryLight,
  },
  pecasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pecaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pecaChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pecaChipText: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  pecaChipTextSelected: { color: '#fff', fontWeight: Fonts.weightMedium },

  textArea: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, fontSize: Fonts.sizeMedium, color: Colors.text,
    minHeight: 70,
  },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4, marginTop: Spacing.xl, gap: Spacing.sm, elevation: 3,
  },
  saveButtonText: {
    fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold, color: '#fff', letterSpacing: 1,
  },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: Fonts.sizeMedium, color: Colors.disabled },

  histCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, elevation: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  histHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs,
  },
  histBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
  },
  histBadgeText: { fontSize: Fonts.sizeSmall, fontWeight: Fonts.weightBold },
  histDate: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  histMaquina: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text, marginBottom: 2 },
  histOperador: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  histHorimetro: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary },
  histPecas: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.xs },
  histPecaTag: {
    backgroundColor: Colors.successLight, paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  histPecaTagText: { fontSize: 12, color: Colors.success, fontWeight: Fonts.weightMedium },
  histOutras: { fontSize: Fonts.sizeSmall, color: Colors.accent, marginTop: 2 },
  histObs: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  histColaborador: { fontSize: 12, color: Colors.disabled, marginTop: Spacing.xs },

  dateInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.md },
  dateInputGroup: { flex: 1, alignItems: 'center' },
  dateInputLabel: { fontSize: Fonts.sizeSmall, color: Colors.textSecondary, marginBottom: 4 },
  dateInput: {
    width: '100%', textAlign: 'center', fontSize: Fonts.sizeLarge, fontWeight: Fonts.weightBold,
    color: Colors.text, backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  dateSep: { fontSize: Fonts.sizeXLarge, color: Colors.disabled, marginBottom: Spacing.sm },
  dateModalBtns: { flexDirection: 'row', gap: Spacing.sm },
});
