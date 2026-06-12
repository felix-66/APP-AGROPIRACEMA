import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, runTransaction, limit,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, UserProfile, Maquina, Abastecimento, Revisao, Propriedade } from '../types';

// ===================== CACHE =====================

let _maquinasCache: Maquina[] | null = null;
let _maquinasCacheTime = 0;
let _colabCache: User[] | null = null;
let _colabCacheTime = 0;
let _propCache: Propriedade[] | null = null;
let _propCacheTime = 0;
const CACHE_TTL = 60000;

function invalidateMaquinasCache() { _maquinasCache = null; }
function invalidateColabCache() { _colabCache = null; }
function invalidatePropCache() { _propCache = null; }

// ===================== HELPERS =====================

const SALT = 'agrocontrol_salt_2024';

function hashPassword(password: string): string {
  let hash = 0;
  const str = password + SALT;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

async function getNextId(col: string): Promise<number> {
  const counterRef = doc(db, '_counters', 'ids');
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const data = snap.exists() ? snap.data() : {};
    const next = (data[col] || 0) + 1;
    tx.set(counterRef, { ...data, [col]: next });
    return next;
  });
}

// ===================== INIT / SEED =====================

let _initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  const q = query(collection(db, 'usuarios'), where('login', '==', 'admin'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    const counterRef = doc(db, '_counters', 'ids');
    await setDoc(counterRef, {
      usuarios: 1, maquinas: 0, abastecimentos: 0, revisoes: 0, propriedades: 0,
    });
    await setDoc(doc(db, 'usuarios', '1'), {
      id: 1, nome: 'Administrador', login: 'admin',
      senha_hash: hashPassword('admin123'), perfil: 'admin',
      whatsapp: '', foto_url: null, ativo: 1,
    });
  }
}

// ===================== AUTENTICACAO =====================

