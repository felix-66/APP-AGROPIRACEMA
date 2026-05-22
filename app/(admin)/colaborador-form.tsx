import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createColaborador, updateColaborador, getUserById } from '../../src/database/database';
import { Colors, Fonts, Spacing, BorderRadius } from '../../src/constants/theme';

export default function ColaboradorFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) loadColaborador();
  }, [id]);

  async function loadColaborador() {
    const user = await getUserById(Number(id));
    if (user) {
      setNome(user.nome);
      setLogin(user.login);
      setWhatsapp(user.whatsapp);
    }
  }

  async function handleSave() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Digite o nome completo.');
      return;
    }
    if (!login.trim()) {
      Alert.alert('Atenção', 'Digite o login.');
      return;
    }
    if (!isEditing && !senha.trim()) {
      Alert.alert('Atenção', 'Digite a senha.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateColaborador(
          Number(id),
          nome.trim(),
          login.trim().toLowerCase(),
          whatsapp.trim(),
          senha.trim() || undefined
        );
      } else {
        await createColaborador(
          nome.trim(),
          login.trim().toLowerCase(),
          senha.trim(),
          whatsapp.trim()
        );
      }

      Alert.alert(
        'Sucesso',
        isEditing ? 'Colaborador atualizado!' : 'Colaborador cadastrado!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Verifique se o login já existe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={64} color={Colors.textOnPrimary} />
        </View>
      </View>

      <Text style={styles.label}>Nome Completo *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: João da Silva"
        placeholderTextColor={Colors.disabled}
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Login *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: joao"
        placeholderTextColor={Colors.disabled}
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>
        {isEditing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={isEditing ? 'Deixe vazio para manter a atual' : 'Digite a senha'}
        placeholderTextColor={Colors.disabled}
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <Text style={styles.label}>WhatsApp</Text>
      <View style={styles.whatsappInput}>
        <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
        <TextInput
          style={styles.whatsappField}
          placeholder="Ex: 5511999999999"
          placeholderTextColor={Colors.disabled}
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
      </View>

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
  avatarContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  label: {
    fontSize: Fonts.sizeMedium, fontWeight: Fonts.weightMedium,
    color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, fontSize: Fonts.sizeMedium, color: Colors.text,
  },
  whatsappInput: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  whatsappField: {
    flex: 1, paddingVertical: Spacing.md, fontSize: Fonts.sizeMedium, color: Colors.text,
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
