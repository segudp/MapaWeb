using MapaWeb.Models;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace MapaWeb.Data
{
    public class AppDbContext: DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
        {
        }

        // Esto crea la tabla "Marcadores" en la BBDD
        public DbSet<Marcador> Marcadores { get; set; }
    }
}
