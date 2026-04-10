/**
 * AuthScreen V5 – Premium Authentication Experience
 * Comparable to Airbnb, Google, Apple sign-in flows
 */

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TextInput as RNTextInput,
  Animated,
  Easing,
  StatusBar,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme/colors";
import { authService } from "@/services/auth";
import { PressableScale } from "@/components/UI/PressableScale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type AuthMode = "login" | "signup" | "forgot";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score === 2) return { score, label: "Fair", color: "#F59E0B" };
  if (score === 3) return { score, label: "Good", color: "#10B981" };
  return { score, label: "Strong", color: "#059669" };
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

interface AnimatedLogoProps {
  onAnimationEnd?: () => void;
}

const AnimatedLogo = memo(({ onAnimationEnd }: AnimatedLogoProps) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(-30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start(() => onAnimationEnd?.());
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-30, 0],
    outputRange: ["-30deg", "0deg"],
  });

  return (
    <Animated.View
      style={[
        styles.logoContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { rotate }, { scale: pulseAnim }],
        },
      ]}
    >
      <View style={styles.logoCircle}>
        <LinearGradient
          colors={["#667EEA", "#764BA2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <MaterialCommunityIcons name="airplane" size={42} color="#FFF" />
        </LinearGradient>
      </View>
      <Text style={styles.logoText}>Time To Travel</Text>
      <Text style={styles.logoTagline}>Your AI Travel Companion</Text>
    </Animated.View>
  );
});
AnimatedLogo.displayName = "AnimatedLogo";

// ─────────────────────────────────────────────────────────────

interface SocialLoginButtonProps {
  provider: "google" | "apple";
  onPress: () => void;
  loading?: boolean;
}

const SocialLoginButton = memo(({ provider, onPress, loading }: SocialLoginButtonProps) => {
  const isGoogle = provider === "google";

  return (
    <PressableScale
      style={[styles.socialButton, isGoogle ? styles.googleButton : styles.appleButton]}
      onPress={onPress}
      disabled={loading}
    >
      {isGoogle ? (
        <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
      ) : (
        <MaterialCommunityIcons name="apple" size={22} color="#000" />
      )}
      <Text style={[styles.socialButtonText, isGoogle ? styles.googleText : styles.appleText]}>
        Continue with {isGoogle ? "Google" : "Apple"}
      </Text>
    </PressableScale>
  );
});
SocialLoginButton.displayName = "SocialLoginButton";

// ─────────────────────────────────────────────────────────────

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = memo(({ password }: PasswordStrengthMeterProps) => {
  const strength = getPasswordStrength(password);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: (strength.score / 5) * 100,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [strength.score]);

  if (!password) return null;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        <Animated.View
          style={[styles.strengthFill, { width: widthAnim, backgroundColor: strength.color }]}
        />
      </View>
      <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
    </View>
  );
});
PasswordStrengthMeter.displayName = "PasswordStrengthMeter";

// ─────────────────────────────────────────────────────────────

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  icon: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "visible-password";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  isPasswordVisible?: boolean;
}

