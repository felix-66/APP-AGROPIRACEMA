import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors, Fonts, Spacing, BorderRadius } from '../src/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim()) {
      Alert.alert('Atenção', 'Digite seu usuário.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Atenção', 'Digite sua senha.');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim().toLowerCase(), password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Não foi possível fazer login.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="tractor-variant"
              size={64}
              color={Colors.textOnPrimary}
            />
          </View>
          <Text style={styles.appName}>AgroControl</Text>
          <Text style={styles.subtitle}>Gestão Rural Inteligente</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Usuário</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Digite seu usuário"
              placeholderTextColor={Colors.disabled}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="lock"
              size={24}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor={Colors.disabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="login"
                  size={24}
                  color={Colors.textOnPrimary}
                />
                <Text style={styles.loginButtonText}>ENTRAR</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.accentLight,
  },
  appName: {
    fontSize: Fonts.sizeTitle,
    fontWeight: Fonts.weightBold,
    color: Colors.textOnPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Fonts.sizeBase,
    color: Colors.accentLight,
    marginTop: Spacing.xs,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  label: {
    fontSize: Fonts.sizeMedium,
    fontWeight: Fonts.weightMedium,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Fonts.sizeMedium,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: Fonts.sizeLarge,
    fontWeight: Fonts.weightBold,
    color: Colors.textOnPrimary,
    letterSpacing: 1,
  },
  version: {
    textAlign: 'center',
    color: Colors.accentLight,
    marginTop: Spacing.lg,
    fontSize: Fonts.sizeSmall,
  },
});
