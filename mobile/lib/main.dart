import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'services/api_client/api_client.dart';
import 'services/auth_service.dart';
import 'services/secure_storage_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

// Adjust for actual emulator/device access
// Android emulator typically uses 10.0.2.2 for localhost
const String kApiBaseUrl = 'http://10.0.2.2:8000/api/v1';

void main() {
  final storageService = SecureStorageService();
  final apiClient = ApiClient(
    baseUrl: kApiBaseUrl,
    storageService: storageService,
  );

  runApp(
    MultiProvider(
      providers: [
        Provider<SecureStorageService>.value(value: storageService),
        Provider<ApiClient>.value(value: apiClient),
        ChangeNotifierProvider<AuthService>(
          create: (_) => AuthService(
            apiClient: apiClient,
            storageService: storageService,
          ),
        ),
      ],
      child: const NadikMobileApp(),
    ),
  );
}

class NadikMobileApp extends StatelessWidget {
  const NadikMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nadik Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const RootScreen(),
    );
  }
}

class RootScreen extends StatelessWidget {
  const RootScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();

    if (authService.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (authService.isAuthenticated) {
      return const DashboardScreen();
    } else {
      return const LoginScreen();
    }
  }
}