const FormInput = memo(
  ({
    label,
    value,
    onChangeText,
    error,
    icon,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    showPasswordToggle,
    onTogglePassword,
    isPasswordVisible,
  }: FormInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (error) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }
    }, [error]);

    return (
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          label={label}
          value={value}
          onChangeText={onChangeText}
          mode="outlined"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={styles.input}
          outlineColor={isFocused ? "#667EEA" : "#E2E8F0"}
          activeOutlineColor="#667EEA"
          error={!!error}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          left={<TextInput.Icon icon={icon} color={isFocused ? "#667EEA" : "#94A3B8"} />}
          right={
            showPasswordToggle ? (
              <TextInput.Icon
                icon={isPasswordVisible ? "eye-off" : "eye"}
                onPress={onTogglePassword}
                color="#94A3B8"
              />
            ) : undefined
          }
          theme={{ colors: { onSurfaceVariant: "#64748B" } }}
        />
        {error && <Text style={styles.inputError}>{error}</Text>}
      </Animated.View>
    );
  }
);
FormInput.displayName = "FormInput";

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.3)).current;

  // Animate form when mode changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (mode === "signup") {
      if (!formData.name.trim()) {
        newErrors.name = "Name is required";
      } else if (formData.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (mode === "signup") {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (!acceptedTerms) {
        setServerError("Please accept the Terms of Service and Privacy Policy");
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode, acceptedTerms]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setServerError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await authService.register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        await authService.login({
          email: formData.email.trim(),
          password: formData.password,
        });
      }
    } catch (err: any) {
      setServerError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formData, mode, validateForm]);

  // Handle social login
  const handleSocialLogin = useCallback(async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    setServerError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setServerError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon!`);
    } catch (err: any) {
      setServerError(err.message || `${provider} login failed`);
    } finally {
      setSocialLoading(null);
    }
  }, []);

  // Handle forgot password
  const handleForgotPassword = useCallback(async () => {
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setServerError("Password reset link sent to your email!");
      setTimeout(() => setMode("login"), 2000);
    } catch (err: any) {
      setServerError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }, [formData.email]);

  // Update form field
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }, []);

  // Reset form when mode changes
  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setServerError(null);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#667EEA", "#764BA2", "#0F172A"]}
        locations={[0, 0.5, 1]}
        style={styles.gradientBg}
      />

      {/* Decorative Circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <AnimatedLogo />

          {/* Form Card */}
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {mode === "login" && "Welcome Back"}
                {mode === "signup" && "Create Account"}
                {mode === "forgot" && "Reset Password"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {mode === "login" && "Sign in to continue your journey"}
                {mode === "signup" && "Start your AI-powered travel experience"}
                {mode === "forgot" && "We will send you a reset link"}
              </Text>
            </View>

            {/* Social Login Buttons */}
            {mode !== "forgot" && (
              <View style={styles.socialContainer}>
                <SocialLoginButton
                  provider="google"
                  onPress={() => handleSocialLogin("google")}
                  loading={socialLoading === "google"}
                />
                <SocialLoginButton
                  provider="apple"
                  onPress={() => handleSocialLogin("apple")}
                  loading={socialLoading === "apple"}
                />
              </View>
            )}

            {/* Divider */}
            {mode !== "forgot" && (
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Name Input (Signup only) */}
              {mode === "signup" && (
                <FormInput
                  label="Full Name"
                  value={formData.name}
                  onChangeText={(v) => updateField("name", v)}
                  error={errors.name}
                  icon="account"
                  autoCapitalize="words"
                />
              )}

              {/* Email Input */}
              <FormInput
                label="Email Address"
                value={formData.email}
                onChangeText={(v) => updateField("email", v)}
                error={errors.email}
                icon="email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Password Input (Not for forgot) */}
              {mode !== "forgot" && (
                <>
                  <FormInput
                    label="Password"
                    value={formData.password}
                    onChangeText={(v) => updateField("password", v)}
                    error={errors.password}
                    icon="lock"
                    secureTextEntry
                    showPasswordToggle
                    isPasswordVisible={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />
                  {mode === "signup" && formData.password && (
                    <PasswordStrengthMeter password={formData.password} />
                  )}
                </>
              )}

              {/* Confirm Password (Signup only) */}
              {mode === "signup" && (
                <FormInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(v) => updateField("confirmPassword", v)}
                  error={errors.confirmPassword}
                  icon="lock-check"
                  secureTextEntry
                  showPasswordToggle
                  isPasswordVisible={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              )}

              {/* Terms Checkbox (Signup only) */}
              {mode === "signup" && (
                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && (
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => Linking.openURL("https://example.com/terms")}
                    >
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => Linking.openURL("https://example.com/privacy")}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}

              {/* Forgot Password Link (Login only) */}
              {mode === "login" && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => switchMode("forgot")}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Server Error */}
              {serverError && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons
                    name={serverError.includes("sent") ? "check-circle" : "alert-circle"}
                    size={18}
                    color={serverError.includes("sent") ? "#10B981" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.errorText,
                      { color: serverError.includes("sent") ? "#10B981" : "#EF4444" },
                    ]}
                  >
                    {serverError}
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <Button
                mode="contained"
                onPress={mode === "forgot" ? handleForgotPassword : handleSubmit}
                loading={loading}
                disabled={loading || (mode === "signup" && !acceptedTerms)}
                style={styles.submitButton}
                contentStyle={styles.submitContent}
                buttonColor="#667EEA"
                labelStyle={styles.submitLabel}
              >
                {mode === "login" && "Sign In"}
                {mode === "signup" && "Create Account"}
                {mode === "forgot" && "Send Reset Link"}
              </Button>

              {/* Mode Switcher */}
              <View style={styles.modeSwitcher}>
                <Text style={styles.modeText}>
                  {mode === "login" && "Do not have an account?"}
                  {mode === "signup" && "Already have an account?"}
                  {mode === "forgot" && "Remember your password?"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    switchMode(mode === "login" ? "signup" : mode === "signup" ? "login" : "login")
                  }
                >
                  <Text style={styles.modeLink}>
                    {mode === "login" && "Sign Up"}
                    {mode === "signup" && "Sign In"}
                    {mode === "forgot" && "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  flex: {
    flex: 1,
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(102, 126, 234, 0.3)",
  },
  decorCircle2: {
    position: "absolute",
    top: 200,
    left: -150,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(118, 75, 162, 0.2)",
  },
  decorCircle3: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(102, 126, 234, 0.15)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 1.5,
  },

  // Logo
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: spacing.md,
    shadowColor: "#667EEA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    fontWeight: "500",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 16,
  },
  cardHeader: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  // Social Buttons
  socialContainer: {
    gap: 12,
    marginBottom: spacing.md,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  appleButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  googleText: {
    color: "#0F172A",
  },
  appleText: {
    color: "#0F172A",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 12,
    color: "#94A3B8",
    marginHorizontal: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Form
  formContainer: {
    marginTop: spacing.sm,
  },
  input: {
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 8,
    marginLeft: 4,
  },

  // Password Strength
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: -4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 10,
    width: 50,
  },

  // Terms
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    marginRight: 10,
    marginTop: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#667EEA",
    borderColor: "#667EEA",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  termsLink: {
    color: "#667EEA",
    fontWeight: "600",
  },

  // Forgot Link
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: spacing.md,
  },
  forgotText: {
    fontSize: 13,
    color: "#667EEA",
    fontWeight: "600",
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  // Submit Button
  submitButton: {
    borderRadius: 16,
    marginTop: spacing.xs,
  },
  submitContent: {
    paddingVertical: 8,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Mode Switcher
  modeSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
    gap: 6,
  },
  modeText: {
    fontSize: 14,
    color: "#64748B",
  },
  modeLink: {
    fontSize: 14,
    color: "#667EEA",
    fontWeight: "700",
  },
});