export async function authenticateUser(login: string, password: string): Promise<User | null> {
  await initializeDatabase();
  const q = query(
    collection(db, 'usuarios'),
    where('login', '==', login),
    where('ativo', '==', 1),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  if (d.senha_hash !== hashPassword(password)) return null;
  return { id: d.id, nome: d.nome, login: d.login, perfil: d.perfil as UserProfile, whatsapp: d.whatsapp || '', foto_url: d.foto_url, ativo: true };
}

export async function getUserById(userId: number): Promise<User | null> {
  await initializeDatabase();
  const snap = await getDoc(doc(db, 'usuarios', userId.toString()));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (d.ativo !== 1) return null;
  return { id: d.id, nome: d.nome, login: d.login, perfil: d.perfil as UserProfile, whatsapp: d.whatsapp || '', foto_url: d.foto_url, ativo: true };
}

// ===================== PROPRIEDADES =====================

export async function getAllPropriedades(): Promise<Propriedade[]> {
  if (_propCache && Date.now() - _propCacheTime < CACHE_TTL) return _propCache;
  const q = query(collection(db, 'propriedades'), where('ativo', '==', 1));
  const snap = await getDocs(q);
  _propCache = snap.docs.map(s => {
    const d = s.data();
    return { id: d.id, nome: d.nome, diesel_litros: d.diesel_litros ?? 0, ativo: true };
  });
  _propCacheTime = Date.now();
  return _propCache;
}

export async function getPropriedadeById(id: number): Promise<Propriedade | null> {
  const snap = await getDoc(doc(db, 'propriedades', id.toString()));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { id: d.id, nome: d.nome, diesel_litros: d.diesel_litros ?? 0, ativo: !!d.ativo };
}

export async function createPropriedade(nome: string): Promise<number> {
  invalidatePropCache();
  const id = await getNextId('propriedades');
  await setDoc(doc(db, 'propriedades', id.toString()), {
    id, nome, diesel_litros: 0, ativo: 1,
  });
  return id;
}

export async function updatePropriedade(id: number, nome: string): Promise<void> {
  invalidatePropCache();
  await updateDoc(doc(db, 'propriedades', id.toString()), { nome });
}

export async function deactivatePropriedade(id: number): Promise<void> {
  invalidatePropCache();
  await updateDoc(doc(db, 'propriedades', id.toString()), { ativo: 0 });
}

// ===================== ESTOQUE DIESEL (por propriedade) =====================

export async function getEstoqueDiesel(propriedadeId?: number): Promise<number> {
  if (propriedadeId) {
    const snap = await getDoc(doc(db, 'propriedades', propriedadeId.toString()));
    if (!snap.exists()) return 0;
    return snap.data().diesel_litros ?? 0;
  }
  const props = await getAllPropriedades();
  return props.reduce((s, p) => s + p.diesel_litros, 0);
}

export async function setEstoqueDiesel(propriedadeId: number, litros: number): Promise<void> {
  invalidatePropCache();
  await updateDoc(doc(db, 'propriedades', propriedadeId.toString()), { diesel_litros: litros });
}

export async function getHistoricoEstoque(propriedadeId?: number): Promise<{ data_hora: string; litros_antes: number; litros_depois: number; tipo: string; descricao: string; propriedade_id?: number }[]> {
  const snap = await getDocs(collection(db, 'estoque_historico'));
  let items = snap.docs.map(s => s.data() as any);
  if (propriedadeId) {
    items = items.filter(h => h.propriedade_id === propriedadeId);
  }
  return items.sort((a: any, b: any) => b.data_hora.localeCompare(a.data_hora));
}

export async function registrarMovimentoEstoque(propriedadeId: number, litros_antes: number, litros_depois: number, tipo: string, descricao: string) {
  const id = await getNextId('estoque_historico');
  await setDoc(doc(db, 'estoque_historico', id.toString()), {
    id, propriedade_id: propriedadeId, data_hora: new Date().toISOString(),
    litros_antes, litros_depois, tipo, descricao,
  });
}

// ===================== COLABORADORES =====================

export async function getAllColaboradores(): Promise<User[]> {
  if (_colabCache && Date.now() - _colabCacheTime < CACHE_TTL) return _colabCache;
  const q = query(collection(db, 'usuarios'), where('perfil', '==', 'colaborador'), where('ativo', '==', 1));
  const snap = await getDocs(q);
  _colabCache = snap.docs.map((s) => {
    const d = s.data();
    return { id: d.id, nome: d.nome, login: d.login, perfil: d.perfil as UserProfile, whatsapp: d.whatsapp || '', foto_url: d.foto_url, ativo: true };
  });
  _colabCacheTime = Date.now();
  return _colabCache;
}

export async function createColaborador(nome: string, login: string, senha: string, whatsapp: string): Promise<number> {
  invalidateColabCache();
  const id = await getNextId('usuarios');
  await setDoc(doc(db, 'usuarios', id.toString()), {
    id, nome, login, senha_hash: hashPassword(senha), perfil: 'colaborador', whatsapp, foto_url: null, ativo: 1,
  });
  return id;
}

export async function updateColaborador(id: number, nome: string, login: string, whatsapp: string, senha?: string): Promise<void> {
  invalidateColabCache();
  const data: any = { nome, login, whatsapp };
  if (senha) data.senha_hash = hashPassword(senha);
  await updateDoc(doc(db, 'usuarios', id.toString()), data);
}

export async function deactivateColaborador(id: number): Promise<void> {
  invalidateColabCache();
  await updateDoc(doc(db, 'usuarios', id.toString()), { ativo: 0 });
}

// ===================== MAQUINAS =====================

export async function getAllMaquinas(): Promise<Maquina[]> {
  if (_maquinasCache && Date.now() - _maquinasCacheTime < CACHE_TTL) return _maquinasCache;
  const q = query(collection(db, 'maquinas'), where('ativo', '==', 1));
  const snap = await getDocs(q);
  _maquinasCache = snap.docs.map((s) => {
    const d = s.data();
    return {
      id: d.id, nome: d.nome, tipo: d.tipo, numero_serie: d.numero_serie, foto_url: d.foto_url,
      intervalo_revisao_horas: d.intervalo_revisao_horas, intervalo_revisao_dias: d.intervalo_revisao_dias,
      horimetro_atual: d.horimetro_atual, data_ultima_revisao: d.data_ultima_revisao, ativo: true,
    };
  });
  _maquinasCacheTime = Date.now();
  return _maquinasCache;
}

export async function getMaquinaById(id: number): Promise<Maquina | null> {
  const snap = await getDoc(doc(db, 'maquinas', id.toString()));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: d.id, nome: d.nome, tipo: d.tipo, numero_serie: d.numero_serie, foto_url: d.foto_url,
    intervalo_revisao_horas: d.intervalo_revisao_horas, intervalo_revisao_dias: d.intervalo_revisao_dias,
    horimetro_atual: d.horimetro_atual, data_ultima_revisao: d.data_ultima_revisao, ativo: !!d.ativo,
  };
}

