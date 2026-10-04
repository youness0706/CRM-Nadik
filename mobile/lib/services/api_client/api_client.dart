import 'dart:convert';
import 'package:http/http.dart' as http;
import '../secure_storage_service.dart';

class ApiClient {
  final String baseUrl;
  final SecureStorageService _storageService;

  ApiClient({
    required this.baseUrl,
    required SecureStorageService storageService,
  }) : _storageService = storageService;

  Future<Map<String, String>> _getHeaders({bool requireAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requireAuth) {
      final token = await _storageService.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<http.Response> get(String endpoint, {bool requireAuth = true}) async {
    return _request(
      () async => http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
      ),
      requireAuth,
    );
  }

  Future<http.Response> post(String endpoint, {Map<String, dynamic>? body, bool requireAuth = true}) async {
    return _request(
      () async => http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
        body: body != null ? jsonEncode(body) : null,
      ),
      requireAuth,
    );
  }

  Future<http.Response> _request(Future<http.Response> Function() requestFunc, bool requireAuth) async {
    var response = await requestFunc();

    if (response.statusCode == 401 && requireAuth) {
      final refreshed = await _attemptRefresh();
      if (refreshed) {
        // Retry original request
        response = await requestFunc();
      }
    }
    return response;
  }

  Future<bool> _attemptRefresh() async {
    final refreshToken = await _storageService.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storageService.saveTokens(
          accessToken: data['access'],
          refreshToken: data['refresh'] ?? refreshToken, // sometimes refresh isn't rotated
        );
        return true;
      } else {
        await _storageService.clearTokens();
        return false;
      }
    } catch (e) {
      return false;
    }
  }
}
