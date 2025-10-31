using MapaWeb.Models;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

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

            modelBuilder.Entity<Marcador>()
                .Property(m => m.Ubicacion)
                .HasColumnType("geography");
        }
    }
}