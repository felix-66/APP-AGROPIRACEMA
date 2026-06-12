import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getAllAbastecimentos, getAllRevisoes, getAllMaquinas,
  getHistoricoEstoque, getAllColaboradores, getAllPropriedades,
} from '../../src/database/database';
import { Abastecimento, Revisao, Maquina, User, Propriedade } from '../../src/types';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

let Print: any = null;
let Sharing: any = null;
if (Platform.OS !== 'web') {
  Print = require('expo-print');
  Sharing = require('expo-sharing');
}

type Periodo = 'hoje' | '7dias' | '30dias' | 'tudo';

function filterByPeriod<T extends { data_hora: string }>(items: T[], periodo: Periodo): T[] {
  if (periodo === 'tudo') return items;
  const now = new Date();
  let cutoff: Date;
  if (periodo === 'hoje') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (periodo === '7dias') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return items.filter(i => new Date(i.data_hora) >= cutoff);
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}
function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

type AbastFull = Abastecimento & { maquina_nome?: string; colaborador_nome?: string; propriedade_nome?: string };
type RevisaoFull = Revisao & { maquina_nome?: string; colaborador_nome?: string };
type HistoricoItem = { data_hora: string; litros_antes: number; litros_depois: number; tipo: string; descricao: string; propriedade_id?: number };