export async function createMaquina(data: {
  nome: string; tipo: string; numero_serie?: string; foto_url?: string;
  intervalo_revisao_horas?: number; intervalo_revisao_dias?: number;
}): Promise<number> {
  invalidateMaquinasCache();
  const id = await getNextId('maquinas');
  await setDoc(doc(db, 'maquinas', id.toString()), {
    id, nome: data.nome, tipo: data.tipo, numero_serie: data.numero_serie ?? null,
    foto_url: data.foto_url ?? null, intervalo_revisao_horas: data.intervalo_revisao_horas ?? null,
    intervalo_revisao_dias: data.intervalo_revisao_dias ?? null, horimetro_atual: 0,
    data_ultima_revisao: null, ativo: 1,
  });
  return id;
}

export async function updateMaquina(id: number, data: {
  nome: string; tipo: string; numero_serie?: string; foto_url?: string;
  intervalo_revisao_horas?: number; intervalo_revisao_dias?: number;
}): Promise<void> {
  invalidateMaquinasCache();
  await updateDoc(doc(db, 'maquinas', id.toString()), {
    nome: data.nome, tipo: data.tipo, numero_serie: data.numero_serie ?? null,
    intervalo_revisao_horas: data.intervalo_revisao_horas ?? null,
    intervalo_revisao_dias: data.intervalo_revisao_dias ?? null,
  });
}

export async function deactivateMaquina(id: number): Promise<void> {
  invalidateMaquinasCache();
  await updateDoc(doc(db, 'maquinas', id.toString()), { ativo: 0 });
}

export function getMaquinaStatus(maquina: Maquina): 'em_dia' | 'proxima' | 'atrasada' {
  if (maquina.intervalo_revisao_horas && maquina.horimetro_atual != null) {
    const hoursUntilRevision = maquina.intervalo_revisao_horas - (maquina.horimetro_atual % maquina.intervalo_revisao_horas);
    if (hoursUntilRevision <= 0) return 'atrasada';
    if (hoursUntilRevision <= maquina.intervalo_revisao_horas * 0.1) return 'proxima';
    return 'em_dia';
  }
  if (maquina.intervalo_revisao_dias && maquina.data_ultima_revisao) {
    const lastDate = new Date(maquina.data_ultima_revisao);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= maquina.intervalo_revisao_dias) return 'atrasada';
    if (diffDays >= maquina.intervalo_revisao_dias * 0.9) return 'proxima';
    return 'em_dia';
  }
  return 'em_dia';
}

// ===================== ABASTECIMENTOS =====================

export async function createAbastecimento(data: {
  maquina_id: number; colaborador_id: number; propriedade_id: number; litros: number;
  horimetro_momento?: number; unidade_horimetro?: 'horas' | 'km'; outros_descricao?: string;
}): Promise<number> {
  const dataHora = new Date().toISOString();
  const id = await getNextId('abastecimentos');
  await setDoc(doc(db, 'abastecimentos', id.toString()), {
    id, maquina_id: data.maquina_id, colaborador_id: data.colaborador_id,
    propriedade_id: data.propriedade_id,
    litros: data.litros, horimetro_momento: data.horimetro_momento ?? null,
    unidade_horimetro: data.unidade_horimetro ?? 'horas',
    outros_descricao: data.outros_descricao ?? null,
    foto_url: null, data_hora: dataHora, sincronizado: 1,
  });
  if (data.horimetro_momento && data.maquina_id > 0) {
    await updateDoc(doc(db, 'maquinas', data.maquina_id.toString()), { horimetro_atual: data.horimetro_momento });
  }
  const estoqueAtual = await getEstoqueDiesel(data.propriedade_id);
  const novoEstoque = Math.max(0, estoqueAtual - data.litros);
  await setEstoqueDiesel(data.propriedade_id, novoEstoque);
  await registrarMovimentoEstoque(data.propriedade_id, estoqueAtual, novoEstoque, 'saida', `Abastecimento #${id} - ${data.litros}L`);
  return id;
}

