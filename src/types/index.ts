export type UserProfile = 'admin' | 'colaborador';

export interface User {
  id: number;
  nome: string;
  login: string;
  perfil: UserProfile;
  whatsapp: string;
  foto_url: string | null;
  ativo: boolean;
}

export interface Maquina {
  id: number;
  nome: string;
  tipo: string;
  numero_serie: string | null;
  foto_url: string | null;
  intervalo_revisao_horas: number | null;
  intervalo_revisao_dias: number | null;
  horimetro_atual: number | null;
  data_ultima_revisao: string | null;
  ativo: boolean;
}

export interface Propriedade {
  id: number;
  nome: string;
  diesel_litros: number;
  ativo: boolean;
}

export interface Abastecimento {
  id: number;
  maquina_id: number;
  colaborador_id: number;
  propriedade_id: number;
  litros: number;
  horimetro_momento: number | null;
  outros_descricao: string | null;
  foto_url: string | null;
  data_hora: string;
  sincronizado: boolean;
}

export type TipoManutencao = 'corretiva' | 'preventiva';

export interface Revisao {
  id: number;
  maquina_id: number;
  colaborador_id: number;
  descricao: string;
  tipo_manutencao: TipoManutencao;
  pecas_trocadas: string[];
  outras_pecas: string | null;
  horimetro_momento: number | null;
  unidade_horimetro: 'horas' | 'km';
  operador: string | null;
  foto_url: string | null;
  data_hora: string;
  data_manutencao: string;
  observacoes: string | null;
  sincronizado: boolean;
}

