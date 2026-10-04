import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import 'api_client/api_client.dart';
import 'secure_storage_service.dart';

class AuthService extends ChangeNotifier {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  UserModel? _currentUser;
  bool _isLoading = true;

  AuthService({
    required ApiClient apiClient,
    required SecureStorageService storageService,
  })  : _apiClient = apiClient,
        _storageService = storageService {
    _init();
  }

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;

  Future<void> _init() async {
    final token = await _storageService.getAccessToken();
    if (token != null) {
      await fetchMe();
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    try {
      final response = await _apiClient.post(
        '/auth/login/',
        body: {'username': username, 'password': password},
        requireAuth: false,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storageService.saveTokens(
          accessToken: data['access'],
          refreshToken: data['refresh'],
        );
        await fetchMe();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> fetchMe() async {
    try {
      final response = await _apiClient.get('/auth/me/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _currentUser = UserModel.fromJson(data);
        notifyListeners();
      } else {
        await logout();
      }
    } catch (e) {
      await logout();
    }
  }

  Future<void> logout() async {
    try {
      final refresh = await _storageService.getRefreshToken();
      if (refresh != null) {
        await _apiClient.post('/auth/logout/', body: {'refresh': refresh});
      }
    } catch (e) {
      // Ignore errors on logout
    } finally {
      await _storageService.clearTokens();
      _currentUser = null;
      notifyListeners();
    }
  }
}
