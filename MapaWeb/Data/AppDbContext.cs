using MapaWeb.Models;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace MapaWeb.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Marcador> Marcadores { get; set; }
        public DbSet<Poligono> Poligonos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración para Marcadores
            modelBuilder.Entity<Marcador>()
                .Property(m => m.Ubicacion)
                .HasColumnType("geography");

            // ✅ Configuración para Polígonos
            modelBuilder.Entity<Poligono>()
                .Property(p => p.Geometria)
                .HasColumnType("geometry"); // Usa "geometry" para polígonos
        }
    }
}