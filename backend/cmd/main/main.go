package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"Tugas_Akhir/backend/internal/auth"
	"Tugas_Akhir/backend/internal/config"
	"Tugas_Akhir/backend/internal/dashboard"
	"Tugas_Akhir/backend/internal/database"
	"Tugas_Akhir/backend/internal/products"
	"Tugas_Akhir/backend/internal/purchases"
	"Tugas_Akhir/backend/internal/sales"
	"Tugas_Akhir/backend/internal/services"
	"Tugas_Akhir/backend/internal/stock"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// allowedOrigins membaca daftar origin frontend yang diizinkan dari
// variabel lingkungan CORS_ORIGINS (dipisah koma). Jika kosong,
// dipakai alamat development yang umum.
//
// Contoh di .env:
//
//	CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
func allowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
	if raw == "" {
		return []string{
			"http://localhost:5500",
			"http://127.0.0.1:5500",
			"http://localhost:3000",
			"http://localhost:5173",
		}
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))

	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}

	return origins
}

func main() {
	// 1. Membaca konfigurasi aplikasi.
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// 2. Menghubungkan aplikasi ke PostgreSQL.
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 3. Memastikan nama database yang digunakan backend.
	var dbName string
	err = db.QueryRow(
		context.Background(),
		"SELECT current_database()",
	).Scan(&dbName)

	if err != nil {
		log.Fatal("Gagal membaca nama database: ", err)
	}

	log.Println("Database aktif:", dbName)
	log.Println("Berhasil terhubung ke PostgreSQL!")

	// 4. Memeriksa migrasi database.
	if err := database.Migrate(db); err != nil {
		log.Fatal("Migration gagal: ", err)
	}

	log.Println("Migration berhasil diperiksa!")

	// 5. Membuat router Gin.
	router := gin.Default()

	if err := router.SetTrustedProxies(nil); err != nil {
		log.Fatal("Gagal mengatur trusted proxies: ", err)
	}

	// CORS: mengizinkan frontend yang berjalan di origin berbeda
	// untuk memanggil API ini. Harus dipasang sebelum route apa pun.
	router.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins(),
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
		},
		MaxAge: 12 * time.Hour,
	}))

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":   "Tugas_Akhir API",
			"status": "running",
		})
	})

	router.GET("/health", func(c *gin.Context) {
		if err := db.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":   "unhealthy",
				"database": "disconnected",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy",
			"database": "connected",
		})
	})

	// 6. Membuat grup API.
	api := router.Group("/api")

	// 7. Inisialisasi autentikasi.
	authRepo := auth.NewRepository(db)
	authHandler := auth.NewHandler(authRepo, cfg.JWTSecret)

	// Register dan login tetap publik.
	auth.RegisterRoutes(api.Group("/auth"), authHandler)

	// 8. Grup privat: seluruh route di bawahnya wajib memiliki JWT.
	private := api.Group("")
	private.Use(auth.AuthMiddleware(cfg.JWTSecret))

	// Data pengguna yang sedang login.
	private.GET("/auth/me", authHandler.Me)

	// Manajemen pengguna: hanya owner.
	userRoutes := private.Group("/users")
	userRoutes.Use(auth.RequireRoles("owner"))
	userRoutes.GET("", authHandler.ListUsers)
	userRoutes.POST("", authHandler.CreateUser)
	userRoutes.PUT("/:id/role", authHandler.UpdateRole)

	// 9. Modul dashboard (ringkasan).
	dashboardRepo := dashboard.NewRepository(db)
	dashboardHandler := dashboard.NewHandler(dashboardRepo)
	dashboard.RegisterRoutes(private.Group("/dashboard"), dashboardHandler)

	// 10. Modul produk.
	productsRepo := products.NewRepository(db)
	productsHandler := products.NewHandler(productsRepo)
	products.RegisterRoutes(private.Group("/products"), productsHandler)

	// 10. Modul stok.
	stockRepo := stock.NewRepository(db)
	stockHandler := stock.NewHandler(stockRepo)
	stock.RegisterRoutes(private.Group("/stock"), stockHandler)

	// 11. Modul penjualan.
	salesRepo := sales.NewRepository(db)
	salesHandler := sales.NewHandler(salesRepo)
	sales.RegisterRoutes(private.Group("/sales"), salesHandler)

	// 12. Modul servis.
	servicesRepo := services.NewRepository(db)
	servicesHandler := services.NewHandler(servicesRepo)
	services.RegisterRoutes(private.Group("/services"), servicesHandler)

	// 13. Modul pembelian.
	purchasesRepo := purchases.NewRepository(db)
	purchasesHandler := purchases.NewHandler(purchasesRepo)

	purchaseRoutes := private.Group("/purchases")
	purchaseRoutes.Use(auth.RequireRoles("owner", "admin"))

	purchases.RegisterRoutes(purchaseRoutes, purchasesHandler)

	// 14. Menjalankan server dengan timeout dan graceful shutdown.
	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownSignal, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	go func() {
		log.Println("Server berjalan pada port:", cfg.AppPort)

		if err := server.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Gagal menjalankan server: %v", err)
		}
	}()

	<-shutdownSignal.Done()
	log.Println("Sinyal berhenti diterima, menghentikan server...")

	shutdownCtx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Println("Server gagal berhenti dengan rapi:", err)
	}

	log.Println("Server berhenti")
}