export async function getAbastecimentosHoje(): Promise<Abastecimento[]> {
  const hoje = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'abastecimentos'), where('data_hora', '>=', hoje), where('data_hora', '<=', hoje + '￿'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => s.data() as Abastecimento);
}

export async function getAllAbastecimentos(): Promise<(Abastecimento & { maquina_nome?: string; colaborador_nome?: string; propriedade_nome?: string })[]> {
  const snap = await getDocs(collection(db, 'abastecimentos'));
  const maquinas = await getAllMaquinas();
  const colabs = await getAllColaboradores();
  const props = await getAllPropriedades();
  const admSnap = await getDocs(query(collection(db, 'usuarios'), where('perfil', '==', 'admin')));
  const allUsers = [...colabs, ...admSnap.docs.map(d => d.data() as User)];
  return snap.docs.map((s) => {
    const d = s.data();
    const maqNome = d.maquina_id === 0
      ? `Outros: ${d.outros_descricao || 'N/A'}`
      : maquinas.find((m) => m.id === d.maquina_id)?.nome;
    return {
      ...d as Abastecimento,
      maquina_nome: maqNome,
      colaborador_nome: allUsers.find((u) => u.id === d.colaborador_id)?.nome,
      propriedade_nome: props.find((p) => p.id === d.propriedade_id)?.nome,
    };
  }).sort((a, b) => b.data_hora.localeCompare(a.data_hora));
}

export async function getLitrosHoje(): Promise<number> {
  const registros = await getAbastecimentosHoje();
  return registros.reduce((sum, a) => sum + a.litros, 0);
}

// ===================== REVISOES =====================

export async function createRevisao(data: {
  maquina_id: number; colaborador_id: number;
  tipo_manutencao: 'corretiva' | 'preventiva';
  pecas_trocadas: string[];
  outras_pecas?: string;
  horimetro_momento?: number;
  unidade_horimetro?: 'horas' | 'km';
  operador?: string;
  data_manutencao: string;
  observacoes?: string;
}): Promise<number> {
  const dataHora = new Date().toISOString();
  const id = await getNextId('revisoes');
  const descricao = `Manutencao ${data.tipo_manutencao} - ${data.pecas_trocadas.join(', ')}${data.outras_pecas ? ', ' + data.outras_pecas : ''}`;
  await setDoc(doc(db, 'revisoes', id.toString()), {
    id, maquina_id: data.maquina_id, colaborador_id: data.colaborador_id,
    descricao,
    tipo_manutencao: data.tipo_manutencao,
    pecas_trocadas: data.pecas_trocadas,
    outras_pecas: data.outras_pecas ?? null,
    horimetro_momento: data.horimetro_momento ?? null,
    unidade_horimetro: data.unidade_horimetro ?? 'horas',
    operador: data.operador ?? null,
    foto_url: null, data_hora: dataHora,
    data_manutencao: data.data_manutencao,
    observacoes: data.observacoes ?? null, sincronizado: 1,
  });
  const maquinaUpdate: any = { data_ultima_revisao: dataHora };
  if (data.horimetro_momento) maquinaUpdate.horimetro_atual = data.horimetro_momento;
  await updateDoc(doc(db, 'maquinas', data.maquina_id.toString()), maquinaUpdate);
  return id;
}

export async function getRevisoesHoje(): Promise<Revisao[]> {
  const hoje = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'revisoes'), where('data_hora', '>=', hoje), where('data_hora', '<=', hoje + '￿'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => s.data() as Revisao);
}

export async function getAllRevisoes(): Promise<(Revisao & { maquina_nome?: string; colaborador_nome?: string })[]> {
  const snap = await getDocs(collection(db, 'revisoes'));
  const maquinas = await getAllMaquinas();
  const colabs = await getAllColaboradores();
  const admSnap = await getDocs(query(collection(db, 'usuarios'), where('perfil', '==', 'admin')));
  const allUsers = [...colabs, ...admSnap.docs.map(d => d.data() as User)];
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      ...d as Revisao,
      maquina_nome: maquinas.find((m) => m.id === d.maquina_id)?.nome,
      colaborador_nome: allUsers.find((u) => u.id === d.colaborador_id)?.nome,
    };
  }).sort((a, b) => b.data_hora.localeCompare(a.data_hora));
}