export default function RelatoriosScreen() {
  const [periodo, setPeriodo] = useState<Periodo>('7dias');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<number | null>(null);
  const [abastecimentos, setAbastecimentos] = useState<AbastFull[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoFull[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [colaboradores, setColaboradores] = useState<User[]>([]);
  const [historicoEstoque, setHistoricoEstoque] = useState<HistoricoItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    const [ab, rev, maq, col, props, hist] = await Promise.all([
      getAllAbastecimentos(),
      getAllRevisoes(),
      getAllMaquinas(),
      getAllColaboradores(),
      getAllPropriedades(),
      getHistoricoEstoque(),
    ]);
    setAbastecimentos(ab);
    setRevisoes(rev);
    setMaquinas(maq);
    setColaboradores(col);
    setPropriedades(props);
    setHistoricoEstoque(hist);
    setLoading(false);
  }

  const abByProp = selectedPropId
    ? abastecimentos.filter(a => a.propriedade_id === selectedPropId)
    : abastecimentos;
  const histByProp = selectedPropId
    ? historicoEstoque.filter(h => h.propriedade_id === selectedPropId)
    : historicoEstoque;

  const abFiltered = filterByPeriod(abByProp, periodo);
  const revFiltered = filterByPeriod(revisoes, periodo);
  const histFiltered = filterByPeriod(histByProp, periodo);

  const selectedProp = selectedPropId ? propriedades.find(p => p.id === selectedPropId) : null;
  const estoque = selectedProp
    ? selectedProp.diesel_litros
    : propriedades.reduce((s, p) => s + p.diesel_litros, 0);

  const totalLitros = abFiltered.reduce((s, a) => s + a.litros, 0);
  const totalAbastecimentos = abFiltered.length;
  const totalRevisoes = revFiltered.length;

  const entradasDiesel = histFiltered.filter(h => h.tipo === 'entrada');
  const totalEntrada = entradasDiesel.reduce((s, h) => s + (h.litros_depois - h.litros_antes), 0);
  const totalSaida = histFiltered.filter(h => h.tipo === 'saida').reduce((s, h) => s + (h.litros_antes - h.litros_depois), 0);

  const consumoPorMaquina: Record<number, { nome: string; litros: number; count: number }> = {};
  abFiltered.forEach(a => {
    if (!consumoPorMaquina[a.maquina_id]) {
      consumoPorMaquina[a.maquina_id] = { nome: a.maquina_nome || `#${a.maquina_id}`, litros: 0, count: 0 };
    }
    consumoPorMaquina[a.maquina_id].litros += a.litros;
    consumoPorMaquina[a.maquina_id].count += 1;
  });

  const consumoPorOperador: Record<string, { nome: string; litros: number; count: number }> = {};
  abFiltered.forEach(a => {
    const key = a.colaborador_nome || `#${a.colaborador_id}`;
    if (!consumoPorOperador[key]) {
      consumoPorOperador[key] = { nome: key, litros: 0, count: 0 };
    }
    consumoPorOperador[key].litros += a.litros;
    consumoPorOperador[key].count += 1;
  });

  const consumoPorDia: Record<string, { litros: number; count: number }> = {};
  abFiltered.forEach(a => {
    const dia = formatDate(a.data_hora);
    if (!consumoPorDia[dia]) consumoPorDia[dia] = { litros: 0, count: 0 };
    consumoPorDia[dia].litros += a.litros;
    consumoPorDia[dia].count += 1;
  });
  const diasConsumo = Object.entries(consumoPorDia).sort((a, b) => {
    const da = a[0].split('/').reverse().join('-');
    const db2 = b[0].split('/').reverse().join('-');
    return db2.localeCompare(da);
  });

  const revPorTipo = {
    preventiva: revFiltered.filter(r => r.tipo_manutencao === 'preventiva').length,
    corretiva: revFiltered.filter(r => r.tipo_manutencao === 'corretiva').length,
  };

  const periodoLabel = periodo === 'hoje' ? 'Hoje' : periodo === '7dias' ? '7 dias' : periodo === '30dias' ? '30 dias' : 'Tudo';
  const propLabel = selectedProp ? selectedProp.nome : 'Todas as Propriedades';

  function buildFullHtml() {
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const maqRows = Object.values(consumoPorMaquina).map(m =>
      `<tr><td>${m.nome}</td><td>${m.litros.toFixed(1)}L</td><td>${m.count}</td><td>${m.count > 0 ? (m.litros / m.count).toFixed(1) : 0}L</td></tr>`
    ).join('');

    const opRows = Object.values(consumoPorOperador).map(o =>
      `<tr><td>${o.nome}</td><td>${o.litros.toFixed(1)}L</td><td>${o.count}</td><td>${o.count > 0 ? (o.litros / o.count).toFixed(1) : 0}L</td></tr>`
    ).join('');

    const diaRows = diasConsumo.map(([dia, d]) =>
      `<tr><td>${dia}</td><td>${d.litros.toFixed(1)}L</td><td>${d.count}</td></tr>`
    ).join('');

    const abRows = abFiltered.slice(0, 100).map(a =>
      `<tr><td>${formatDateTime(a.data_hora)}</td><td>${a.maquina_nome || '-'}</td><td>${a.colaborador_nome || '-'}</td><td>${a.propriedade_nome || '-'}</td><td>${a.litros}L</td><td>${a.horimetro_momento != null ? a.horimetro_momento + ((a as any).unidade_horimetro === 'km' ? 'km' : 'h') : '-'}</td></tr>`
    ).join('');

    const revRows = revFiltered.slice(0, 100).map(r =>
      `<tr><td>${formatDate(r.data_manutencao || r.data_hora)}</td><td>${r.maquina_nome || '-'}</td><td>${r.tipo_manutencao || '-'}</td><td>${r.operador || r.colaborador_nome || '-'}</td><td>${(r.pecas_trocadas || []).join(', ') || r.descricao}</td><td>${r.observacoes || '-'}</td></tr>`
    ).join('');

    const estRows = histFiltered.slice(0, 50).map(h =>
      `<tr><td>${formatDateTime(h.data_hora)}</td><td style="color:${h.tipo === 'saida' ? '#D32F2F' : h.tipo === 'entrada' ? '#388E3C' : '#F57C00'}">${h.tipo}</td><td>${h.descricao}</td><td>${h.litros_antes.toFixed(0)}L</td><td>${h.litros_depois.toFixed(0)}L</td></tr>`
    ).join('');

    const maqListRows = maquinas.map(m =>
      `<tr><td>${m.nome}</td><td>${m.tipo}</td><td>${m.horimetro_atual ?? 0}h</td><td>${m.numero_serie || '-'}</td></tr>`
    ).join('');

    const colListRows = colaboradores.map(c =>
      `<tr><td>${c.nome}</td><td>${c.login}</td><td>${c.whatsapp || '-'}</td></tr>`
    ).join('');

    const mediaDia = diasConsumo.length > 0 ? (totalLitros / diasConsumo.length).toFixed(1) : '0';

    const propEstoqueRows = propriedades.map(p =>
      `<tr><td>${p.nome}</td><td style="color:${p.diesel_litros <= 0 ? '#D32F2F' : p.diesel_litros < 200 ? '#F57C00' : '#388E3C'};font-weight:bold">${p.diesel_litros.toFixed(0)}L</td></tr>`
    ).join('');

    return `<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:16px;color:#333;background:#fff;font-size:13px}
      .header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1B5E20;padding-bottom:15px}
      .header h1{color:#1B5E20;font-size:24px}
      .header p{color:#666;font-size:12px;margin-top:4px}
      .periodo{text-align:center;color:#888;margin-bottom:15px;font-size:12px}
      .stats{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
      .stat{flex:1;min-width:80px;background:#f5f5f5;border-radius:8px;padding:12px;text-align:center}
      .stat .val{font-size:24px;font-weight:bold;color:#333}
      .stat .lbl{font-size:10px;color:#666;margin-top:2px}
      .stat.orange{background:#FFF3E0} .stat.green{background:#E8F5E9} .stat.blue{background:#E3F2FD} .stat.red{background:#FFEBEE}
      h2{font-size:16px;color:#1B5E20;margin:20px 0 8px;border-bottom:2px solid #1B5E20;padding-bottom:4px}
      h3{font-size:13px;color:#555;margin:10px 0 6px}
      table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px}
      th{background:#1B5E20;color:#fff;padding:6px 4px;text-align:left;font-size:11px}
      td{padding:5px 4px;border-bottom:1px solid #eee}
      tr:nth-child(even){background:#f9f9f9}
      .total-row{background:#E8F5E9!important;font-weight:bold}
      .section-box{background:#f9f9f9;border-radius:8px;padding:12px;margin-bottom:12px}
      .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:2px solid #1B5E20;color:#aaa;font-size:10px}
      @media print{body{padding:0}.no-print{display:none!important}}
    </style></head><body>
    <div class="header"><h1>AgroControl</h1><p>Relatorio Completo - ${propLabel}</p></div>
    <div class="periodo">${dataAtual} | Periodo: ${periodoLabel}</div>

    <div class="stats">
      <div class="stat orange"><div class="val">${totalLitros.toFixed(0)}</div><div class="lbl">Litros Consumidos</div></div>
      <div class="stat green"><div class="val">${totalAbastecimentos}</div><div class="lbl">Abastecimentos</div></div>
      <div class="stat blue"><div class="val">${totalRevisoes}</div><div class="lbl">Manutencoes</div></div>
      <div class="stat" style="background:#E8EAF6"><div class="val">${estoque.toFixed(0)}</div><div class="lbl">Estoque Atual (L)</div></div>
    </div>

    <h2>Estoque de Diesel por Propriedade</h2>
    <table><tr><th>Propriedade</th><th>Estoque</th></tr>${propEstoqueRows}</table>

    <h2>Estoque de Diesel</h2>
    <div class="section-box">
      <p><strong>Estoque atual (${propLabel}):</strong> ${estoque.toFixed(0)}L</p>
      <p><strong>Total entrada no periodo:</strong> +${totalEntrada.toFixed(0)}L (${entradasDiesel.length} recargas)</p>
      <p><strong>Total saida no periodo:</strong> -${totalSaida.toFixed(0)}L</p>
      <p><strong>Media consumo/dia:</strong> ${mediaDia}L</p>
    </div>
    ${histFiltered.length > 0 ? `
    <h3>Movimentacoes de Estoque</h3>
    <table><tr><th>Data/Hora</th><th>Tipo</th><th>Descricao</th><th>Antes</th><th>Depois</th></tr>${estRows}</table>
    ` : ''}

    <h2>Consumo por Maquina</h2>
    <table><tr><th>Maquina</th><th>Total</th><th>Abast.</th><th>Media</th></tr>${maqRows || '<tr><td colspan="4">Sem dados</td></tr>'}</table>

    <h2>Consumo por Operador</h2>
    <table><tr><th>Operador</th><th>Total</th><th>Abast.</th><th>Media</th></tr>${opRows || '<tr><td colspan="4">Sem dados</td></tr>'}</table>

    <h2>Consumo por Dia</h2>
    <table><tr><th>Data</th><th>Litros</th><th>Abast.</th></tr>${diaRows || '<tr><td colspan="3">Sem dados</td></tr>'}
    ${diasConsumo.length > 0 ? `<tr class="total-row"><td>Media/dia</td><td>${mediaDia}L</td><td>${(totalAbastecimentos / diasConsumo.length).toFixed(1)}</td></tr>` : ''}
    </table>

    <h2>Abastecimentos Detalhados (${abFiltered.length})</h2>
    <table><tr><th>Data/Hora</th><th>Maquina</th><th>Operador</th><th>Propriedade</th><th>Litros</th><th>Horim.</th></tr>${abRows || '<tr><td colspan="6">Sem dados</td></tr>'}</table>

    <h2>Manutencoes (${revFiltered.length})</h2>
    <div class="section-box">
      <p><strong>Preventivas:</strong> ${revPorTipo.preventiva} | <strong>Corretivas:</strong> ${revPorTipo.corretiva}</p>
    </div>
    <table><tr><th>Data</th><th>Maquina</th><th>Tipo</th><th>Operador</th><th>Pecas/Servicos</th><th>Obs.</th></tr>${revRows || '<tr><td colspan="6">Sem dados</td></tr>'}</table>

    <h2>Maquinas Cadastradas (${maquinas.length})</h2>
    <table><tr><th>Nome</th><th>Tipo</th><th>Horimetro</th><th>N. Serie</th></tr>${maqListRows || '<tr><td colspan="4">Sem dados</td></tr>'}</table>

    <h2>Colaboradores Ativos (${colaboradores.length})</h2>
    <table><tr><th>Nome</th><th>Login</th><th>WhatsApp</th></tr>${colListRows || '<tr><td colspan="3">Sem dados</td></tr>'}</table>

    <div class="footer">Gerado por AgroControl &bull; ${new Date().toLocaleString('pt-BR')}</div>
    </body></html>`;
  }

  async function exportPdf() {
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const html = buildFullHtml();
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
        else Alert.alert('Erro', 'Permita pop-ups no navegador.');
      } else {
        const { uri } = await Print.printToFileAsync({ html: buildFullHtml() });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Relatorio PDF' });
        } else Alert.alert('PDF gerado', `Arquivo salvo em:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao gerar PDF');
    } finally { setExporting(false); }
  }

  async function exportHtml() {
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const html = buildFullHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-agrocontrol-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { uri } = await Print.printToFileAsync({ html: buildFullHtml() });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Relatorio' });
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao exportar');
    } finally { setExporting(false); }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Propriedade Filter */}
      {propriedades.length > 0 && (
        <>
          <Text style={styles.filterLabel}>Propriedade</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propScroll}>
            <View style={styles.propRow}>
              <TouchableOpacity
                style={[styles.propChip, selectedPropId === null && styles.propChipActive]}
                onPress={() => setSelectedPropId(null)}
              >
                <MaterialCommunityIcons name="view-grid" size={16}
                  color={selectedPropId === null ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.propChipText, selectedPropId === null && styles.propChipTextActive]}>
                  Todas
                </Text>
              </TouchableOpacity>
              {propriedades.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.propChip, selectedPropId === p.id && styles.propChipActive]}
                  onPress={() => setSelectedPropId(p.id)}
                >
                  <MaterialCommunityIcons name="barn" size={16}
                    color={selectedPropId === p.id ? '#fff' : Colors.textSecondary} />
                  <Text style={[styles.propChipText, selectedPropId === p.id && styles.propChipTextActive]}>
                    {p.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Periodo */}
      <View style={styles.periodoRow}>
        {(['hoje', '7dias', '30dias', 'tudo'] as Periodo[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodoBtn, periodo === p && styles.periodoBtnActive]}
            onPress={() => setPeriodo(p)}
          >
            <Text style={[styles.periodoText, periodo === p && styles.periodoTextActive]}>
              {p === 'hoje' ? 'Hoje' : p === '7dias' ? '7d' : p === '30dias' ? '30d' : 'Tudo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Export */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#C62828' }]} onPress={exportPdf} disabled={exporting}>
          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
          <Text style={styles.exportBtnText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#1565C0' }]} onPress={exportHtml} disabled={exporting}>
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={styles.exportBtnText}>Baixar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo Geral */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.warningLight }]}>
          <MaterialCommunityIcons name="gas-station" size={22} color={Colors.accentDark} />
          <Text style={styles.statValue}>{totalLitros.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Consumidos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.successLight }]}>
          <MaterialCommunityIcons name="counter" size={22} color={Colors.success} />
          <Text style={styles.statValue}>{totalAbastecimentos}</Text>
          <Text style={styles.statLabel}>Abastec.</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <MaterialCommunityIcons name="wrench" size={22} color="#1565C0" />
          <Text style={styles.statValue}>{totalRevisoes}</Text>
          <Text style={styles.statLabel}>Manut.</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8EAF6' }]}>
          <MaterialCommunityIcons name="fuel" size={22} color="#5C6BC0" />
          <Text style={styles.statValue}>{estoque.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Estoque</Text>
        </View>
      </View>

      {/* Estoque por Propriedade */}
      {!selectedProp && propriedades.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Estoque por Propriedade</Text>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Propriedade</Text>
              <Text style={styles.th}>Estoque</Text>
            </View>
            {propriedades.map((p, i) => {
              const color = p.diesel_litros <= 0 ? Colors.error : p.diesel_litros < 200 ? Colors.warning : Colors.success;
              return (
                <View key={p.id} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
                  <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{p.nome}</Text>
                  <Text style={[styles.td, { fontWeight: '700', color }]}>{p.diesel_litros.toFixed(0)}L</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Estoque de Diesel */}
      <Text style={styles.sectionTitle}>Estoque de Diesel{selectedProp ? ` - ${selectedProp.nome}` : ''}</Text>
      <View style={styles.estoqueResumo}>
        <View style={styles.estoqueRow}>
          <View style={[styles.estoqueStat, { backgroundColor: Colors.successLight }]}>
            <MaterialCommunityIcons name="arrow-up-circle" size={20} color={Colors.success} />
            <Text style={[styles.estoqueStatVal, { color: Colors.success }]}>+{totalEntrada.toFixed(0)}L</Text>
            <Text style={styles.estoqueStatLbl}>{entradasDiesel.length} entradas</Text>
          </View>
          <View style={[styles.estoqueStat, { backgroundColor: Colors.errorLight }]}>
            <MaterialCommunityIcons name="arrow-down-circle" size={20} color={Colors.error} />
            <Text style={[styles.estoqueStatVal, { color: Colors.error }]}>-{totalSaida.toFixed(0)}L</Text>
            <Text style={styles.estoqueStatLbl}>saidas</Text>
          </View>
          <View style={[styles.estoqueStat, { backgroundColor: '#E8EAF6' }]}>
            <MaterialCommunityIcons name="fuel" size={20} color="#5C6BC0" />
            <Text style={[styles.estoqueStatVal, { color: '#5C6BC0' }]}>{estoque.toFixed(0)}L</Text>
            <Text style={styles.estoqueStatLbl}>atual</Text>
          </View>
        </View>
      </View>
      {histFiltered.length > 0 && (
        <>
          <Text style={styles.subTitle}>Movimentacoes ({histFiltered.length})</Text>
          {histFiltered.slice(0, 10).map((h, i) => (
            <View key={i} style={[styles.itemCard, {
              borderLeftColor: h.tipo === 'saida' ? Colors.error : h.tipo === 'entrada' ? Colors.success : Colors.accent,
            }]}>
              <View style={styles.itemRow}>
                <MaterialCommunityIcons
                  name={h.tipo === 'saida' ? 'arrow-down-circle' : h.tipo === 'entrada' ? 'arrow-up-circle' : 'pencil-circle'}
                  size={18}
                  color={h.tipo === 'saida' ? Colors.error : h.tipo === 'entrada' ? Colors.success : Colors.accent}
                />
                <Text style={styles.itemTitle}>{h.descricao}</Text>
                <Text style={styles.itemDate}>{formatDateTime(h.data_hora)}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>{h.litros_antes.toFixed(0)}L → {h.litros_depois.toFixed(0)}L</Text>
              </View>
            </View>
          ))}
          {histFiltered.length > 10 && <Text style={styles.moreText}>+{histFiltered.length - 10} movimentacoes (veja no PDF)</Text>}
        </>
      )}

      {/* Consumo por Maquina */}
      <Text style={styles.sectionTitle}>Consumo por Maquina</Text>
      {Object.keys(consumoPorMaquina).length === 0 ? (
        <Text style={styles.emptyText}>Sem dados no periodo</Text>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Maquina</Text>
            <Text style={styles.th}>Total</Text>
            <Text style={styles.th}>Qtd</Text>
            <Text style={styles.th}>Media</Text>
          </View>
          {Object.values(consumoPorMaquina).map((m, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
              <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{m.nome}</Text>
              <Text style={[styles.td, { color: Colors.accentDark }]}>{m.litros.toFixed(0)}L</Text>
              <Text style={styles.td}>{m.count}x</Text>
              <Text style={styles.td}>{m.count > 0 ? (m.litros / m.count).toFixed(1) : 0}L</Text>
            </View>
          ))}
        </View>
      )}

      {/* Consumo por Operador */}
      <Text style={styles.sectionTitle}>Consumo por Operador</Text>
      {Object.keys(consumoPorOperador).length === 0 ? (
        <Text style={styles.emptyText}>Sem dados no periodo</Text>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Operador</Text>
            <Text style={styles.th}>Total</Text>
            <Text style={styles.th}>Qtd</Text>
            <Text style={styles.th}>Media</Text>
          </View>
          {Object.values(consumoPorOperador).map((o, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
              <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{o.nome}</Text>
              <Text style={[styles.td, { color: Colors.accentDark }]}>{o.litros.toFixed(0)}L</Text>
              <Text style={styles.td}>{o.count}x</Text>
              <Text style={styles.td}>{o.count > 0 ? (o.litros / o.count).toFixed(1) : 0}L</Text>
            </View>
          ))}
        </View>
      )}

      {/* Consumo por Dia */}
      <Text style={styles.sectionTitle}>Consumo por Dia</Text>
      {diasConsumo.length === 0 ? (
        <Text style={styles.emptyText}>Sem dados no periodo</Text>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Data</Text>
            <Text style={styles.th}>Litros</Text>
            <Text style={styles.th}>Abast.</Text>
          </View>
          {diasConsumo.map(([dia, d], i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
              <Text style={[styles.td, { flex: 2 }]}>{dia}</Text>
              <Text style={[styles.td, { fontWeight: '700', color: Colors.accentDark }]}>{d.litros.toFixed(1)}L</Text>
              <Text style={styles.td}>{d.count}x</Text>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>Media/dia</Text>
            <Text style={[styles.td, { fontWeight: '700', color: Colors.primary }]}>
              {(totalLitros / diasConsumo.length).toFixed(1)}L
            </Text>
            <Text style={[styles.td, { fontWeight: '700', color: Colors.primary }]}>
              {(totalAbastecimentos / diasConsumo.length).toFixed(1)}x
            </Text>
          </View>
        </View>
      )}

      {/* Abastecimentos */}
      <Text style={styles.sectionTitle}>Abastecimentos ({abFiltered.length})</Text>
      {abFiltered.length === 0 ? (
        <Text style={styles.emptyText}>Sem abastecimentos no periodo</Text>
      ) : (
        abFiltered.slice(0, 20).map((a) => (
          <View key={a.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <MaterialCommunityIcons name="gas-station" size={18} color={Colors.accent} />
              <Text style={styles.itemTitle}>{a.litros}L</Text>
              <Text style={styles.itemDate}>{formatDateTime(a.data_hora)}</Text>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemDetail}>Maquina: {a.maquina_nome || '-'}</Text>
              <Text style={styles.itemDetail}>Operador: {a.colaborador_nome || '-'}</Text>
              {a.propriedade_nome && <Text style={styles.itemDetail}>Propriedade: {a.propriedade_nome}</Text>}
              {a.horimetro_momento != null && (
                <Text style={styles.itemDetail}>Horimetro: {a.horimetro_momento}{(a as any).unidade_horimetro === 'km' ? 'km' : 'h'}</Text>
              )}
            </View>
          </View>
        ))
      )}
      {abFiltered.length > 20 && <Text style={styles.moreText}>+{abFiltered.length - 20} registros (veja no PDF)</Text>}

      {/* Manutencoes */}
      <Text style={styles.sectionTitle}>Manutencoes ({revFiltered.length})</Text>
      {revFiltered.length > 0 && (
        <View style={styles.tipoRow}>
          <View style={[styles.tipoBadge, { backgroundColor: Colors.successLight }]}>
            <MaterialCommunityIcons name="shield-check" size={14} color={Colors.success} />
            <Text style={[styles.tipoBadgeText, { color: Colors.success }]}>Preventivas: {revPorTipo.preventiva}</Text>
          </View>
          <View style={[styles.tipoBadge, { backgroundColor: Colors.errorLight }]}>
            <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.error} />
            <Text style={[styles.tipoBadgeText, { color: Colors.error }]}>Corretivas: {revPorTipo.corretiva}</Text>
          </View>
        </View>
      )}
      {revFiltered.length === 0 ? (
        <Text style={styles.emptyText}>Sem manutencoes no periodo</Text>
      ) : (
        revFiltered.slice(0, 20).map((r) => (
          <View key={r.id} style={[styles.itemCard, { borderLeftColor: r.tipo_manutencao === 'preventiva' ? Colors.success : Colors.error }]}>
            <View style={styles.itemRow}>
              <MaterialCommunityIcons
                name={r.tipo_manutencao === 'preventiva' ? 'shield-check' : 'alert-circle'}
                size={18}
                color={r.tipo_manutencao === 'preventiva' ? Colors.success : Colors.error}
              />
              <Text style={styles.itemTitle}>{r.tipo_manutencao === 'preventiva' ? 'Preventiva' : 'Corretiva'}</Text>
              <Text style={styles.itemDate}>{formatDate(r.data_manutencao || r.data_hora)}</Text>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemDetail}>Maquina: {r.maquina_nome || '-'}</Text>
              {r.operador && <Text style={styles.itemDetail}>Operador: {r.operador}</Text>}
              <Text style={styles.itemDetail}>Responsavel: {r.colaborador_nome || '-'}</Text>
              {r.horimetro_momento != null && (
                <Text style={styles.itemDetail}>Horimetro: {r.horimetro_momento} {r.unidade_horimetro || 'h'}</Text>
              )}
              {r.pecas_trocadas && r.pecas_trocadas.length > 0 && (
                <View style={styles.tagsRow}>
                  {r.pecas_trocadas.map((p, j) => (
                    <View key={j} style={styles.tag}>
                      <Text style={styles.tagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {r.outras_pecas && <Text style={styles.itemDetail}>Outras: {r.outras_pecas}</Text>}
              {r.observacoes && <Text style={[styles.itemDetail, { fontStyle: 'italic' }]}>{r.observacoes}</Text>}
            </View>
          </View>
        ))
      )}
      {revFiltered.length > 20 && <Text style={styles.moreText}>+{revFiltered.length - 20} registros (veja no PDF)</Text>}

      {/* Maquinas */}
      <Text style={styles.sectionTitle}>Maquinas Ativas ({maquinas.length})</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Nome</Text>
          <Text style={styles.th}>Tipo</Text>
          <Text style={styles.th}>Horim.</Text>
        </View>
        {maquinas.map((m, i) => (
          <View key={m.id} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
            <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{m.nome}</Text>
            <Text style={styles.td}>{m.tipo}</Text>
            <Text style={styles.td}>{m.horimetro_atual ?? 0}h</Text>
          </View>
        ))}
      </View>

      {/* Colaboradores */}
      <Text style={styles.sectionTitle}>Colaboradores Ativos ({colaboradores.length})</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Nome</Text>
          <Text style={styles.th}>Login</Text>
        </View>
        {colaboradores.map((c, i) => (
          <View key={c.id} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
            <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{c.nome}</Text>
            <Text style={styles.td}>{c.login}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footerText}>
        Gerado por AgroControl • {new Date().toLocaleString('pt-BR')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: Fonts.sizeMedium, color: Colors.textSecondary },

  filterLabel: {
    fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium,
    color: Colors.textSecondary, marginBottom: Spacing.xs,
  },
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

  periodoRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  periodoBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  periodoBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodoText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium, color: Colors.textSecondary },
  periodoTextActive: { color: '#fff' },

  exportRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, gap: Spacing.xs, elevation: 2,
  },
  exportBtnText: { fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold, color: '#fff' },

  statsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 70, borderRadius: BorderRadius.md, padding: Spacing.sm,
    alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

  sectionTitle: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold,
    color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingBottom: Spacing.xs,
  },
  subTitle: {
    fontSize: Fonts.sizeBase, fontWeight: Fonts.weightMedium,
    color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xs,
  },

  estoqueResumo: { marginBottom: Spacing.sm },
  estoqueRow: { flexDirection: 'row', gap: Spacing.xs },
  estoqueStat: {
    flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm,
    alignItems: 'center', gap: 2,
  },
  estoqueStatVal: { fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightBold },
  estoqueStatLbl: { fontSize: 10, color: Colors.textSecondary },

  tipoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tipoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full,
  },
  tipoBadgeText: { fontSize: Fonts.sizeSmall, fontWeight: Fonts.weightBold },

  tableCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    overflow: 'hidden', elevation: 1,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  th: { flex: 1, fontSize: 12, fontWeight: Fonts.weightBold, color: '#fff' },
  tableRow: {
    flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  tableFooter: {
    flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.successLight, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  td: { flex: 1, fontSize: 13, color: Colors.text },

  itemCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2, marginBottom: Spacing.xs, elevation: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.accent,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  itemTitle: { flex: 1, fontSize: Fonts.sizeBase, fontWeight: Fonts.weightBold, color: Colors.text },
  itemDate: { fontSize: 12, color: Colors.textSecondary },
  itemDetails: { paddingLeft: 26, gap: 2 },
  itemDetail: { fontSize: 13, color: Colors.textSecondary },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { backgroundColor: Colors.successLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 11, color: Colors.success, fontWeight: Fonts.weightMedium },

  emptyText: { fontSize: Fonts.sizeBase, color: Colors.disabled, textAlign: 'center', paddingVertical: Spacing.md },
  moreText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.sm },
  footerText: {
    fontSize: Fonts.sizeSmall, color: Colors.disabled,
    textAlign: 'center', marginTop: Spacing.xl,
  },
});
