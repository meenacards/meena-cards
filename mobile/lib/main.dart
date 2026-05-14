import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/home_screen.dart';
import 'screens/catalog_screen.dart';
import 'screens/product_detail_screen.dart';
import 'screens/admin_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/favorites_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/add_edit_product_screen.dart';
import 'screens/contact_screen.dart';
import 'screens/privacy_policy_screen.dart';
import 'screens/terms_conditions_screen.dart';
import 'models/card_model.dart';
import 'providers/favorites_provider.dart';
import 'utils/config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
      ],
      child: const MeenaCardsApp(),
    ),
  );
}

class MeenaCardsApp extends StatelessWidget {
  const MeenaCardsApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: '/splash',
      refreshListenable: Provider.of<AuthProvider>(context, listen: false),
      redirect: (context, state) {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        final isAuth = auth.isAuthenticated;
        final isSplash = state.matchedLocation == '/splash';
        final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register';

        if (isSplash) return null;
        if (!isAuth && !loggingIn) return '/login';
        if (isAuth && loggingIn) return '/';
        
        return null;
      },
      routes: [
        GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
        GoRoute(
          path: '/', 
          builder: (context, state) => Consumer<AuthProvider>(
            builder: (context, auth, _) => auth.isAdmin ? const AdminScreen() : const HomeScreen()
          )
        ),
        GoRoute(
          path: '/catalog', 
          builder: (context, state) => CatalogScreen(
            initialCategory: state.uri.queryParameters['category'],
            searchQuery: state.uri.queryParameters['search']
          )
        ),
        GoRoute(path: '/favorites', builder: (context, state) => const FavoritesScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        GoRoute(path: '/product/:id', builder: (context, state) => ProductDetailScreen(cardId: state.pathParameters['id']!)),
        GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
        GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
        GoRoute(path: '/admin/product', builder: (context, state) => AddEditProductScreen(card: state.extra as CardModel?)),
        GoRoute(path: '/contact', builder: (context, state) => const ContactScreen()),
        GoRoute(path: '/privacy', builder: (context, state) => const PrivacyPolicyScreen()),
        GoRoute(path: '/terms', builder: (context, state) => const TermsConditionsScreen()),
      ],
    );

    return MaterialApp.router(
      routerConfig: router,
      title: 'Meena Cards',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: Color(0xFFFDFBF0),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3A0303),
          primary: const Color(0xFF3A0303),
          surface: Color(0xFFFDFBF0),
        ),
        textTheme: GoogleFonts.outfitTextTheme(),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          backgroundColor: Color(0xFF3A0303),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          iconTheme: IconThemeData(color: Color(0xFFFDFBF0)),
          titleTextStyle: TextStyle(color: Color(0xFFFDFBF0), fontSize: 18, fontWeight: FontWeight.bold)
        ),
        // ... rest of the theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF3A0303),
            foregroundColor: Color(0xFFFDFBF0),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    );
  }
}
